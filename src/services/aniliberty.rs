use shaku::Component;
use crate::error::AppError;
use super::{AniLibertyService, ContentProvider, ProviderAnimeInfo, ProviderSearchResult, ProviderEpisode};
use reqwest::Proxy;
use serde_json::Value;

const ANILIBERTY_API_BASE: &str = "https://aniliberty.top/api/v1";
const ANILIBERTY_HOST: &str = "https://aniliberty.top";

#[derive(Component)]
#[shaku(interface = AniLibertyService)]
pub struct AniLibertyServiceImpl {}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(10));

    let builder = if !proxy_url.trim().is_empty() {
        let proxy = Proxy::all(proxy_url)
            .map_err(|e| AppError::Mpv(format!("Proxy build failed: {}", e)))?;
        builder.proxy(proxy)
    } else {
        builder
    };

    builder
        .build()
        .map_err(|e| AppError::Mpv(format!("Client build failed: {}", e)))
}

fn format_image_url(url: &str) -> Option<String> {
    if url.is_empty() {
        return None;
    }
    if url.starts_with("http") {
        Some(url.to_string())
    } else {
        Some(format!("{}{}", ANILIBERTY_HOST, url))
    }
}

#[async_trait::async_trait]
impl AniLibertyService for AniLibertyServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for AniLibertyServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.contains("aniliberty.top") || identifier.starts_with("https://aniliberty.top")
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let client = build_client(proxy_url)?;
        let url = format!("{}/anime/catalog/releases", ANILIBERTY_API_BASE);

        let mut res = client
            .get(&url)
            .query(&[
                ("page", "1"),
                ("limit", "24"),
                ("f[search]", query),
            ])
            .header("Referer", "https://aniliberty.top/")
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AniLiberty] Search request with proxy failed or was blocked (status: {:?}). Retrying WITHOUT proxy.", res.as_ref().map(|r| r.status()));
                let direct_client = build_client("")?;
                res = direct_client
                    .get(&url)
                    .query(&[
                        ("page", "1"),
                        ("limit", "24"),
                        ("f[search]", query),
                    ])
                    .header("Referer", "https://aniliberty.top/")
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("AniLiberty search request failed: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("AniLiberty search returned HTTP {}", res.status())));
        }

        let json: Value = res.json().await
            .map_err(|e| AppError::Serialization(format!("AniLiberty search JSON parse failed: {}", e)))?;

        let mut results = Vec::new();
        if let Some(items) = json.get("data").and_then(|v| v.as_array()) {
            for item in items {
                let alias = item.get("alias").and_then(|v| v.as_str()).unwrap_or_default();
                // Use a full URL so that can_handle() catches it and IPC preserves it as a string
                let id = format!("{}/release/{}", ANILIBERTY_HOST, alias);
                
                let title = item.get("name").and_then(|v| v.get("main")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
                let original_title = item.get("name").and_then(|v| v.get("english")).and_then(|v| v.as_str());
                let cover_image = item.get("poster").and_then(|v| v.get("preview")).and_then(|v| v.as_str()).and_then(format_image_url);

                results.push(ProviderSearchResult {
                    id,
                    title,
                    description: original_title.map(|s| s.to_string()),
                    cover_image,
                });
            }
        }

        Ok(results)
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let client = build_client(proxy_url)?;
        
        let alias = if identifier.contains("/") {
            identifier.split('/').last().unwrap_or(identifier)
        } else {
            identifier
        };
        let url = format!("{}/anime/releases/{}", ANILIBERTY_API_BASE, alias);

        let mut res = client
            .get(&url)
            .header("Referer", "https://aniliberty.top/")
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[AniLiberty] Release fetch request with proxy failed or was blocked (status: {:?}). Retrying WITHOUT proxy.", res.as_ref().map(|r| r.status()));
                let direct_client = build_client("")?;
                res = direct_client
                    .get(&url)
                    .header("Referer", "https://aniliberty.top/")
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("AniLiberty release fetch failed: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("AniLiberty release returned HTTP {}", res.status())));
        }

        let json: Value = res.json().await
            .map_err(|e| AppError::Serialization(format!("AniLiberty release JSON parse failed: {}", e)))?;

        let title = json.get("name").and_then(|v| v.get("main")).and_then(|v| v.as_str()).unwrap_or_default().to_string();
        let original_title = json.get("name").and_then(|v| v.get("english")).and_then(|v| v.as_str()).map(|s| s.to_string());
        let description = json.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
        let cover_image = json.get("poster").and_then(|v| v.get("preview")).and_then(|v| v.as_str()).and_then(format_image_url);
        let year = json.get("year").and_then(|v| v.as_i64()).map(|v| v.to_string());
        let age_rating = json.get("age_rating").and_then(|v| v.get("label")).and_then(|v| v.as_str()).map(|s| s.to_string());

        let mut genres = Vec::new();
        if let Some(genre_arr) = json.get("genres").and_then(|v| v.as_array()) {
            for g in genre_arr {
                if let Some(name) = g.get("name").and_then(|v| v.as_str()) {
                    genres.push(name.to_string());
                }
            }
        }

        let mut episodes = Vec::new();
        if let Some(ep_arr) = json.get("episodes").and_then(|v| v.as_array()) {
            for ep in ep_arr {
                let name = if let Some(n) = ep.get("name").and_then(|v| v.as_str()) {
                    n.to_string()
                } else if let Some(o) = ep.get("ordinal").and_then(|v| v.as_i64()) {
                    o.to_string()
                } else {
                    "Unknown Episode".to_string()
                };
                
                // Pick highest quality available
                let url = ep.get("hls_1080").and_then(|v| v.as_str())
                    .or_else(|| ep.get("hls_720").and_then(|v| v.as_str()))
                    .or_else(|| ep.get("hls_480").and_then(|v| v.as_str()))
                    .unwrap_or_default()
                    .to_string();
                
                if !url.is_empty() {
                    episodes.push(ProviderEpisode {
                        name,
                        url,
                        preview_image: ep.get("preview").and_then(|v| v.get("preview")).and_then(|v| v.as_str()).and_then(format_image_url),
                    });
                }
            }
        }
        
        Ok(ProviderAnimeInfo {
            title,
            original_title,
            description,
            cover_image,
            genres,
            years: year.map(|y| vec![y]).unwrap_or_default(),
            age_rating,
            episodes,
        })
    }

    async fn resolve_stream_url(&self, stream_url: &str, _proxy_url: &str) -> Result<String, AppError> {
        Ok(stream_url.to_string())
    }
}
