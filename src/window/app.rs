use std::sync::Arc;

#[cfg(target_os = "linux")]
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tao::event::Event;
use tao::event_loop::{ControlFlow, EventLoop, EventLoopBuilder, EventLoopProxy};
use tao::window::{Fullscreen, Icon, Window, WindowBuilder};
use wry::{PageLoadEvent, WebView, WebViewBuilder};
#[cfg(target_os = "android")]
use wry::WebViewBuilderExtAndroid;

use crate::di::AppModule;
use crate::error::AppError;
#[cfg(not(target_os = "android"))]
use crate::services::{MpvCommand, MpvService};
use super::types::UserEvent;

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
struct SystemTrayContext {
    _tray: tray_icon::TrayIcon,
    restore_id: tray_icon::menu::MenuId,
    exit_id: tray_icon::menu::MenuId,
}

#[cfg(not(target_os = "android"))]
struct BackgroundWebViewContext {
    _window: Window,
    webview: WebView,
}

pub struct DesktopApp {
    container: Arc<AppModule>,
    tokio_runtime: tokio::runtime::Handle,
}

impl DesktopApp {
    pub fn new(container: AppModule, tokio_runtime: tokio::runtime::Handle) -> Self {
        Self {
            container: Arc::new(container),
            tokio_runtime,
        }
    }

    pub fn run(self) -> Result<(), AppError> {
        let event_loop = Self::create_event_loop();
        let proxy = event_loop.create_proxy();
        let window = self.create_main_window(&event_loop)?;

        #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
        let tray_context = match self.create_system_tray(&proxy) {
            Ok(t) => Some(t),
            Err(e) => {
                println!("[SystemTray] Warning: System tray creation failed: {e}");
                None
            }
        };

        #[cfg(not(target_os = "android"))]
        let wid = Self::platform_window_id(&window);

        #[cfg(not(target_os = "android"))]
        let mpv_service = self.attach_mpv_window(wid)?;

        #[cfg(not(target_os = "android"))]
        self.start_deep_link_listener(proxy.clone());

        #[cfg(not(target_os = "android"))]
        let headless = self.configure_headless_service(proxy.clone());

        #[cfg(not(target_os = "android"))]
        let bg_context = self.create_background_webview(&event_loop, &proxy, headless)?;

        #[cfg(not(target_os = "android"))]
        self.spawn_playback_forwarder(mpv_service.clone(), proxy.clone());

        let webview = self.create_main_webview(&window, proxy.clone())?;
        #[cfg(not(target_os = "android"))]
        self.evaluate_initial_deep_link(&webview);

        #[cfg(not(target_os = "android"))]
        let container_ref = self.container.clone();

        event_loop.run(move |event, _, control_flow| {
            *control_flow = ControlFlow::Wait;

            match event {
                Event::UserEvent(UserEvent::IpcResult {
                    callback_id,
                    success,
                    data,
                }) => Self::resolve_ipc_result(&webview, &callback_id, success, &data),
                #[cfg(not(target_os = "android"))]
                Event::UserEvent(UserEvent::PlaybackUpdate(state)) => {
                    Self::forward_playback_update(&webview, &state)
                }
                Event::UserEvent(UserEvent::SetFullscreen {
                    callback_id,
                    fullscreen,
                }) => Self::handle_fullscreen_request(&window, &webview, &callback_id, fullscreen),
                #[cfg(not(target_os = "android"))]
                Event::UserEvent(UserEvent::BackgroundNavigate { url }) => {
                    if let Some(ref ctx) = bg_context {
                        let _ = ctx.webview.load_url(&url);
                    } else {
                        println!("[BackgroundWebView] Warning: Background webview not available to navigate to {url}");
                    }
                }
                #[cfg(not(target_os = "android"))]
                Event::UserEvent(UserEvent::BackgroundExecuteScript { script, callback_id }) => {
                    if let Some(ref ctx) = bg_context {
                        Self::execute_background_script(&ctx.webview, &script, &callback_id);
                    } else {
                        println!("[BackgroundWebView] Warning: Background webview not available to execute script");
                        let headless: Arc<dyn crate::services::HeadlessService> =
                            shaku::HasComponent::resolve(&*container_ref);
                        headless.resolve_callback(
                            &callback_id,
                            false,
                            serde_json::Value::String("Background webview not available".to_string()),
                        );
                    }
                }
                #[cfg(not(target_os = "android"))]
                Event::UserEvent(UserEvent::BackgroundIpcResult {
                    callback_id,
                    success,
                    data,
                }) => {
                    let headless: Arc<dyn crate::services::HeadlessService> =
                        shaku::HasComponent::resolve(&*container_ref);
                    headless.resolve_callback(&callback_id, success, data);
                }
                #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
                Event::UserEvent(UserEvent::TrayIconEvent(tray_event)) => {
                    Self::handle_tray_icon_event(&window, tray_event);
                }
                #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
                Event::UserEvent(UserEvent::MenuEvent(menu_event)) => {
                    if let Some(ref tray) = tray_context {
                        if menu_event.id == tray.restore_id {
                            Self::show_and_focus_window(&window);
                        } else if menu_event.id == tray.exit_id {
                            let discord: Arc<dyn crate::services::DiscordPresenceService> =
                                shaku::HasComponent::resolve(&*container_ref);
                            discord.clear();
                            *control_flow = ControlFlow::Exit;
                        }
                    }
                }
                #[cfg(not(target_os = "android"))]
                Event::UserEvent(UserEvent::RestoreWindow { url }) => {
                    Self::show_and_focus_window(&window);
                    Self::dispatch_deep_link(&webview, &url);
                }
                Event::WindowEvent {
                    event: tao::event::WindowEvent::Resized(_),
                    ..
                } => {
                    // MPV subclassing handles parent window resizing internally.
                    // Avoid calling AttachWindow here to prevent swapchain recreation stutter.
                }
                Event::WindowEvent {
                    event: tao::event::WindowEvent::CloseRequested,
                    ..
                } => {
                    // Hide the window instead of exiting the process
                    window.set_visible(false);
                }
                _ => {}
            }
        });

        #[allow(unreachable_code)]
        Ok(())
    }

    fn create_event_loop() -> EventLoop<UserEvent> {
        EventLoopBuilder::<UserEvent>::with_user_event().build()
    }

    fn app_icon_bytes() -> &'static [u8] {
        include_bytes!("../../assets/icon.rgba")
    }

    fn load_window_icon() -> Option<Icon> {
        Icon::from_rgba(Self::app_icon_bytes().to_vec(), 256, 256).ok()
    }

    fn create_main_window(&self, event_loop: &EventLoop<UserEvent>) -> Result<Window, AppError> {
        WindowBuilder::new()
            .with_title("AnimeSphere Client")
            .with_window_icon(Self::load_window_icon())
            .build(event_loop)
            .map_err(|e| AppError::WindowCreation(e.to_string()))
    }

    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    fn create_system_tray(
        &self,
        proxy: &EventLoopProxy<UserEvent>,
    ) -> Result<SystemTrayContext, AppError> {
        use tray_icon::menu::{Menu, MenuEvent, MenuItem};
        use tray_icon::{TrayIconBuilder, TrayIconEvent};

        let tray_menu = Menu::new();
        let restore_item = MenuItem::new("Показать окно", true, None);
        let exit_item = MenuItem::new("Выйти", true, None);
        let _ = tray_menu.append(&restore_item);
        let _ = tray_menu.append(&exit_item);

        let restore_id = restore_item.id().clone();
        let exit_id = exit_item.id().clone();

        let tray_icon = tray_icon::Icon::from_rgba(Self::app_icon_bytes().to_vec(), 256, 256)
            .map_err(|e| AppError::WindowCreation(format!("Tray icon load failed: {}", e)))?;

        let proxy_tray = proxy.clone();
        TrayIconEvent::set_event_handler(Some(move |event| {
            let _ = proxy_tray.send_event(UserEvent::TrayIconEvent(event));
        }));

        let proxy_menu = proxy.clone();
        MenuEvent::set_event_handler(Some(move |event| {
            let _ = proxy_menu.send_event(UserEvent::MenuEvent(event));
        }));

        let tray = TrayIconBuilder::new()
            .with_menu(Box::new(tray_menu))
            .with_icon(tray_icon)
            .with_tooltip("AnimeSphere")
            .build()
            .map_err(|e| AppError::WindowCreation(e.to_string()))?;

        Ok(SystemTrayContext {
            _tray: tray,
            restore_id,
            exit_id,
        })
    }

    #[cfg(target_os = "windows")]
    fn platform_window_id(window: &Window) -> i64 {
        use tao::platform::windows::WindowExtWindows;
        window.hwnd() as i64
    }

    #[cfg(target_os = "linux")]
    fn platform_window_id(window: &Window) -> i64 {
        match window.window_handle().map(|handle| handle.as_raw()) {
            Ok(RawWindowHandle::Xlib(handle)) => handle.window as i64,
            // mpv embedding expects an X11/XID window id. Wayland has no compatible wid.
            _ => 0,
        }
    }

    #[cfg(target_os = "macos")]
    fn platform_window_id(window: &Window) -> i64 {
        use tao::platform::macos::WindowExtMacOS;
        window.ns_view() as i64
    }

    #[cfg(not(target_os = "android"))]
    fn attach_mpv_window(&self, wid: i64) -> Result<Arc<dyn MpvService>, AppError> {
        let mpv_service: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*self.container);
        mpv_service.send_command(MpvCommand::AttachWindow(wid))?;
        Ok(mpv_service)
    }

    #[cfg(not(target_os = "android"))]
    fn start_deep_link_listener(&self, proxy: EventLoopProxy<UserEvent>) {
        self.tokio_runtime.spawn(async move {
            use tokio::io::AsyncReadExt;
            use tokio::net::TcpListener;

            if let Ok(listener) = TcpListener::bind("127.0.0.1:50052").await {
                while let Ok((mut stream, _)) = listener.accept().await {
                    let mut buffer = [0; 1024];
                    if let Ok(size) = stream.read(&mut buffer).await {
                        if size > 0 {
                            if let Ok(url_str) = std::str::from_utf8(&buffer[..size]) {
                                let _ = proxy.send_event(UserEvent::RestoreWindow {
                                    url: url_str.to_string(),
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    #[cfg(not(target_os = "android"))]
    fn configure_headless_service(
        &self,
        proxy: EventLoopProxy<UserEvent>,
    ) -> Arc<dyn crate::services::HeadlessService> {
        let headless: Arc<dyn crate::services::HeadlessService> =
            shaku::HasComponent::resolve(&*self.container);
        headless.set_proxy(proxy);
        headless
    }

    #[cfg(not(target_os = "android"))]
    fn create_background_webview(
        &self,
        event_loop: &EventLoop<UserEvent>,
        proxy: &EventLoopProxy<UserEvent>,
        _headless: Arc<dyn crate::services::HeadlessService>,
    ) -> Result<Option<BackgroundWebViewContext>, AppError> {
        let bg_window = match WindowBuilder::new()
            .with_visible(false)
            .build(event_loop)
        {
            Ok(w) => w,
            Err(e) => {
                println!("[BackgroundWebView] Warning: Failed to create background window: {e}");
                return Ok(None);
            }
        };

        let proxy_bg = proxy.clone();
        let bg_webview = match WebViewBuilder::new()
            .with_ipc_handler(move |msg| {
                if let Ok(envelope) =
                    serde_json::from_str::<crate::window::types::IpcEnvelope>(msg.body())
                {
                    let data = serde_json::from_str(&envelope.payload)
                        .unwrap_or_else(|_| serde_json::Value::String(envelope.payload));
                    let _ = proxy_bg.send_event(UserEvent::BackgroundIpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data,
                    });
                }
            })
            .build(&bg_window)
        {
            Ok(wv) => wv,
            Err(e) => {
                println!("[BackgroundWebView] Warning: Failed to create background webview: {e}");
                return Ok(None);
            }
        };

        Ok(Some(BackgroundWebViewContext {
            _window: bg_window,
            webview: bg_webview,
        }))
    }

    #[cfg(not(target_os = "android"))]
    fn spawn_playback_forwarder(
        &self,
        mpv_service: Arc<dyn MpvService>,
        proxy: EventLoopProxy<UserEvent>,
    ) {
        let mut playback_rx = mpv_service.subscribe();
        self.tokio_runtime.spawn(async move {
            while let Ok(event) = playback_rx.recv().await {
                match event {
                    crate::services::PlaybackEvent::StateUpdate(state) => {
                        let _ = proxy.send_event(UserEvent::PlaybackUpdate(state));
                    }
                }
            }
        });
    }

    fn create_main_webview(
        &self,
        window: &Window,
        proxy: EventLoopProxy<UserEvent>,
    ) -> Result<WebView, AppError> {
        #[cfg(not(target_os = "android"))]
        let html_layout = include_str!("../../frontend/dist/index.html");
        let tokio_proto = self.tokio_runtime.clone();
        let ipc_container = self.container.clone();
        let ipc_tokio = self.tokio_runtime.clone();

        let webview_builder = WebViewBuilder::new()
            .with_transparent(true)
            .with_initialization_script(Self::init_script())
            .with_document_title_changed_handler(|title| {
                println!("[WebView] document title changed: {title}");
            })
            .with_on_page_load_handler(|event, url| {
                let phase = match event {
                    PageLoadEvent::Started => "started",
                    PageLoadEvent::Finished => "finished",
                };
                println!("[WebView] page load {phase}: {url}");
            })
            .with_asynchronous_custom_protocol(
                "vostmedia".to_string(),
                move |_webview_id, request, responder| {
                    super::protocol::handle_vostmedia(&tokio_proto, request, responder);
                },
            )
            .with_ipc_handler(move |msg| {
                let body = msg.body().to_string();
                let thread_container = ipc_container.clone();
                let thread_proxy = proxy.clone();

                let tokio_spawn = ipc_tokio.clone();
                tokio_spawn.spawn(async move {
                    super::ipc::handle_ipc(body, thread_container, thread_proxy).await;
                });
            });

        #[cfg(target_os = "android")]
        let webview_builder = webview_builder
            .with_asset_loader("wry".to_string())
            .with_https_scheme(true)
            .with_url("wry://assets/index.html");

        #[cfg(not(target_os = "android"))]
        let webview_builder = webview_builder.with_html(html_layout);

        #[cfg(target_os = "linux")]
        {
            use tao::platform::unix::WindowExtUnix;
            use wry::WebViewBuilderExtUnix;
            let vbox = window.default_vbox().map_err(|e| {
                AppError::WebviewCreation(format!("Failed to get default vertical box from window: {e}"))
            })?;
            webview_builder
                .build_gtk(vbox)
                .map_err(|e| AppError::WebviewCreation(e.to_string()))
        }
        #[cfg(not(target_os = "linux"))]
        {
            webview_builder
                .build(window)
                .map_err(|e| AppError::WebviewCreation(e.to_string()))
        }
    }

    #[cfg(not(target_os = "android"))]
    fn evaluate_initial_deep_link(&self, webview: &WebView) {
        let args: Vec<String> = std::env::args().collect();
        if let Some(url) = args.iter().find(|arg| arg.starts_with("animesphere://")) {
            Self::dispatch_deep_link(webview, url);
        }
    }

    fn resolve_ipc_result(
        webview: &WebView,
        callback_id: &str,
        success: bool,
        data: &serde_json::Value,
    ) {
        let js_eval = format!("window.resolveIpc('{}', {}, {});", callback_id, success, data);
        let _ = webview.evaluate_script(&js_eval);
    }

    #[cfg(not(target_os = "android"))]
    fn forward_playback_update(webview: &WebView, state: &crate::services::PlaybackState) {
        if let Ok(state_json) = serde_json::to_string(state) {
            let js_eval = format!(
                "if (window.onPlaybackUpdate) {{ window.onPlaybackUpdate({}); }}",
                state_json
            );
            let _ = webview.evaluate_script(&js_eval);
        }
    }

    fn handle_fullscreen_request(
        window: &Window,
        webview: &WebView,
        callback_id: &str,
        fullscreen: bool,
    ) {
        let fullscreen_opt = if fullscreen {
            Some(Fullscreen::Borderless(None))
        } else {
            None
        };
        window.set_fullscreen(fullscreen_opt);
        let js_eval = format!(
            "window.resolveIpc('{}', true, {});",
            callback_id, fullscreen
        );
        let _ = webview.evaluate_script(&js_eval);
    }

    #[cfg(not(target_os = "android"))]
    fn execute_background_script(webview: &WebView, script: &str, callback_id: &str) {
        let wrapped_script = format!(
            r#"
            (async () => {{
                try {{
                    const result = await (async () => {{ {} }})();
                    window.ipc.postMessage(JSON.stringify({{
                        callback_id: '{}',
                        action: 'result',
                        payload: JSON.stringify(result)
                    }}));
                }} catch (e) {{
                    window.ipc.postMessage(JSON.stringify({{
                        callback_id: '{}',
                        action: 'error',
                        payload: JSON.stringify(e.toString())
                    }}));
                }}
            }})();
            "#,
            script, callback_id, callback_id
        );
        let _ = webview.evaluate_script(&wrapped_script);
    }

    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    fn handle_tray_icon_event(window: &Window, tray_event: tray_icon::TrayIconEvent) {
        if let tray_icon::TrayIconEvent::Click {
            button: tray_icon::MouseButton::Left,
            ..
        } = tray_event
        {
            Self::show_and_focus_window(window);
        }
    }

    #[cfg(not(target_os = "android"))]
    fn show_and_focus_window(window: &Window) {
        window.set_visible(true);
        window.set_minimized(false);
        window.set_focus();
    }

    #[cfg(not(target_os = "android"))]
    fn dispatch_deep_link(webview: &WebView, url: &str) {
        let js_eval = format!(
            r#"
            (function() {{
                const url = '{}';
                function tryLink() {{
                    if (window.handleDeepLink) {{
                        window.handleDeepLink(url);
                    }} else {{
                        setTimeout(tryLink, 100);
                    }}
                }}
                tryLink();
            }})();
            "#,
            url
        );
        let _ = webview.evaluate_script(&js_eval);
    }

    #[cfg(target_os = "android")]
    fn init_script() -> &'static str {
        r#"
            (() => {
                window.__ANDROID__ = true;
                
                const logToRust = (level, args) => {
                    try {
                        const msg = args.map(arg => {
                            if (typeof arg === "object") {
                                try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                            }
                            return String(arg);
                        }).join(" ");
                        if (window.ipc && window.ipc.postMessage) {
                            window.ipc.postMessage(JSON.stringify({
                                callback_id: "log",
                                action: "log",
                                payload: `[${level}] ${msg}`
                            }));
                        }
                    } catch(e) {}
                };
                
                const originalLog = console.log;
                const originalInfo = console.info;
                const originalWarn = console.warn;
                const originalError = console.error;
                
                console.log = (...args) => {
                    originalLog.apply(console, args);
                    logToRust("LOG", args);
                };
                console.info = (...args) => {
                    originalInfo.apply(console, args);
                    logToRust("INFO", args);
                };
                console.warn = (...args) => {
                    originalWarn.apply(console, args);
                    logToRust("WARN", args);
                };
                console.error = (...args) => {
                    originalError.apply(console, args);
                    logToRust("ERROR", args);
                };

                console.info("[AnimeSphere] init script injected (Android)");
                console.info("[AnimeSphere] window.ipc available:", !!window.ipc);

                window.addEventListener("error", (event) => {
                    const msg = `window.error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
                    logToRust("FATAL", [msg]);
                });
                window.addEventListener("unhandledrejection", (event) => {
                    const reason = event.reason && event.reason.stack ? event.reason.stack : String(event.reason);
                    const msg = `unhandledrejection: ${reason}`;
                    logToRust("FATAL", [msg]);
                });
                document.addEventListener("DOMContentLoaded", () => {
                    console.info("[AnimeSphere] DOMContentLoaded");
                });
                window.setTimeout(() => {
                    const app = document.getElementById("app");
                    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
                    const bodyBg = getComputedStyle(document.body).backgroundColor;
                    console.info("[AnimeSphere] inspect htmlBg:", htmlBg);
                    console.info("[AnimeSphere] inspect bodyBg:", bodyBg);
                    console.info("[AnimeSphere] inspect body class:", document.body.className);
                    console.info("[AnimeSphere] inspect app child count:", app ? app.childElementCount : -1);
                    console.info("[AnimeSphere] inspect app text length:", app ? (app.textContent || "").trim().length : -1);
                    console.info("[AnimeSphere] inspect app html length:", app ? app.innerHTML.length : -1);
                }, 1500);
            })();
        "#
    }

    #[cfg(not(target_os = "android"))]
    fn init_script() -> &'static str {
        r#"
            (() => {
                window.__ANDROID__ = false;
                
                const logToRust = (level, args) => {
                    try {
                        const msg = args.map(arg => {
                            if (typeof arg === "object") {
                                try { return JSON.stringify(arg); } catch(e) { return String(arg); }
                            }
                            return String(arg);
                        }).join(" ");
                        if (window.ipc && window.ipc.postMessage) {
                            window.ipc.postMessage(JSON.stringify({
                                callback_id: "log",
                                action: "log",
                                payload: `[${level}] ${msg}`
                            }));
                        }
                    } catch(e) {}
                };
                
                const originalLog = console.log;
                const originalInfo = console.info;
                const originalWarn = console.warn;
                const originalError = console.error;
                
                console.log = (...args) => {
                    originalLog.apply(console, args);
                    logToRust("LOG", args);
                };
                console.info = (...args) => {
                    originalInfo.apply(console, args);
                    logToRust("INFO", args);
                };
                console.warn = (...args) => {
                    originalWarn.apply(console, args);
                    logToRust("WARN", args);
                };
                console.error = (...args) => {
                    originalError.apply(console, args);
                    logToRust("ERROR", args);
                };

                console.info("[AnimeSphere] init script injected (Desktop)");
                console.info("[AnimeSphere] window.ipc available:", !!window.ipc);

                window.addEventListener("error", (event) => {
                    const msg = `window.error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
                    logToRust("FATAL", [msg]);
                });
                window.addEventListener("unhandledrejection", (event) => {
                    const reason = event.reason && event.reason.stack ? event.reason.stack : String(event.reason);
                    const msg = `unhandledrejection: ${reason}`;
                    logToRust("FATAL", [msg]);
                });
                document.addEventListener("DOMContentLoaded", () => {
                    console.info("[AnimeSphere] DOMContentLoaded");
                });
                window.setTimeout(() => {
                    const app = document.getElementById("app");
                    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
                    const bodyBg = getComputedStyle(document.body).backgroundColor;
                    console.info("[AnimeSphere] inspect htmlBg:", htmlBg);
                    console.info("[AnimeSphere] inspect bodyBg:", bodyBg);
                    console.info("[AnimeSphere] inspect body class:", document.body.className);
                    console.info("[AnimeSphere] inspect app child count:", app ? app.childElementCount : -1);
                    console.info("[AnimeSphere] inspect app text length:", app ? (app.textContent || "").trim().length : -1);
                    console.info("[AnimeSphere] inspect app html length:", app ? app.innerHTML.length : -1);
                }, 1500);
            })();
        "#
    }
}
