use std::sync::Arc;
use serde_json::json;
use crate::di::AppModule;
use crate::services::AnimeService;
#[cfg(not(target_os = "android"))]
use crate::services::{MpvService, MpvCommand, Anime4KMode, Anime4KQuality};
use crate::error::AppError;
use super::types::{IpcEnvelope, UserEvent};

/// Unified cross-platform IPC handler
pub async fn handle_ipc(
    body: String,
    container: Arc<AppModule>,
    proxy: tao::event_loop::EventLoopProxy<UserEvent>,
) {
    if let Ok(envelope) = serde_json::from_str::<IpcEnvelope>(&body) {
        match envelope.action.as_str() {
            "fetch_catalog" => {
                let service: Arc<dyn AnimeService> = shaku::HasComponent::resolve(&*container);
                match service.get_list().await {
                    Ok(list) => {
                        let proto_list = crate::services::grpc_anime::proto::AnimeListResponse {
                            animes: list,
                        };
                        use prost::Message;
                        let mut buf = Vec::new();
                        match proto_list.encode(&mut buf) {
                            Ok(_) => {
                                let latin1_str: String = buf.iter().map(|&b| b as char).collect();
                                let _ = proxy.send_event(UserEvent::IpcResult {
                                    callback_id: envelope.callback_id,
                                    success: true,
                                    data: json!(latin1_str),
                                });
                            }
                            Err(e) => {
                                let _ = proxy.send_event(UserEvent::IpcResult {
                                    callback_id: envelope.callback_id,
                                    success: false,
                                    data: json!(format!("Protobuf serialization failed: {}", e)),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        let _ = proxy.send_event(UserEvent::IpcResult {
                            callback_id: envelope.callback_id,
                            success: false,
                            data: json!(e.to_string()),
                        });
                    }
                }
            }
            "play_stream" => {
                let id_res = envelope.payload.parse::<i32>();
                if let Ok(id) = id_res {
                    println!("[Rust IPC] play_stream action received for id: {}", id);
                    let service: Arc<dyn AnimeService> = shaku::HasComponent::resolve(&*container);
                    
                    #[cfg(not(target_os = "android"))]
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    #[cfg(not(target_os = "android"))]
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);

                    match service.get_stream(id).await {
                        Ok(stream) => {
                            println!("[Rust IPC] get_stream succeeded. Title: {}, URL: {}", stream.title, stream.stream_url);
                            let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);
                            let config = crate::services::config::load_config();
                            let final_url = match provider_manager.resolve_stream_url(&stream.stream_url, &config.proxy_url).await {
                                Ok(url) => {
                                    println!("[Rust IPC] Resolved stream URL: {}", url);
                                    url
                                }
                                Err(e) => {
                                    println!("[Rust IPC] Failed to resolve stream URL: {}", e);
                                    stream.stream_url.clone()
                                }
                            };

                            #[cfg(not(target_os = "android"))]
                            {
                                let _ = mpv.send_command(MpvCommand::LoadVideo(final_url.clone()));
                                let _ = mpv.send_command(MpvCommand::Play);
                                discord.update_now_playing(stream.title.clone(), Some(stream.cover_image.clone()));

                                let thumbnail_service: Arc<dyn crate::services::ThumbnailService> = shaku::HasComponent::resolve(&*container);
                                let final_url_clone = final_url.clone();
                                tokio::spawn(async move {
                                    let _ = thumbnail_service.load_video(final_url_clone).await;
                                });
                            }

                            #[cfg(target_os = "android")]
                            {
                                println!("[Rust IPC] Attempting to open in external MPV-Android via JNI: {}", final_url);
                                if let Err(e) = open_in_mpv(&final_url) {
                                    println!("[Rust IPC] [Android] Failed to open in MPV: {:?}", e);
                                } else {
                                    println!("[Rust IPC] [Android] open_in_mpv JNI call completed successfully.");
                                }
                            }

                            // Update stream_url with resolved URL so WebView can play it via HTML5
                            let mut stream_info = stream.clone();
                            stream_info.stream_url = final_url;

                            use prost::Message;
                            let mut buf = Vec::new();
                            match stream_info.encode(&mut buf) {
                                Ok(_) => {
                                    let latin1_str: String = buf.iter().map(|&b| b as char).collect();
                                    let _ = proxy.send_event(UserEvent::IpcResult {
                                        callback_id: envelope.callback_id,
                                        success: true,
                                        data: json!(latin1_str),
                                    });
                                }
                                Err(e) => {
                                    let _ = proxy.send_event(UserEvent::IpcResult {
                                        callback_id: envelope.callback_id,
                                        success: false,
                                        data: json!(format!("Protobuf serialization failed: {}", e)),
                                    });
                                }
                            }
                        }
                        Err(e) => {
                            let _ = proxy.send_event(UserEvent::IpcResult {
                                  callback_id: envelope.callback_id,
                                  success: false,
                                  data: json!(e.to_string()),
                              });
                        }
                    }
                }
            }
            "media_pause" => {
                #[cfg(not(target_os = "android"))]
                {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::Pause);
                    discord.set_paused(true);
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({}),
                });
            }
            "media_play" => {
                #[cfg(not(target_os = "android"))]
                {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::Play);
                    discord.set_paused(false);
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({}),
                });
            }
            "media_stop" => {
                #[cfg(not(target_os = "android"))]
                {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::Stop);
                    discord.clear();
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({}),
                });
            }
            "media_seek" => {
                if let Ok(_pos) = envelope.payload.parse::<f64>() {
                    #[cfg(not(target_os = "android"))]
                    {
                        let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                        let _ = mpv.send_command(MpvCommand::Seek(_pos));
                    }
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data: json!({}),
                    });
                }
            }
            "media_volume" => {
                if let Ok(_vol) = envelope.payload.parse::<f64>() {
                    #[cfg(not(target_os = "android"))]
                    {
                        let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                        let _ = mpv.send_command(MpvCommand::SetVolume(_vol));
                    }
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data: json!({}),
                    });
                }
            }
            "set_fullscreen" => {
                let is_fullscreen = envelope.payload == "true";
                let _ = proxy.send_event(UserEvent::SetFullscreen {
                    callback_id: envelope.callback_id,
                    fullscreen: is_fullscreen,
                });
            }
            "import_animevost" => {
                let payload = envelope.payload.trim().to_string();
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                let config = crate::services::config::load_config();
                let proxy_url = config.proxy_url;

                let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);

                tokio::spawn(async move {
                    let import_fut = async {
                        let info = provider_manager.get_anime_info(&payload, &proxy_url).await?;
                        
                        let mut seeded = Vec::new();
                        for (idx, ep) in info.episodes.iter().enumerate() {
                            seeded.push(crate::local_server::DbAnime {
                                id: (idx + 1) as i32,
                                title: format!("{} - {}", info.title, ep.name),
                                description: format!("Episode {} of {}", ep.name, info.title),
                                stream_url: ep.url.clone(),
                                cover_image: ep.preview_image.clone().or_else(|| info.cover_image.clone()).unwrap_or_default(),
                            });
                        }

                        if seeded.is_empty() {
                            return Err(AppError::Mpv("No episodes found to import".to_string()));
                        }

                        let content = serde_json::to_string_pretty(&seeded)
                            .map_err(|e| AppError::Serialization(format!("JSON serialization failed: {}", e)))?;

                        let mut file = std::fs::File::create(crate::services::config::get_episodes_path())
                            .map_err(|e| AppError::Mpv(format!("Failed to create episodes.json: {}", e)))?;

                        use std::io::Write;
                        file.write_all(content.as_bytes())
                            .map_err(|e| AppError::Mpv(format!("Failed to write episodes.json: {}", e)))?;

                        Ok::<(), AppError>(())
                    };

                    match import_fut.await {
                        Ok(_) => {
                            let _ = crate::local_server::reload_database();
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!({ "success": true }),
                            });
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e.to_string()),
                            });
                        }
                    }
                });
            }
            "get_settings" => {
                let config = crate::services::config::load_config();
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!(config),
                });
            }
            "save_settings" => {
                if let Ok(mut new_config) = serde_json::from_str::<crate::services::config::AppConfig>(&envelope.payload) {
                    let current_config = crate::services::config::load_config();
                    new_config.shikimori_access_token = current_config.shikimori_access_token;
                    new_config.shikimori_refresh_token = current_config.shikimori_refresh_token;

                    let proxy_clone = proxy.clone();
                    let callback_id = envelope.callback_id.clone();
                    
                    #[cfg(not(target_os = "android"))]
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                    
                    match crate::services::config::save_config(&new_config) {
                        Ok(_) => {
                            #[cfg(not(target_os = "android"))]
                            discord.refresh();
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!({ "success": true }),
                            });
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e),
                            });
                        }
                    }
                }
            }
            "get_history" => {
                let history = crate::services::config::load_history();
                let proto_list = crate::services::grpc_anime::proto::AnimeListResponse {
                    animes: history.into_iter().map(|item| {
                        crate::services::grpc_anime::proto::Anime {
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            cover_image: item.cover_image,
                        }
                    }).collect(),
                };
                use prost::Message;
                let mut buf = Vec::new();
                match proto_list.encode(&mut buf) {
                    Ok(_) => {
                        let latin1_str: String = buf.iter().map(|&b| b as char).collect();
                        let _ = proxy.send_event(UserEvent::IpcResult {
                            callback_id: envelope.callback_id,
                            success: true,
                            data: json!(latin1_str),
                        });
                    }
                    Err(e) => {
                        let _ = proxy.send_event(UserEvent::IpcResult {
                            callback_id: envelope.callback_id,
                            success: false,
                            data: json!(format!("Protobuf serialization failed: {}", e)),
                        });
                    }
                }
            }
            "search_animevost" => {
                let payload_str = envelope.payload.clone();
                let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                
                let config = crate::services::config::load_config();
                let proxy_url = config.proxy_url;
                
                let (query, search_provider) = if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&payload_str) {
                    let q = json_val.get("query").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    let p = json_val.get("provider").and_then(|v| v.as_str()).unwrap_or(&config.search_provider).to_string();
                    (q, p)
                } else {
                    (payload_str, config.search_provider.clone())
                };
                
                tokio::spawn(async move {
                    match provider_manager.search(&query, &search_provider, &proxy_url).await {
                        Ok(titles) => {
                            let proto_list = crate::services::grpc_anime::proto::AnimeListResponse {
                                animes: titles.into_iter().map(|item| {
                                    // For URL-based providers (AnimeGO), id is a URL string
                                    // We store the URL in description so select_anime can use it as identifier
                                    let (numeric_id, description) = if item.id.starts_with("http") || item.id.starts_with("collaps") || item.id.starts_with("kodik") {
                                        (-1i32, item.id.clone())
                                    } else {
                                        (item.id.parse::<i32>().unwrap_or(-1), item.description.unwrap_or_default())
                                    };
                                    crate::services::grpc_anime::proto::Anime {
                                        id: numeric_id,
                                        title: item.title,
                                        description,
                                        cover_image: item.cover_image.unwrap_or_default(),
                                    }
                                }).collect(),
                            };
                            use prost::Message;
                            let mut buf = Vec::new();
                            match proto_list.encode(&mut buf) {
                                Ok(_) => {
                                    let latin1_str: String = buf.iter().map(|&b| b as char).collect();
                                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                        callback_id,
                                        success: true,
                                        data: json!(latin1_str),
                                    });
                                }
                                Err(e) => {
                                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                        callback_id,
                                        success: false,
                                        data: json!(format!("Protobuf serialization failed: {}", e)),
                                    });
                                }
                            }
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e.to_string()),
                            });
                        }
                    }
                });
            }
            "select_anime" => {
                if let Ok(selected_title) = serde_json::from_str::<crate::services::config::HistoryTitle>(&envelope.payload) {
                    let proxy_clone = proxy.clone();
                    let callback_id = envelope.callback_id.clone();
                    let config = crate::services::config::load_config();
                    let proxy_url = config.proxy_url;
                    
                    let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);
                    
                    let identifier = if provider_manager.can_handle(&selected_title.description) {
                        selected_title.description.clone()
                    } else {
                        selected_title.id.to_string()
                    };

                    tokio::spawn(async move {
                        match provider_manager.get_anime_info(&identifier, &proxy_url).await {
                            Ok(anime_details) => {
                                let mut seeded = Vec::new();
                                for (idx, ep) in anime_details.episodes.iter().enumerate() {
                                    seeded.push(crate::local_server::DbAnime {
                                        id: (idx + 1) as i32,
                                        title: format!("{} - {}", anime_details.title, ep.name),
                                        description: format!("Episode {} of {}", ep.name, anime_details.title),
                                        stream_url: ep.url.clone(),
                                        cover_image: ep.preview_image.clone().or_else(|| anime_details.cover_image.clone()).unwrap_or_default(),
                                    });
                                }

                                if let Err(err_str) = crate::local_server::save_episodes(&seeded) {
                                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                        callback_id,
                                        success: false,
                                        data: json!(err_str),
                                    });
                                    return;
                                }
                                
                                let mut history = crate::services::config::load_history();
                                history.retain(|item| item.description != selected_title.description && item.id != selected_title.id);
                                history.insert(0, crate::services::config::HistoryTitle {
                                    id: selected_title.id,
                                    title: anime_details.title.clone(),
                                    description: identifier,
                                    cover_image: anime_details.cover_image.clone().unwrap_or_default(),
                                });
                                if history.len() > 20 {
                                    history.truncate(20);
                                }
                                let _ = crate::services::config::save_history(&history);
                                
                                let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                    callback_id,
                                    success: true,
                                    data: json!(anime_details),
                                });
                            }
                            Err(e) => {
                                let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                    callback_id,
                                    success: false,
                                    data: json!(e.to_string()),
                                });
                            }
                        }
                    });
                }
            }
            "set_anime4k" => {
                // payload: { "mode": "A"|"B"|"C"|"off", "quality": "S"|"M"|"L"|"VL"|"UL" }
                #[cfg(not(target_os = "android"))]
                {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&envelope.payload) {
                        let mode_str = val.get("mode").and_then(|v| v.as_str()).unwrap_or("off");
                        let quality_str = val.get("quality").and_then(|v| v.as_str()).unwrap_or("M");

                        let quality = match quality_str {
                            "S"  => Anime4KQuality::S,
                            "L"  => Anime4KQuality::L,
                            "VL" => Anime4KQuality::VL,
                            "UL" => Anime4KQuality::UL,
                            _    => Anime4KQuality::M, // default: M
                        };

                        let mode = match mode_str {
                            "A" => Anime4KMode::ModeA(quality),
                            "B" => Anime4KMode::ModeB(quality),
                            "C" => Anime4KMode::ModeC(quality),
                            _   => Anime4KMode::Off,
                        };

                        let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                        let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                        let _ = mpv.send_command(MpvCommand::SetAnime4K(mode.clone()));
                        discord.set_anime4k(mode);
                    }
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "clear_shaders" => {
                #[cfg(not(target_os = "android"))]
                {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::ClearShaders);
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "cycle_audio" => {
                #[cfg(not(target_os = "android"))]
                {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::CycleAudio);
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "cycle_subtitles" => {
                #[cfg(not(target_os = "android"))]
                {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::CycleSubtitles);
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "set_quality" => {
                if let Ok(_idx) = envelope.payload.parse::<i32>() {
                    #[cfg(not(target_os = "android"))]
                    {
                        let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                        let _ = mpv.send_command(MpvCommand::SetQuality(_idx));
                    }
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data: json!({ "success": true }),
                    });
                }
            }
            "get_thumbnail" => {
                #[cfg(not(target_os = "android"))]
                {
                    if let Ok(time) = envelope.payload.parse::<f64>() {
                        let thumbnail_service: Arc<dyn crate::services::ThumbnailService> = shaku::HasComponent::resolve(&*container);
                        let proxy_clone = proxy.clone();
                        let callback_id = envelope.callback_id.clone();
                        tokio::spawn(async move {
                            match thumbnail_service.get_thumbnail(time).await {
                                Ok(b64) => {
                                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                        callback_id,
                                        success: true,
                                        data: json!({ "thumbnail": format!("data:image/jpeg;base64,{}", b64) }),
                                    });
                                }
                                Err(e) => {
                                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                        callback_id,
                                        success: false,
                                        data: json!(e.to_string()),
                                    });
                                }
                            }
                        });
                    }
                }
                #[cfg(target_os = "android")]
                {
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: false,
                        data: json!("Thumbnail generation is not supported on Android"),
                    });
                }
            }
            "shikimori_login" => {
                let shikimori: Arc<dyn crate::services::ShikimoriService> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                tokio::spawn(async move {
                    match shikimori.start_auth_flow().await {
                        Ok(_) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!({ "success": true }),
                            });
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e.to_string()),
                            });
                        }
                    }
                });
            }
            "shikimori_status" => {
                let config = crate::services::config::load_config();
                let is_authorized = !config.shikimori_access_token.trim().is_empty();
                if is_authorized {
                    let shikimori: Arc<dyn crate::services::ShikimoriService> = shaku::HasComponent::resolve(&*container);
                    let proxy_clone = proxy.clone();
                    let callback_id = envelope.callback_id.clone();
                    tokio::spawn(async move {
                        match shikimori.get_user_profile().await {
                            Ok(profile) => {
                                let nickname = profile.get("nickname").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                let mut avatar = profile.get("avatar").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                if !avatar.is_empty() && !avatar.starts_with("http") {
                                    avatar = format!("https://shikimori.one{}", avatar);
                                }
                                let url = profile.get("url").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                
                                let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                    callback_id,
                                    success: true,
                                    data: json!({
                                        "authorized": true,
                                        "profile": {
                                            "nickname": nickname,
                                            "avatar": avatar,
                                            "url": url
                                        }
                                    }),
                                });
                            }
                            Err(e) => {
                                println!("Failed to fetch Shikimori profile details: {}", e);
                                let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                    callback_id,
                                    success: true,
                                    data: json!({
                                        "authorized": true,
                                        "profile": null
                                    }),
                                });
                            }
                        }
                    });
                } else {
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data: json!({ "authorized": false, "profile": null }),
                    });
                }
            }
            "open_browser" => {
                let url = envelope.payload.clone();
                #[cfg(not(target_os = "android"))]
                let _ = open::that(&url);
                #[cfg(target_os = "android")]
                if let Err(e) = open_browser_android(&url) {
                    println!("[Rust IPC] [Android] open_browser_android failed: {:?}", e);
                }
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "shikimori_bookmarks" => {
                let shikimori: Arc<dyn crate::services::ShikimoriService> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                tokio::spawn(async move {
                    match shikimori.get_user_bookmarks(80).await {
                        Ok(bookmarks) => {
                            let mut results = Vec::new();
                            if let Some(arr) = bookmarks.as_array() {
                                for item in arr {
                                    if let Some(anime) = item.get("anime") {
                                        let anime_id = anime.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let ru_name = anime.get("russian").and_then(|v| v.as_str()).unwrap_or("");
                                        let en_name = anime.get("name").and_then(|v| v.as_str()).unwrap_or("");
                                        let title = if !ru_name.is_empty() { ru_name } else { en_name };
                                        
                                        let mut cover_image = String::new();
                                        if let Some(img_obj) = anime.get("image") {
                                            if let Some(orig) = img_obj.get("original").and_then(|v| v.as_str()) {
                                                cover_image = if orig.starts_with("http") {
                                                    orig.to_string()
                                                } else {
                                                    format!("https://shikimori.one{}", orig)
                                                };
                                            }
                                        }

                                        let status_key = item.get("status").and_then(|v| v.as_str()).unwrap_or("");
                                        let status_ru = match status_key {
                                            "planned" => "В планах",
                                            "watching" => "Смотрю",
                                            "completed" => "Просмотрено",
                                            "on_hold" => "Отложено",
                                            "dropped" => "Брошено",
                                            "rewatching" => "Пересматриваю",
                                            other => other,
                                        };

                                        let episodes_watched = item.get("episodes").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let score = item.get("score").and_then(|v| v.as_i64()).unwrap_or(0);
                                        
                                        let mut desc = format!("Статус: {}", status_ru);
                                        if episodes_watched > 0 {
                                            desc = format!("{}, серий: {}", desc, episodes_watched);
                                        }
                                        if score > 0 {
                                            desc = format!("{}, оценка: {}/10", desc, score);
                                        }

                                        results.push(json!({
                                            "id": -1,
                                            "title": title,
                                            "description": format!("https://shikimori.one/animes/{}", anime_id),
                                            "cover_image": cover_image,
                                            "status_text": desc,
                                            "watch_status": status_key
                                        }));
                                    }
                                }
                            }
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!(results),
                            });
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e.to_string()),
                            });
                        }
                    }
                });
            }
            "shikimori_friends" => {
                let shikimori: Arc<dyn crate::services::ShikimoriService> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                tokio::spawn(async move {
                    match shikimori.get_user_friends().await {
                        Ok(friends) => {
                            let mut results = Vec::new();
                            if let Some(arr) = friends.as_array() {
                                for item in arr {
                                    let id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                                    let nickname = item.get("nickname").and_then(|v| v.as_str()).unwrap_or("");
                                    let last_online_at = item.get("last_online_at").and_then(|v| v.as_str()).unwrap_or("");
                                    let url = item.get("url").and_then(|v| v.as_str()).unwrap_or("");

                                    let mut avatar = String::new();
                                    if let Some(avatar_val) = item.get("avatar").and_then(|v| v.as_str()) {
                                        avatar = if avatar_val.starts_with("http") {
                                            avatar_val.to_string()
                                        } else {
                                            format!("https://shikimori.one{}", avatar_val)
                                        };
                                    } else if let Some(image_obj) = item.get("image") {
                                        if let Some(x160) = image_obj.get("x160").and_then(|v| v.as_str()) {
                                            avatar = if x160.starts_with("http") {
                                                x160.to_string()
                                            } else {
                                                format!("https://shikimori.one{}", x160)
                                            };
                                        }
                                    }

                                    results.push(json!({
                                        "id": id,
                                        "nickname": nickname,
                                        "avatar": avatar,
                                        "last_online_at": last_online_at,
                                        "url": url
                                    }));
                                }
                            }
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!(results),
                            });
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e.to_string()),
                            });
                        }
                    }
                });
            }
            "shikimori_friend_bookmarks" => {
                let shikimori: Arc<dyn crate::services::ShikimoriService> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                let friend_id_or_nickname = envelope.payload.trim_matches('"').to_string();
                tokio::spawn(async move {
                    match shikimori.get_friend_bookmarks(&friend_id_or_nickname, 80).await {
                        Ok(bookmarks) => {
                            let mut results = Vec::new();
                            if let Some(arr) = bookmarks.as_array() {
                                for item in arr {
                                    if let Some(anime) = item.get("anime") {
                                        let anime_id = anime.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let ru_name = anime.get("russian").and_then(|v| v.as_str()).unwrap_or("");
                                        let en_name = anime.get("name").and_then(|v| v.as_str()).unwrap_or("");
                                        let title = if !ru_name.is_empty() { ru_name } else { en_name };
                                        
                                        let mut cover_image = String::new();
                                        if let Some(img_obj) = anime.get("image") {
                                            if let Some(orig) = img_obj.get("original").and_then(|v| v.as_str()) {
                                                cover_image = if orig.starts_with("http") {
                                                    orig.to_string()
                                                } else {
                                                    format!("https://shikimori.one{}", orig)
                                                };
                                            }
                                        }

                                        let status_key = item.get("status").and_then(|v| v.as_str()).unwrap_or("");
                                        let status_ru = match status_key {
                                            "planned" => "В планах",
                                            "watching" => "Смотрю",
                                            "completed" => "Просмотрено",
                                            "on_hold" => "Отложено",
                                            "dropped" => "Брошено",
                                            "rewatching" => "Пересматриваю",
                                            other => other,
                                        };

                                        let episodes_watched = item.get("episodes").and_then(|v| v.as_i64()).unwrap_or(0);
                                        let score = item.get("score").and_then(|v| v.as_i64()).unwrap_or(0);
                                        
                                        let mut desc = format!("Статус: {}", status_ru);
                                        if episodes_watched > 0 {
                                            desc = format!("{}, серий: {}", desc, episodes_watched);
                                        }
                                        if score > 0 {
                                            desc = format!("{}, оценка: {}/10", desc, score);
                                        }

                                        results.push(json!({
                                            "id": -1,
                                            "title": title,
                                            "description": format!("https://shikimori.one/animes/{}", anime_id),
                                            "cover_image": cover_image,
                                            "status_text": desc,
                                            "watch_status": status_key
                                        }));
                                    }
                                }
                            }
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!(results),
                            });
                        }
                        Err(e) => {
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: false,
                                data: json!(e.to_string()),
                            });
                        }
                    }
                });
            }
            "search_all" => {
                let query = envelope.payload.clone();
                let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                
                let config = crate::services::config::load_config();
                let proxy_url = config.proxy_url;
                
                tokio::spawn(async move {
                    let mut results = Vec::new();
                    
                    // 1. AnimeGO
                    if let Ok(res) = provider_manager.search(&query, "animego", &proxy_url).await {
                        for item in res {
                            results.push(json!({
                                "id": -1,
                                "title": item.title,
                                "description": item.id.clone(),
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "AnimeGO"
                            }));
                        }
                    }
                    
                    // 2. Jut.su
                    if let Ok(res) = provider_manager.search(&query, "jutsu", &proxy_url).await {
                        for item in res {
                            results.push(json!({
                                "id": -1,
                                "title": item.title,
                                "description": item.id.clone(),
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "Jut.su"
                            }));
                        }
                    }
                    
                    // 3. AnimeVost
                    if let Ok(res) = provider_manager.search(&query, "animevost", &proxy_url).await {
                        for item in res {
                            let (numeric_id, description) = if item.id.starts_with("http") {
                                (-1i32, item.id.clone())
                            } else {
                                (item.id.parse::<i32>().unwrap_or(-1), item.description.unwrap_or_default())
                            };
                            results.push(json!({
                                "id": numeric_id,
                                "title": item.title,
                                "description": if description.is_empty() { item.id.clone() } else { description },
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "AnimeVost"
                            }));
                        }
                    }
                    
                    // 4. AniLiberty
                    if let Ok(res) = provider_manager.search(&query, "aniliberty", &proxy_url).await {
                        for item in res {
                            results.push(json!({
                                "id": -1,
                                "title": item.title,
                                "description": item.id.clone(),
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "AniLiberty"
                            }));
                        }
                    }

                    // 5. Collaps
                    if let Ok(res) = provider_manager.search(&query, "collaps", &proxy_url).await {
                        for item in res {
                            results.push(json!({
                                "id": -1,
                                "title": item.title,
                                "description": item.id.clone(),
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "Collaps"
                            }));
                        }
                    }

                    // 6. Collaps-DASH
                    if let Ok(res) = provider_manager.search(&query, "collaps-dash", &proxy_url).await {
                        for item in res {
                            results.push(json!({
                                "id": -1,
                                "title": item.title,
                                "description": item.id.clone(),
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "Collaps-DASH"
                            }));
                        }
                    }

                    // 7. Kodik
                    if let Ok(res) = provider_manager.search(&query, "kodik", &proxy_url).await {
                        for item in res {
                            results.push(json!({
                                "id": -1,
                                "title": item.title,
                                "description": item.id.clone(),
                                "cover_image": item.cover_image.unwrap_or_default(),
                                "provider": "Kodik"
                            }));
                        }
                    }

                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                        callback_id,
                        success: true,
                        data: json!(results),
                    });
                });
            }
            "save_resume" => {
                if let Ok(state) = serde_json::from_str::<crate::services::config::ResumeState>(&envelope.payload) {
                    match crate::services::config::save_resume(&state) {
                        Ok(_) => {
                            let _ = proxy.send_event(UserEvent::IpcResult {
                                callback_id: envelope.callback_id,
                                success: true,
                                data: json!({ "success": true }),
                            });
                        }
                        Err(e) => {
                            let _ = proxy.send_event(UserEvent::IpcResult {
                                callback_id: envelope.callback_id,
                                success: false,
                                data: json!(e),
                            });
                        }
                    }
                }
            }
            "get_resume" => {
                let resume = crate::services::config::load_resume();
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: match resume {
                        Some(r) => serde_json::to_value(r).unwrap_or(serde_json::Value::Null),
                        None => serde_json::Value::Null,
                    },
                });
            }
            "clear_resume" => {
                let _ = crate::services::config::clear_resume();
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "get_logs" => {
                let logs = crate::window::logs::get_logs();
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!(logs),
                });
            }
            "clear_logs" => {
                crate::window::logs::clear_logs();
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            "log" => {
                println!("[WebView Log] {}", envelope.payload);
            }
            _ => {
                println!("[Rust IPC] Unhandled Action: {}, Payload: {}", envelope.action, envelope.payload);
            }
        }
    }
}

#[cfg(target_os = "android")]
fn open_in_mpv(url: &str) -> Result<(), Box<dyn std::error::Error>> {
    let ctx = ndk_context::android_context();
    let vm = unsafe { jni::JavaVM::from_raw(ctx.vm() as *mut _) }?;
    let mut env = vm.attach_current_thread()?;
    let context_obj = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut _) };

    let url_jstr = env.new_string(url)?;
    
    env.call_method(
        &context_obj,
        "openInMpv",
        "(Ljava/lang/String;)V",
        &[jni::objects::JValue::Object(url_jstr.as_ref())],
    )?;
    
    Ok(())
}

#[cfg(target_os = "android")]
pub fn open_browser_android(url: &str) -> Result<(), Box<dyn std::error::Error>> {
    let ctx = ndk_context::android_context();
    let vm = unsafe { jni::JavaVM::from_raw(ctx.vm() as *mut _) }?;
    let mut env = vm.attach_current_thread()?;
    let context_obj = unsafe { jni::objects::JObject::from_raw(ctx.context() as *mut _) };

    let url_jstr = env.new_string(url)?;
    
    env.call_method(
        &context_obj,
        "openBrowser",
        "(Ljava/lang/String;)V",
        &[jni::objects::JValue::Object(url_jstr.as_ref())],
    )?;
    
    Ok(())
}

