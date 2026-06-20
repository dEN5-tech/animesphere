use std::sync::Arc;
use shaku::Component;
use tokio::sync::oneshot;
use dashmap::DashMap;
use crate::error::AppError;
use super::HeadlessService;
use crate::window::UserEvent;

#[allow(dead_code)]
pub struct HeadlessChannels {
    proxy: Arc<parking_lot::RwLock<Option<tao::event_loop::EventLoopProxy<UserEvent>>>>,
    callbacks: Arc<DashMap<String, oneshot::Sender<Result<serde_json::Value, AppError>>>>,
}

impl Default for HeadlessChannels {
    fn default() -> Self {
        Self {
            proxy: Arc::new(parking_lot::RwLock::new(None)),
            callbacks: Arc::new(DashMap::new()),
        }
    }
}

#[derive(Component)]
#[shaku(interface = HeadlessService)]
pub struct HeadlessServiceImpl {
    #[shaku(default)]
    channels: HeadlessChannels,
}

#[async_trait::async_trait]
impl HeadlessService for HeadlessServiceImpl {
    fn set_proxy(&self, proxy: tao::event_loop::EventLoopProxy<UserEvent>) {
        *self.channels.proxy.write() = Some(proxy);
    }

    async fn navigate(&self, url: &str) -> Result<(), AppError> {
        #[cfg(target_os = "android")]
        {
            let _ = url;
            Err(AppError::Mpv("Headless service is not supported on Android".to_string()))
        }
        #[cfg(not(target_os = "android"))]
        {
            let proxy = self.channels.proxy.read().clone().ok_or_else(|| AppError::Mpv("Headless proxy not initialized".to_string()))?;
            proxy.send_event(UserEvent::BackgroundNavigate { url: url.to_string() })
                .map_err(|e| AppError::Mpv(format!("Failed to send background navigate event: {}", e)))?;
            Ok(())
        }
    }

    async fn eval(&self, script: &str) -> Result<serde_json::Value, AppError> {
        #[cfg(target_os = "android")]
        {
            let _ = script;
            Err(AppError::Mpv("Headless service is not supported on Android".to_string()))
        }
        #[cfg(not(target_os = "android"))]
        {
            let proxy = self.channels.proxy.read().clone().ok_or_else(|| AppError::Mpv("Headless proxy not initialized".to_string()))?;
            let callback_id = uuid::Uuid::new_v4().to_string();
            let (tx, rx) = oneshot::channel();
            
            self.channels.callbacks.insert(callback_id.clone(), tx);
            
            proxy.send_event(UserEvent::BackgroundExecuteScript {
                script: script.to_string(),
                callback_id,
            }).map_err(|e| AppError::Mpv(format!("Failed to send background eval event: {}", e)))?;
            
            rx.await.map_err(|_| AppError::Mpv("Headless eval dropped".to_string()))?
        }
    }

    fn resolve_callback(&self, callback_id: &str, success: bool, data: serde_json::Value) {
        if let Some((_, tx)) = self.channels.callbacks.remove(callback_id) {
            if success {
                let _ = tx.send(Ok(data));
            } else {
                let _ = tx.send(Err(AppError::Mpv(data.as_str().unwrap_or("Unknown headless error").to_string())));
            }
        }
    }
}
