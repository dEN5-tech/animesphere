use std::sync::Arc;
use serde_json::json;
use crate::di::AppModule;
use crate::services::{AnimeService, MpvService, MpvCommand, Anime4KMode, Anime4KQuality};
use crate::error::AppError;
use super::types::{IpcEnvelope, UserEvent};

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
                        let json_list: Vec<serde_json::Value> = list.into_iter().map(|item| {
                            json!({
                                "id": item.id,
                                "title": item.title,
                                "description": item.description,
                                "cover_image": item.cover_image,
                            })
                        }).collect();
                        let _ = proxy.send_event(UserEvent::IpcResult {
                            callback_id: envelope.callback_id,
                            success: true,
                            data: json!(json_list),
                        });
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
                    let service: Arc<dyn AnimeService> = shaku::HasComponent::resolve(&*container);
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);

                    match service.get_stream(id).await {
                        Ok(stream) => {
                            let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);
                            let config = crate::services::config::load_config();
                            let final_url = match provider_manager.resolve_stream_url(&stream.stream_url, &config.proxy_url).await {
                                Ok(url) => url,
                                Err(e) => {
                                    println!("Failed to resolve stream URL: {}", e);
                                    stream.stream_url.clone()
                                }
                            };

                            let _ = mpv.send_command(MpvCommand::LoadVideo(final_url));
                            let _ = mpv.send_command(MpvCommand::Play);
                            discord.update_now_playing(stream.title.clone(), Some(stream.cover_image.clone()));

                            let _ = proxy.send_event(UserEvent::IpcResult {
                                  callback_id: envelope.callback_id,
                                  success: true,
                                  data: json!({ "title": stream.title }),
                              });
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
                let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                let _ = mpv.send_command(MpvCommand::Pause);
                discord.set_paused(true);
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({}),
                });
            }
            "media_play" => {
                let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                let _ = mpv.send_command(MpvCommand::Play);
                discord.set_paused(false);
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({}),
                });
            }
            "media_stop" => {
                let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                let _ = mpv.send_command(MpvCommand::Stop);
                discord.clear();
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({}),
                });
            }
            "media_seek" => {
                if let Ok(pos) = envelope.payload.parse::<f64>() {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::Seek(pos));
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data: json!({}),
                    });
                }
            }
            "media_volume" => {
                if let Ok(vol) = envelope.payload.parse::<f64>() {
                    let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                    let _ = mpv.send_command(MpvCommand::SetVolume(vol));
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
            "save_settings" => {
                if let Ok(new_config) = serde_json::from_str::<crate::services::config::AppConfig>(&envelope.payload) {
                    let proxy_clone = proxy.clone();
                    let callback_id = envelope.callback_id.clone();
                    let discord: Arc<dyn crate::services::DiscordPresenceService> = shaku::HasComponent::resolve(&*container);
                    match crate::services::config::save_config(&new_config) {
                        Ok(_) => {
                            discord.refresh();
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!({ "success": true }),
                            });
                        }
                        Err(e) => {
            ...

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
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!(history),
                });
            }
            "search_animevost" => {
                let query = envelope.payload.clone();
                let provider_manager: Arc<dyn crate::services::ProviderManager> = shaku::HasComponent::resolve(&*container);
                let proxy_clone = proxy.clone();
                let callback_id = envelope.callback_id.clone();
                
                let config = crate::services::config::load_config();
                let proxy_url = config.proxy_url;
                let search_provider = config.search_provider.clone();
                
                tokio::spawn(async move {
                    match provider_manager.search(&query, &search_provider, &proxy_url).await {
                        Ok(titles) => {
                            let json_titles: Vec<serde_json::Value> = titles.into_iter().map(|item| {
                                // For URL-based providers (AnimeGO), id is a URL string
                                // We store the URL in description so select_anime can use it as identifier
                                let (numeric_id, description) = if item.id.starts_with("http") {
                                    (-1i32, item.id.clone())
                                } else {
                                    (item.id.parse::<i32>().unwrap_or(-1), item.description.unwrap_or_default())
                                };
                                json!({
                                    "id": numeric_id,
                                    "title": item.title,
                                    "description": description,
                                    "cover_image": item.cover_image.unwrap_or_default(),
                                })
                            }).collect();
                            let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                callback_id,
                                success: true,
                                data: json!(json_titles),
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

                                let write_res = || -> Result<(), String> {
                                    let content = serde_json::to_string_pretty(&seeded).map_err(|e| e.to_string())?;
                                    let mut file = std::fs::File::create(crate::services::config::get_episodes_path()).map_err(|e| e.to_string())?;
                                    use std::io::Write;
                                    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
                                    Ok(())
                                }();
                                
                                if let Err(err_str) = write_res {
                                    let _ = proxy_clone.send_event(UserEvent::IpcResult {
                                        callback_id,
                                        success: false,
                                        data: json!(err_str),
                                    });
                                    return;
                                }
                                
                                let _ = crate::local_server::reload_database();
                                
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
            }
            "set_anime4k" => {
                // payload: { "mode": "A"|"B"|"C"|"off", "quality": "S"|"M"|"L"|"VL"|"UL" }
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
                    let _ = proxy.send_event(UserEvent::IpcResult {
                        callback_id: envelope.callback_id,
                        success: true,
                        data: json!({ "success": true }),
                    });
                }
            }
            "clear_shaders" => {
                let mpv: Arc<dyn MpvService> = shaku::HasComponent::resolve(&*container);
                let _ = mpv.send_command(MpvCommand::ClearShaders);
                let _ = proxy.send_event(UserEvent::IpcResult {
                    callback_id: envelope.callback_id,
                    success: true,
                    data: json!({ "success": true }),
                });
            }
            _ => {}
        }
    }
}
