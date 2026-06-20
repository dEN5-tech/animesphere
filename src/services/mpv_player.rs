use std::thread;
use shaku::Component;
use tokio::sync::mpsc;
use mpv_client::{Client, Event, LogLevel, UninitializedClient}; // Импорты из mpv-client-cross

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
            // Ожидаем команду AttachWindow для получения дескриптора окна (wid)
            let (mp, mut token) = match cmd_rx.blocking_recv() {
                Some(MpvCommand::AttachWindow(wid)) => {
                    match Client::create() {
                        Ok((uninit, token)) => {
                            // Настройка параметров до инициализации контекста
                            let uninit = unsafe {
                                get_handle_and_set_properties(uninit, |handle| {
                                    let _ = handle.set_property("idle", "yes".to_string());
                                    let _ = handle.set_property("vo", "gpu".to_string());
                                    let _ = handle.set_property("hwdec", "auto".to_string());
                                    let _ = handle.set_property("profile", "gpu-hq".to_string());
                                    let _ = handle.set_property("wid", wid); // Передаем HWND/Wid
                                })
                            };

                            match uninit.initialize() {
                                Ok(instance) => {
                                    // Безопасный запрос логов через API библиотеки
                                    let _ = instance.request_log_messages(LogLevel::Info);
                                    (instance, token)
                                }
                                Err(_) => return, // Тихо выходим при ошибке инициализации
                            }
                        }
                        Err(_) => return,
                    }
                }
                _ => return, // Завершаем поток, если канал закрыт
            };

            // Основной цикл управления
            loop {
                // 1. Чтение логов и событий (неблокирующее, timeout = 0.0)
                loop {
                    match mp.wait_event(&mut token, 0.0) {
                        Event::LogMessage(log) => {
                            println!("[MPV LOG] [{}] {}: {}", log.level(), log.prefix(), log.text().trim());
                        }
                        Event::None => break, // Очередь событий пуста
                        _ => {}
                    }
                }

                // 2. Обработка входящих команд из канала
                while let Ok(cmd) = cmd_rx.try_recv() {
                    match cmd {
                        MpvCommand::AttachWindow(new_wid) => {
                            let _ = mp.set_property("wid", new_wid);
                        }
                        MpvCommand::LoadVideo(url) => {
                            let config = crate::services::config::load_config();
                            
                            // Извлечение субтитров из URL
                            let mut play_url = url.clone();
                            let mut subs_to_add = Vec::new();
                            if let Some(pos) = url.find("#subtitles=") {
                                play_url = url[..pos].to_string();
                                let subs_part = &url[pos + 11..];
                                for sub_entry in subs_part.split(';') {
                                    if let Some(pipe_pos) = sub_entry.find('|') {
                                        let sub_name = sub_entry[..pipe_pos].to_string();
                                        let sub_url = sub_entry[pipe_pos + 1..].to_string();
                                        if !sub_name.is_empty() && !sub_url.is_empty() {
                                            subs_to_add.push((sub_name, sub_url));
                                        }
                                    }
                                }
                            }

                            let is_collaps = play_url.contains("collaps") || play_url.contains("interkh.com") || play_url.contains("luxembd.ws");
                            let is_kodik = play_url.contains("kodik") || play_url.contains("evasion") || play_url.contains("egocdn") || play_url.contains("lightning") || play_url.contains("kodikres") || play_url.contains("secvideo");
                            let is_aniboom = play_url.contains("aniboom");
                            let is_sibnet = play_url.contains("sibnet");
                            let is_jutsu = play_url.contains("jut.su");
                            
                            let bypass_proxy = is_collaps
                                || is_kodik
                                || is_aniboom
                                || is_sibnet
                                || is_jutsu
                                || play_url.contains("libria.fun")
                                || play_url.contains("anilibria")
                                || play_url.contains("aniliberty")
                                || play_url.contains("animetop")
                                || play_url.contains("animevost");

                            if bypass_proxy {
                                println!("[MPV] Bypassing proxy for stream URL: {}", play_url);
                                let _ = mp.set_property("http-proxy", "".to_string());
                            } else {
                                if !config.proxy_url.trim().is_empty() {
                                    let _ = mp.set_property("http-proxy", config.proxy_url.clone());
                                } else {
                                    let _ = mp.set_property("http-proxy", "".to_string());
                                }
                            }

                            if is_collaps {
                                println!("[MPV] Setting browser headers for Collaps stream.");
                                let _ = mp.set_property("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36".to_string());
                                let _ = mp.set_property("http-header-fields", "Origin: https://kinokrad.my,Referer: https://kinokrad.my/,sec-fetch-dest: empty,sec-fetch-mode: cors,sec-fetch-site: cross-site,accept: */*".to_string());
                            } else if is_kodik {
                                println!("[MPV] Setting browser headers for Kodik stream.");
                                let _ = mp.set_property("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string());
                                let _ = mp.set_property("http-header-fields", "Origin: https://anilib.me,Referer: https://anilib.me/,sec-fetch-dest: empty,sec-fetch-mode: cors,sec-fetch-site: cross-site,accept: */*".to_string());
                            } else if is_aniboom {
                                println!("[MPV] Setting browser headers for Aniboom stream.");
                                let _ = mp.set_property("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string());
                                let _ = mp.set_property("http-header-fields", "Referer: https://aniboom.com/,sec-fetch-dest: empty,sec-fetch-mode: cors,sec-fetch-site: cross-site,accept: */*".to_string());
                            } else if is_sibnet {
                                println!("[MPV] Setting browser headers for Sibnet stream.");
                                let _ = mp.set_property("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string());
                                let _ = mp.set_property("http-header-fields", "Referer: https://video.sibnet.ru/".to_string());
                            } else if is_jutsu {
                                println!("[MPV] Setting browser headers for Jut.su stream.");
                                let _ = mp.set_property("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0".to_string());
                                let _ = mp.set_property("http-header-fields", "Referer: https://jut.su/".to_string());
                            } else {
                                let _ = mp.set_property("user-agent", "".to_string());
                                let _ = mp.set_property("http-header-fields", "".to_string());
                            }

                            // Вызов команды loadfile
                            let _ = mp.command(["loadfile", &play_url]);

                            // Загрузка внешних субтитров
                            for (name, sub_url) in subs_to_add {
                                println!("[MPV] Adding external subtitle track '{}': {}", name, sub_url);
                                let _ = mp.command(["sub-add", &sub_url, "auto", &name]);
                            }
                        }
                        MpvCommand::Play => {
                            let _ = mp.set_property("pause", false);
                        }
                        MpvCommand::Pause => {
                            let _ = mp.set_property("pause", true);
                        }
                        MpvCommand::Stop => {
                            let _ = mp.command(["stop"]);
                        }
                        MpvCommand::Seek(pos) => {
                            let _ = mp.set_property("time-pos", pos);
                        }
                        MpvCommand::SetVolume(vol) => {
                            let _ = mp.set_property("volume", vol);
                        }
                        MpvCommand::SetAnime4K(mode) => {
                            let chain = build_shader_chain(&mode, "./shaders");
                            if chain.is_empty() {
                                let _ = mp.command(["change-list", "glsl-shaders", "clr", ""]);
                            } else {
                                let _ = mp.command(["change-list", "glsl-shaders", "set", &chain]);
                            }
                        }
                        MpvCommand::ClearShaders => {
                            let _ = mp.command(["change-list", "glsl-shaders", "clr", ""]);
                        }
                        MpvCommand::CycleAudio => {
                            let _ = mp.command(["cycle", "aid"]);
                        }
                        MpvCommand::CycleSubtitles => {
                            let _ = mp.command(["cycle", "sid"]);
                        }
                        MpvCommand::SetQuality(idx) => {
                            let _ = mp.set_property("edition", idx as i64);
                        }
                    }
                }

                // 3. Сбор метрик и состояния воспроизведения
                let time_pos = mp.get_property::<f64>("time-pos").unwrap_or(0.0);
                let duration = mp.get_property::<f64>("duration").unwrap_or(0.0);
                let paused = mp.get_property::<bool>("pause").unwrap_or(true);
                let volume = mp.get_property::<f64>("volume").unwrap_or(0.0);
                let demuxer_cache_duration = mp.get_property::<f64>("demuxer-cache-duration").unwrap_or(0.0);

                let current_edition = mp.get_property::<i64>("edition").unwrap_or(0);
                let editions_count = mp.get_property::<i64>("editions").unwrap_or(0);
                let edition_list = mp.get_property::<String>("edition-list").unwrap_or_default();

                let video_codec = mp.get_property::<String>("video-codec").unwrap_or_else(|_| "unknown".to_string());
                let audio_codec = mp.get_property::<String>("audio-codec").unwrap_or_else(|_| "unknown".to_string());
                let width = mp.get_property::<i64>("width").unwrap_or(0);
                let height = mp.get_property::<i64>("height").unwrap_or(0);
                let fps = mp.get_property::<f64>("estimated-vf-fps").unwrap_or(0.0);
                let hwdec = mp.get_property::<String>("hwdec-current").unwrap_or_else(|_| "no".to_string());
                let video_bitrate = mp.get_property::<f64>("video-bitrate").unwrap_or(0.0);
                let frame_drop_count = mp.get_property::<i64>("decoder-frame-drop-count").unwrap_or(0);

                let state = PlaybackState {
                    time_pos,
                    duration,
                    paused,
                    volume,
                    demuxer_cache_duration,
                    current_edition,
                    editions_count,
                    edition_list,
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

    let sep = ";";
    let p = base_path;

    let clamp        = format!("{}/Anime4K_Clamp_Highlights.glsl", p);
    let restore      = format!("{}/Anime4K_Restore_CNN_{}.glsl", p, q);
    let restore_soft = format!("{}/Anime4K_Restore_CNN_Soft_{}.glsl", p, q);
    let upscale_dn   = format!("{}/Anime4K_Upscale_Denoise_CNN_x2_{}.glsl", p, q);
    let upscale      = format!("{}/Anime4K_Upscale_CNN_x2_{}.glsl", p, q);
    let down2        = format!("{}/Anime4K_AutoDownscalePre_x2.glsl", p);
    let down4        = format!("{}/Anime4K_AutoDownscalePre_x4.glsl", p);

    match mode {
        super::Anime4KMode::ModeA(_) =>
            [clamp.as_str(), restore.as_str(), upscale.as_str(), down2.as_str(), down4.as_str(), upscale.as_str()].join(sep),
        super::Anime4KMode::ModeB(_) =>
            [clamp.as_str(), restore_soft.as_str(), upscale.as_str(), down2.as_str(), down4.as_str(), upscale.as_str()].join(sep),
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
