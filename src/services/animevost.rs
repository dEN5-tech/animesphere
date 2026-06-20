use shaku::Component;
use crate::error::AppError;
use super::{AnimeVostService, ContentProvider, ProviderEpisode, ProviderAnimeInfo, ProviderSearchResult};
use crate::local_server::DbAnime;
use std::fs::File;
use std::io::Write;
use reqwest::Proxy;

#[derive(Component)]
#[shaku(interface = AnimeVostService)]
pub struct AnimeVostServiceImpl {}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AnimeVostTitle {
    pub id: i32,
    pub title: String,
    pub description: Option<String>,
    pub url_image: Option<String>,
    pub genre: Option<String>,
    pub year: Option<String>,
    pub director: Option<String>,
    pub screen_image: Option<Vec<String>>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AnimeVostEpisode {
    pub name: String,
    pub std: String,
    pub hd: String,
    pub preview: String,
}

#[derive(serde::Deserialize)]
struct ApiResponse<T> {
    data: Option<Vec<T>>,
}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let client_builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10));
    
    let client_builder = if !proxy_url.trim().is_empty() {
        let proxy = Proxy::all(proxy_url)
            .map_err(|e| AppError::Mpv(format!("Proxy build failed: {}", e)))?;
        client_builder.proxy(proxy)
    } else {
        client_builder
    };

    client_builder.build()
        .map_err(|e| AppError::Mpv(format!("Client build failed: {}", e)))
}

#[async_trait::async_trait]
impl AnimeVostService for AnimeVostServiceImpl {
    async fn get_info(&self, id: i32, proxy_url: &str) -> Result<AnimeVostTitle, AppError> {
        let client = build_client(proxy_url)?;
        let url = "https://api.animevost.org/v1/info";
        let mut res = client.post(url)
            .form(&[("id", id.to_string())])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AnimeVost] Info fetch request with proxy failed or was blocked. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client.post(url)
                    .form(&[("id", id.to_string())])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Info fetch failed: {}", e)))?;

        let data: ApiResponse<AnimeVostTitle> = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("Info JSON parse failed: {}", e)))?;

        let title = data.data
            .and_then(|mut items| if items.is_empty() { None } else { Some(items.remove(0)) })
            .ok_or_else(|| AppError::Mpv("No anime found with specified ID".to_string()))?;

        Ok(title)
    }

    async fn get_playlist(&self, id: i32, proxy_url: &str) -> Result<Vec<AnimeVostEpisode>, AppError> {
        let client = build_client(proxy_url)?;
        let url = "https://api.animevost.org/v1/playlist";
        let mut res = client.post(url)
            .form(&[("id", id.to_string())])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AnimeVost] Playlist fetch request with proxy failed or was blocked. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client.post(url)
                    .form(&[("id", id.to_string())])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Playlist fetch failed: {}", e)))?;

        let playlist: Vec<AnimeVostEpisode> = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("Playlist JSON parse failed: {}", e)))?;

        Ok(playlist)
    }

    async fn get_list(&self, page: i32, limit: i32, proxy_url: &str) -> Result<Vec<AnimeVostTitle>, AppError> {
        let client = build_client(proxy_url)?;
        let url = "https://api.animevost.org/v1/list";
        let mut res = client.post(url)
            .form(&[
                ("page", page.to_string()),
                ("limit", limit.to_string()),
            ])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AnimeVost] List fetch request with proxy failed or was blocked. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client.post(url)
                    .form(&[
                        ("page", page.to_string()),
                        ("limit", limit.to_string()),
                    ])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("List fetch failed: {}", e)))?;

        let data: ApiResponse<AnimeVostTitle> = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("List JSON parse failed: {}", e)))?;

        Ok(data.data.unwrap_or_default())
    }

    async fn get_last(&self, page: i32, limit: i32, proxy_url: &str) -> Result<Vec<AnimeVostTitle>, AppError> {
        let client = build_client(proxy_url)?;
        let url = "https://api.animevost.org/v1/last";
        let mut res = client.post(url)
            .form(&[
                ("page", page.to_string()),
                ("limit", limit.to_string()),
            ])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AnimeVost] Last fetch request with proxy failed or was blocked. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client.post(url)
                    .form(&[
                        ("page", page.to_string()),
                        ("limit", limit.to_string()),
                    ])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Last fetch failed: {}", e)))?;

        let data: ApiResponse<AnimeVostTitle> = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("Last JSON parse failed: {}", e)))?;

        Ok(data.data.unwrap_or_default())
    }

    async fn search_vost(&self, query: &str, proxy_url: &str) -> Result<Vec<AnimeVostTitle>, AppError> {
        let client = build_client(proxy_url)?;
        let url = "https://api.animevost.org/v1/search";
        let mut res = client.post(url)
            .form(&[("name", query.to_string())])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AnimeVost] Search fetch request with proxy failed or was blocked. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client.post(url)
                    .form(&[("name", query.to_string())])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Search fetch failed: {}", e)))?;

        let data: ApiResponse<AnimeVostTitle> = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("Search JSON parse failed: {}", e)))?;

        Ok(data.data.unwrap_or_default())
    }

    async fn import_by_id(&self, id: i32, proxy_url: &str) -> Result<(), AppError> {
        let anime_details = self.get_info(id, proxy_url).await?;
        let mut playlist = self.get_playlist(id, proxy_url).await?;

        // Extract russian title
        let full_title = &anime_details.title;
        let ru_title = full_title.split("/ ").next().unwrap_or(full_title).trim();

        // Sort playlist by numerical value of the episode name
        playlist.sort_by(|a, b| {
            let num_a = parse_episode_number(&a.name);
            let num_b = parse_episode_number(&b.name);
            num_a.cmp(&num_b)
        });

        // 3. Build vector of DbAnime
        let mut seeded = Vec::new();
        for (index, elem) in playlist.iter().enumerate() {
            // Prioritize HD over STD if the link exists and is not empty
            let max_resolution_url = if !elem.hd.trim().is_empty() {
                elem.hd.trim().to_string()
            } else {
                elem.std.trim().to_string()
            };

            seeded.push(DbAnime {
                id: (index + 1) as i32,
                title: format!("{} - {}", ru_title, elem.name),
                description: format!("Episode {} of {}", elem.name, ru_title),
                stream_url: max_resolution_url,
                cover_image: elem.preview.clone(),
            });
        }

        if seeded.is_empty() {
            return Err(AppError::Mpv("No episodes found in playlist".to_string()));
        }

        // 4. Save to episodes.json
        let content = serde_json::to_string_pretty(&seeded)
            .map_err(|e| AppError::Serialization(format!("JSON serialization failed: {}", e)))?;

        let mut file = File::create(super::config::get_episodes_path())
            .map_err(|e| AppError::Mpv(format!("Failed to create episodes.json: {}", e)))?;

        file.write_all(content.as_bytes())
            .map_err(|e| AppError::Mpv(format!("Failed to write episodes.json: {}", e)))?;

        println!("Successfully imported {} episodes for '{}' (ID: {})", seeded.len(), ru_title, id);
        Ok(())
    }
}

#[async_trait::async_trait]
impl ContentProvider for AnimeVostServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.chars().all(|c| c.is_ascii_digit()) && !identifier.trim().is_empty()
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let id = identifier.parse::<i32>()
            .map_err(|e| AppError::Mpv(format!("Invalid AnimeVost ID format: {}", e)))?;
        let title_info = self.get_info(id, proxy_url).await?;
        let playlist = self.get_playlist(id, proxy_url).await?;

        let full_title = &title_info.title;
        let ru_title = full_title.split("/ ").next().unwrap_or(full_title).trim().to_string();

        let mut sorted_playlist = playlist;
        sorted_playlist.sort_by(|a, b| {
            let num_a = parse_episode_number(&a.name);
            let num_b = parse_episode_number(&b.name);
            num_a.cmp(&num_b)
        });

        let episodes = sorted_playlist.into_iter().map(|ep| {
            let max_resolution_url = if !ep.hd.trim().is_empty() {
                ep.hd.trim().to_string()
            } else {
                ep.std.trim().to_string()
            };
            ProviderEpisode {
                name: ep.name,
                url: max_resolution_url,
                preview_image: Some(ep.preview),
            }
        }).collect();

        let genres = title_info.genre
            .map(|g| g.split(',').map(|s| s.trim().to_string()).collect())
            .unwrap_or_default();
        let years = title_info.year
            .map(|y| vec![y.trim().to_string()])
            .unwrap_or_default();

        Ok(ProviderAnimeInfo {
            title: ru_title,
            original_title: None,
            description: title_info.description,
            cover_image: title_info.url_image,
            genres,
            years,
            age_rating: None,
            episodes,
        })
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let results = self.search_vost(query, proxy_url).await?;
        Ok(results.into_iter().map(|title| {
            ProviderSearchResult {
                id: title.id.to_string(),
                title: title.title,
                description: title.description,
                cover_image: title.url_image,
            }
        }).collect())
    }

    async fn resolve_stream_url(&self, stream_url: &str, _proxy_url: &str) -> Result<String, AppError> {
        Ok(stream_url.to_string())
    }
}


fn parse_episode_number(name: &str) -> i32 {
    let mut parts = name.split_whitespace();
    if let Some(first) = parts.next() {
        if let Ok(num) = first.parse::<i32>() {
            return num;
        }
    }
    for word in name.split_whitespace() {
        let clean: String = word.chars().filter(|c| c.is_ascii_digit()).collect();
        if let Ok(num) = clean.parse::<i32>() {
            return num;
        }
    }
    0
}
