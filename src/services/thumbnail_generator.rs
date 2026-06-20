use std::sync::Arc;
use shaku::Component;
use parking_lot::Mutex;
use mpv_client::{Client, EventQueueToken, UninitializedClient};

unsafe fn get_handle_and_set_properties<F>(uninit: UninitializedClient, f: F) -> UninitializedClient
where
    F: FnOnce(&mpv_client::Handle),
{
    let raw: *mut mpv_client::mpv_handle = std::mem::transmute(uninit);
    let handle: &mpv_client::Handle = &*(std::ptr::slice_from_raw_parts(raw, 1) as *const mpv_client::Handle);
    f(handle);
    std::mem::transmute(raw)
}

use crate::error::AppError;
use super::ThumbnailService;

pub struct ThumbnailPlayer {
    mpv: Arc<Mutex<Option<(Client, EventQueueToken)>>>,
}

impl ThumbnailPlayer {
    fn initialize_player() -> Option<(Client, EventQueueToken)> {
        let init_attempt = std::panic::catch_unwind(|| {
            let (uninit, token) = Client::create().ok()?;
            let uninit = unsafe {
                get_handle_and_set_properties(uninit, |handle| {
                    let _ = handle.set_property("idle", "yes".to_string());
                    let _ = handle.set_property("vo", "image".to_string());
                    let _ = handle.set_property("ao", "null".to_string());
                    let _ = handle.set_property("osc", "no".to_string());
                    let _ = handle.set_property("ytdl", "no".to_string());
                    let _ = handle.set_property("pause", true);
                    let _ = handle.set_property("input-default-bindings", "no".to_string());
                    let _ = handle.set_property("input-vo-keyboard", "no".to_string());
                    let _ = handle.set_property("hwdec", "auto".to_string());

                    let temp_dir = std::env::temp_dir().to_string_lossy().to_string();
                    let _ = handle.set_property("vo-image-outdir", temp_dir);
                    let _ = handle.set_property("vo-image-format", "jpeg".to_string());
                })
            };

            let instance = uninit.initialize().ok()?;
            Some((instance, token))
        });

        match init_attempt {
            Ok(player) => player,
            Err(_) => {
                eprintln!("[ThumbnailPlayer] mpv initialization panicked; thumbnails disabled for this session");
                None
            }
        }
    }

    fn ensure_initialized(&self) {
        let mut guard = self.mpv.lock();
        if guard.is_none() {
            *guard = Self::initialize_player();
        }
    }
}

impl Default for ThumbnailPlayer {
    fn default() -> Self {
        Self {
            mpv: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(Component)]
#[shaku(interface = ThumbnailService)]
pub struct ThumbnailServiceImpl {
    #[shaku(default)]
    player: ThumbnailPlayer,
}

#[async_trait::async_trait]
impl ThumbnailService for ThumbnailServiceImpl {
    async fn load_video(&self, url: String) -> Result<(), AppError> {
        self.player.ensure_initialized();
        let mpv_lock = self.player.mpv.clone();
        tokio::task::spawn_blocking(move || {
            let mut guard = mpv_lock.lock();
            if let Some((mpv, _token)) = guard.as_mut() {
                // Apply current proxy settings
                let config = crate::services::config::load_config();
                if !config.proxy_url.trim().is_empty() {
                    let _ = mpv.set_property("http-proxy", config.proxy_url.clone());
                } else {
                    let _ = mpv.set_property("http-proxy", "".to_string());
                }
                let _ = mpv.command(["loadfile", &url]);
                // Ensure it is paused
                let _ = mpv.set_property("pause", true);
            }
        }).await.map_err(|e| AppError::Mpv(format!("Blocking task failed: {}", e)))?;
        Ok(())
    }

    async fn get_thumbnail(&self, time: f64) -> Result<String, AppError> {
        self.player.ensure_initialized();
        let mpv_lock = self.player.mpv.clone();
        let b64 = tokio::task::spawn_blocking(move || {
            let mut guard = mpv_lock.lock();
            let Some((mpv, token)) = guard.as_mut() else {
                return Err(AppError::Mpv("Thumbnail player not initialized".to_string()));
            };

            let temp_filename = format!("animesphere_thumb_{}.jpg", uuid::Uuid::new_v4());
            let temp_file_path = std::env::temp_dir().join(&temp_filename);

            if temp_file_path.exists() {
                let _ = std::fs::remove_file(&temp_file_path);
            }

            let _ = mpv.set_property("time-pos", time);

            // Wait a tiny bit for seeking/decoding and yield event loop
            let _ = mpv.wait_event(token, 0.0);
            std::thread::sleep(std::time::Duration::from_millis(50));
            let _ = mpv.wait_event(token, 0.0);

            let temp_file_str = temp_file_path.to_string_lossy().to_string();
            let _ = mpv.command(["screenshot-to-file", &temp_file_str, "video"]);

            let mut success = false;
            for _ in 0..20 {
                let _ = mpv.wait_event(token, 0.0);
                if temp_file_path.exists() {
                    if let Ok(metadata) = temp_file_path.metadata() {
                        if metadata.len() > 0 {
                            success = true;
                            break;
                        }
                    }
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }

            if !success {
                return Err(AppError::Mpv("Failed to capture video thumbnail frame (timed out)".to_string()));
            }

            let bytes = std::fs::read(&temp_file_path)
                .map_err(|e| AppError::Mpv(format!("Failed to read thumbnail file: {}", e)))?;

            let _ = std::fs::remove_file(&temp_file_path);

            use base64::{Engine as _, engine::general_purpose};
            let b64 = general_purpose::STANDARD.encode(&bytes);

            Ok(b64)
        }).await.map_err(|e| AppError::Mpv(format!("Blocking task failed: {}", e)))??;

        Ok(b64)
    }
}
