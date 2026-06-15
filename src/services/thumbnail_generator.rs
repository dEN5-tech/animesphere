use std::sync::Arc;
use shaku::Component;
use parking_lot::Mutex;
use libmpv2::Mpv;
use crate::error::AppError;
use super::ThumbnailService;

pub struct ThumbnailPlayer {
    mpv: Arc<Mutex<Option<Mpv>>>,
}

impl Default for ThumbnailPlayer {
    fn default() -> Self {
        let mpv = Mpv::with_initializer(|init| {
            init.set_option("idle", "yes")?;
            init.set_option("vo", "image")?;
            init.set_option("ao", "null")?;
            init.set_option("osc", "no")?;
            init.set_option("ytdl", "no")?;
            init.set_option("pause", true)?;
            init.set_option("input-default-bindings", "no")?;
            init.set_option("input-vo-keyboard", "no")?;
            init.set_option("hwdec", "auto")?;
            
            let temp_dir = std::env::temp_dir().to_string_lossy().to_string();
            init.set_option("vo-image-outdir", temp_dir.as_str())?;
            init.set_option("vo-image-format", "jpeg")?;
            Ok(())
        }).ok();

        Self {
            mpv: Arc::new(Mutex::new(mpv)),
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
        let mpv_lock = self.player.mpv.clone();
        tokio::task::spawn_blocking(move || {
            let mpv = mpv_lock.lock();
            if let Some(mpv) = mpv.as_ref() {
                // Apply current proxy settings
                let config = crate::services::config::load_config();
                if !config.proxy_url.trim().is_empty() {
                    let _ = mpv.set_property("http-proxy", config.proxy_url.as_str());
                } else {
                    let _ = mpv.set_property("http-proxy", "");
                }
                let _ = mpv.command("loadfile", &[&url]);
                // Ensure it is paused
                let _ = mpv.set_property("pause", true);
            }
        }).await.map_err(|e| AppError::Mpv(format!("Blocking task failed: {}", e)))?;
        Ok(())
    }

    async fn get_thumbnail(&self, time: f64) -> Result<String, AppError> {
        let mpv_lock = self.player.mpv.clone();
        let b64 = tokio::task::spawn_blocking(move || {
            let mpv = mpv_lock.lock();
            let Some(mpv) = mpv.as_ref() else {
                return Err(AppError::Mpv("Thumbnail player not initialized".to_string()));
            };

            let temp_filename = format!("animesphere_thumb_{}.jpg", uuid::Uuid::new_v4());
            let temp_file_path = std::env::temp_dir().join(&temp_filename);

            if temp_file_path.exists() {
                let _ = std::fs::remove_file(&temp_file_path);
            }

            let _ = mpv.set_property("time-pos", time);

            // Wait a tiny bit for seeking/decoding
            std::thread::sleep(std::time::Duration::from_millis(50));

            let temp_file_str = temp_file_path.to_string_lossy().to_string();
            let _ = mpv.command("screenshot-to-file", &[&temp_file_str, "video"]);

            let mut success = false;
            for _ in 0..20 {
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
