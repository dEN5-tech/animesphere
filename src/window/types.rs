use serde::Deserialize;

pub enum UserEvent {
    IpcResult {
        callback_id: String,
        success: bool,
        data: serde_json::Value,
    },
    #[cfg(not(target_os = "android"))]
    PlaybackUpdate(crate::services::PlaybackState),
    SetFullscreen {
        callback_id: String,
        fullscreen: bool,
    },
    // Background WebView Events
    #[cfg(not(target_os = "android"))]
    BackgroundNavigate {
        url: String,
    },
    #[cfg(not(target_os = "android"))]
    BackgroundExecuteScript {
        script: String,
        callback_id: String,
    },
    #[cfg(not(target_os = "android"))]
    BackgroundIpcResult {
        callback_id: String,
        success: bool,
        data: serde_json::Value,
    },
    #[cfg(not(target_os = "android"))]
    RestoreWindow {
        url: String,
    },
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    TrayIconEvent(tray_icon::TrayIconEvent),
    #[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
    MenuEvent(tray_icon::menu::MenuEvent),
}

#[derive(Deserialize)]
pub struct IpcEnvelope {
    pub callback_id: String,
    pub action: String,
    pub payload: String,
}
