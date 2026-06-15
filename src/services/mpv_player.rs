use std::thread;
use libmpv2::Mpv;
use shaku::Component;
use tokio::sync::mpsc;

use crate::error::AppError;
use super::{MpvCommand, MpvService, PlaybackEvent, PlaybackState, NerdStats};

#[derive(Clone)]
pub struct MpvPlayerChannels {
    cmd_tx: mpsc::UnboundedSender<MpvCommand>,
    state_tx: tokio::sync::broadcast::Sender<PlaybackEvent>,
}

impl Default for MpvPlayerChannels {
    fn default() -> Self {
        let (cmd_tx, state_tx) = MpvPlayerServiceImpl::create_services();
        Self { cmd_tx, state_tx }
    }
}

#[derive(Component)]
#[shaku(interface = MpvService)]
pub struct MpvPlayerServiceImpl {
    #[shaku(default)]
    channels: MpvPlayerChannels,
}

impl MpvPlayerServiceImpl {
    fn create_services() -> (mpsc::UnboundedSender<MpvCommand>, tokio::sync::broadcast::Sender<PlaybackEvent>) {
        let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<MpvCommand>();
        let (state_tx, _) = tokio::sync::broadcast::channel::<PlaybackEvent>(32);
        let state_tx_clone = state_tx.clone();

        thread::spawn(move || {
            // Wait for the AttachWindow command to get the native window handle (wid)
            let mpv = match cmd_rx.blocking_recv() {
                Some(MpvCommand::AttachWindow(wid)) => {
                    let mpv_builder = Mpv::with_initializer(move |init| {
                        init.set_option("idle", "yes")?;
                        init.set_option("vo", "gpu")?;
                        init.set_option("hwdec", "auto")?;
                        init.set_option("profile", "gpu-hq")?;
                        init.set_option("wid", wid)?; // Pass raw window handle to the initializer
                        Ok(())
                    });

                    match mpv_builder {
                        Ok(instance) => {
                            let min_level = std::ffi::CString::new("info").unwrap();
                            let _ = unsafe {
                                libmpv2_sys::mpv_request_log_messages(instance.ctx.as_ptr(), min_level.as_ptr())
                            };
                            instance
                        },
                        Err(_) => return, // Fail silently inside the isolated thread
                    }
                }
                _ => return, // Terminate if receiver is closed or invalid initial command
            };

            // Process actor channel controls once initialized
            loop {
                // Process events (including logs)
                while let Some(event) = mpv.wait_event(0.0) {
                    match event {
                        Ok(libmpv2::events::Event::LogMessage { prefix, level, text, .. }) => {
                            println!("[MPV LOG] [{}] {}: {}", level, prefix, text.trim());
                        }
                        _ => {}
                    }
                }

                // Process all pending commands
                while let Ok(cmd) = cmd_rx.try_recv() {
                    match cmd {
                        MpvCommand::AttachWindow(new_wid) => {
                            let _ = mpv.set_property("wid", new_wid);
                        }
                        MpvCommand::LoadVideo(url) => {
                            let config = crate::services::config::load_config();
                            if !config.proxy_url.trim().is_empty() {
                                let _ = mpv.set_property("http-proxy", config.proxy_url.as_str());
                            } else {
                                let _ = mpv.set_property("http-proxy", "");
                            }
                            let _ = mpv.command("loadfile", &[&url]);
                        }
                        MpvCommand::Play => {
                            let _ = mpv.set_property("pause", false);
                        }
                        MpvCommand::Pause => {
                            let _ = mpv.set_property("pause", true);
                        }
                        MpvCommand::Stop => {
                            let _ = mpv.command("stop", &[]);
                        }
                        MpvCommand::Seek(pos) => {
                            let _ = mpv.set_property("time-pos", pos);
                        }
                        MpvCommand::SetVolume(vol) => {
                            let _ = mpv.set_property("volume", vol);
                        }
                        MpvCommand::SetAnime4K(mode) => {
                            let chain = build_shader_chain(&mode, "./shaders");
                            if chain.is_empty() {
                                let _ = mpv.command("change-list", &["glsl-shaders", "clr", ""]);
                            } else {
                                let _ = mpv.command("change-list", &["glsl-shaders", "set", &chain]);
                            }
                        }
                        MpvCommand::ClearShaders => {
                            let _ = mpv.command("change-list", &["glsl-shaders", "clr", ""]);
                        }
                    }
                }

                // Query and send state
                let time_pos = mpv.get_property::<f64>("time-pos").unwrap_or(0.0);
                let duration = mpv.get_property::<f64>("duration").unwrap_or(0.0);
                let paused = mpv.get_property::<bool>("pause").unwrap_or(true);
                let volume = mpv.get_property::<f64>("volume").unwrap_or(0.0);
                let demuxer_cache_duration = mpv.get_property::<f64>("demuxer-cache-duration").unwrap_or(0.0);

                // Technical stats for nerds
                let video_codec = mpv.get_property::<String>("video-codec").unwrap_or_else(|_| "unknown".to_string());
                let audio_codec = mpv.get_property::<String>("audio-codec").unwrap_or_else(|_| "unknown".to_string());
                let width = mpv.get_property::<i64>("width").unwrap_or(0);
                let height = mpv.get_property::<i64>("height").unwrap_or(0);
                let fps = mpv.get_property::<f64>("estimated-vf-fps").unwrap_or(0.0);
                let hwdec = mpv.get_property::<String>("hwdec-current").unwrap_or_else(|_| "no".to_string());
                let video_bitrate = mpv.get_property::<f64>("video-bitrate").unwrap_or(0.0);
                let frame_drop_count = mpv.get_property::<i64>("decoder-frame-drop-count").unwrap_or(0);

                let state = PlaybackState {
                    time_pos,
                    duration,
                    paused,
                    volume,
                    demuxer_cache_duration,
                    nerd_stats: Some(NerdStats {
                        video_codec,
                        audio_codec,
                        width,
                        height,
                        fps,
                        hwdec,
                        video_bitrate,
                        frame_drop_count,
                    }),
                };
                let _ = state_tx_clone.send(PlaybackEvent::StateUpdate(state));

                thread::sleep(std::time::Duration::from_millis(100));
            }
        });

        (cmd_tx, state_tx)
    }
}

fn quality_str(q: &super::Anime4KQuality) -> &'static str {
    match q {
        super::Anime4KQuality::S  => "S",
        super::Anime4KQuality::M  => "M",
        super::Anime4KQuality::L  => "L",
        super::Anime4KQuality::VL => "VL",
        super::Anime4KQuality::UL => "UL",
    }
}

fn build_shader_chain(mode: &super::Anime4KMode, base_path: &str) -> String {
    let q = match mode {
        super::Anime4KMode::ModeA(q)
        | super::Anime4KMode::ModeB(q)
        | super::Anime4KMode::ModeC(q) => quality_str(q),
        super::Anime4KMode::Off => return String::new(),
    };

    // Windows uses semicolon as separator in glsl-shaders list
    let sep = ";";
    let p = base_path;

    let clamp        = format!("{}/Anime4K_Clamp_Highlights.glsl", p);
    let restore      = format!("{}/Anime4K_Restore_CNN_{}.glsl", p, q);
    let restore_soft = format!("{}/Anime4K_Restore_Soft_CNN_{}.glsl", p, q);
    let upscale_dn   = format!("{}/Anime4K_Upscale_Denoise_CNN_x2_{}.glsl", p, q);
    let upscale      = format!("{}/Anime4K_Upscale_CNN_x2_{}.glsl", p, q);
    let down2        = format!("{}/Anime4K_AutoDownscalePre_x2.glsl", p);
    let down4        = format!("{}/Anime4K_AutoDownscalePre_x4.glsl", p);

    match mode {
        // Mode A: Restore → Upscale (лучше для чистых BD-рипов)
        super::Anime4KMode::ModeA(_) =>
            [clamp.as_str(), restore.as_str(), upscale.as_str(), down2.as_str(), down4.as_str(), upscale.as_str()].join(sep),
        // Mode B: Restore_Soft → Upscale (для aliasing / размытых контуров)
        super::Anime4KMode::ModeB(_) =>
            [clamp.as_str(), restore_soft.as_str(), upscale.as_str(), down2.as_str(), down4.as_str(), upscale.as_str()].join(sep),
        // Mode C: Upscale+Denoise only (для уже качественного видео)
        super::Anime4KMode::ModeC(_) =>
            [clamp.as_str(), upscale_dn.as_str(), down2.as_str(), down4.as_str(), upscale.as_str()].join(sep),
        super::Anime4KMode::Off => String::new(),
    }
}

impl Default for MpvPlayerServiceImpl {
    fn default() -> Self {
        Self {
            channels: MpvPlayerChannels::default(),
        }
    }
}

impl MpvService for MpvPlayerServiceImpl {
    fn send_command(&self, cmd: MpvCommand) -> Result<(), AppError> {
        self.channels.cmd_tx
            .send(cmd)
            .map_err(|e| AppError::Mpv(e.to_string()))
    }

    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<PlaybackEvent> {
        self.channels.state_tx.subscribe()
    }
}
