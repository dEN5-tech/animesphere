use serde::Deserialize;

pub enum UserEvent {
    IpcResult {
        callback_id: String,
        success: bool,
        data: serde_json::Value,
    },
    PlaybackUpdate(crate::services::PlaybackState),
    SetFullscreen {
        callback_id: String,
        fullscreen: bool,
    },
    // Background WebView Events
    BackgroundNavigate {
        url: String,
    },
    BackgroundExecuteScript {
        script: String,
        callback_id: String,
    },
    BackgroundIpcResult {
        callback_id: String,
        success: bool,
        data: serde_json::Value,
    },
}

#[derive(Deserialize)]
pub struct IpcEnvelope {
    pub callback_id: String,
    pub action: String,
    pub payload: String,
}
