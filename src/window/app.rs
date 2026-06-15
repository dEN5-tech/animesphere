use std::sync::Arc;
#[cfg(target_os = "linux")]
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use tao::event_loop::{EventLoopBuilder, ControlFlow};
use tao::window::{WindowBuilder, Icon};
use wry::WebViewBuilder;

use crate::di::AppModule;
use crate::error::AppError;
use crate::services::{MpvService, MpvCommand};
use super::types::UserEvent;

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
        let event_loop = EventLoopBuilder::<UserEvent>::with_user_event().build();
        let proxy = event_loop.create_proxy();

        // Load the embedded raw 8-bit RGBA icon bytes (256x256 size)
        let icon_bytes = include_bytes!("../../assets/icon.rgba");
        let icon = Icon::from_rgba(icon_bytes.to_vec(), 256, 256).ok();

        let window = WindowBuilder::new()
            .with_title("AnimeSphere Client")
            .with_window_icon(icon)
            .build(&event_loop)
            .map_err(|e| AppError::WindowCreation(e.to_string()))?;

        // Extract raw platform reference key to anchor native video frame
        #[cfg(target_os = "windows")]
        let wid = {
            use tao::platform::windows::WindowExtWindows;
            window.hwnd() as i64
        };

        #[cfg(target_os = "linux")]
        let wid = {
            match window.window_handle().map(|handle| handle.as_raw()) {
                Ok(RawWindowHandle::Xlib(handle)) => handle.window as i64,
                // mpv embedding expects an X11/XID window id. Wayland has no compatible wid.
                _ => 0,
            }
        };

        #[cfg(target_os = "macos")]
        let wid = {
            use tao::platform::macos::WindowExtMacOS;
            window.ns_view() as i64
        };

        // Link the player window
        let mpv_service: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*self.container);
        mpv_service.send_command(MpvCommand::AttachWindow(wid))?;

        let mut playback_rx = mpv_service.subscribe();
        let proxy_clone = proxy.clone();
        self.tokio_runtime.spawn(async move {
            while let Ok(event) = playback_rx.recv().await {
                match event {
                    crate::services::PlaybackEvent::StateUpdate(state) => {
                        let _ = proxy_clone.send_event(UserEvent::PlaybackUpdate(state));
                    }
                }
            }
        });

        let container_ref = self.container.clone();
        let tokio_ref = self.tokio_runtime.clone();

        let html_layout = include_str!("../../frontend/dist/index.html");

        let tokio_proto = tokio_ref.clone();

        let webview = WebViewBuilder::new()
            .with_transparent(true)
            .with_html(html_layout)
            .with_asynchronous_custom_protocol("vostmedia".to_string(), move |_webview_id, request, responder| {
                super::protocol::handle_vostmedia(&tokio_proto, request, responder);
            })
            .with_ipc_handler(move |msg| {
                let body = msg.body().to_string();
                let thread_container = container_ref.clone();
                let thread_proxy = proxy.clone();
                let tokio_spawn = tokio_ref.clone();

                tokio_spawn.spawn(async move {
                    super::ipc::handle_ipc(body, thread_container, thread_proxy).await;
                });
            })
            .build(&window)
            .map_err(|e| AppError::WebviewCreation(e.to_string()))?;

        event_loop.run(move |event, _, control_flow| {
            *control_flow = ControlFlow::Wait;

            match event {
                // Return thread-safe results safely on OS graphics main thread loop
                tao::event::Event::UserEvent(UserEvent::IpcResult { callback_id, success, data }) => {
                    let js_eval = format!("window.resolveIpc('{}', {}, {});", callback_id, success, data);
                    let _ = webview.evaluate_script(&js_eval);
                }
                tao::event::Event::UserEvent(UserEvent::PlaybackUpdate(state)) => {
                    if let Ok(state_json) = serde_json::to_string(&state) {
                        let js_eval = format!("if (window.onPlaybackUpdate) {{ window.onPlaybackUpdate({}); }}", state_json);
                        let _ = webview.evaluate_script(&js_eval);
                    }
                }
                tao::event::Event::UserEvent(UserEvent::SetFullscreen { callback_id, fullscreen }) => {
                    let fullscreen_opt = if fullscreen {
                        Some(tao::window::Fullscreen::Borderless(None))
                    } else {
                        None
                    };
                    window.set_fullscreen(fullscreen_opt);
                    let js_eval = format!("window.resolveIpc('{}', true, {});", callback_id, fullscreen);
                    let _ = webview.evaluate_script(&js_eval);
                }
                tao::event::Event::WindowEvent {
                    event: tao::event::WindowEvent::CloseRequested,
                    ..
                } => {
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*self.container);
                    discord.clear();
                    *control_flow = ControlFlow::Exit;
                }
                _ => {}
            }
        });
        #[allow(unreachable_code)]
        Ok(())
    }
}
