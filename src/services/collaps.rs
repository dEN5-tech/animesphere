use shaku::Component;
use reqwest::Proxy;
use base64::{Engine as _, engine::general_purpose};
use crate::error::AppError;
use super::{CollapsService, CollapsDashService, ContentProvider, ProviderAnimeInfo, ProviderSearchResult, ProviderEpisode};

const DEFAULT_API_HOST: &str = "https://api.bhcesh.me";
const DEFAULT_TOKEN: &str = "eedefb541aeba871dcfc756e6b31c02e";
const DEFAULT_EMBED_HOST: &str = "https://api.luxembd.ws";

#[derive(Component)]
#[shaku(interface = CollapsService)]
pub struct CollapsServiceImpl {}

#[derive(Component)]
#[shaku(interface = CollapsDashService)]
pub struct CollapsDashServiceImpl {}

#[derive(serde::Deserialize)]
struct CollapsSearchResult {
    id: i64,
    name: String,
    origin_name: Option<String>,
    year: Option<i32>,
    poster: Option<String>,
}

#[derive(serde::Deserialize)]
struct CollapsSearchRoot {
    results: Option<Vec<CollapsSearchResult>>,
}

#[derive(serde::Deserialize, Clone, Debug)]
pub struct Cc {
    pub url: Option<String>,
    pub name: Option<String>,
}

#[derive(serde::Deserialize, Clone, Debug)]
struct Episode {
    episode: String,
    hls: Option<String>,
    dasha: Option<String>,
    dash: Option<String>,
    cc: Option<Vec<Cc>>,
}

#[derive(serde::Deserialize, Clone, Debug)]
struct SerialModel {
    season: i32,
    episodes: Vec<Episode>,
}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Origin", reqwest::header::HeaderValue::from_static("https://kinokrad.my"));
    headers.insert("Referer", reqwest::header::HeaderValue::from_static("https://kinokrad.my/"));

    let builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .default_headers(headers);

    let builder = if !proxy_url.trim().is_empty() {
        println!("[Collaps] Building HTTP client with proxy: {}", proxy_url);
        let proxy = Proxy::all(proxy_url)
            .map_err(|e| AppError::Mpv(format!("Proxy build failed: {}", e)))?;
        builder.proxy(proxy)
    } else {
        println!("[Collaps] Building HTTP client without proxy");
        builder
    };

    builder
        .build()
        .map_err(|e| AppError::Mpv(format!("Client build failed: {}", e)))
}

fn format_poster_url(poster: &str) -> Option<String> {
    if poster.is_empty() {
        return None;
    }
    if poster.starts_with("http") {
        Some(poster.to_string())
    } else {
        Some(format!(
            "{}{}{}",
            DEFAULT_EMBED_HOST,
            if poster.starts_with('/') { "" } else { "/" },
            poster
        ))
    }
}

pub fn encode_uri(url: &str) -> String {
    println!("[Collaps] Encoding stream URI: {}", url);
    let marker = "/x-en-x/";
    if url.is_empty() || url.contains(marker) {
        return url.to_string();
    }

    let parsed_uri = match reqwest::Url::parse(url) {
        Ok(u) => u,
        Err(_) => return url.to_string(),
    };

    let path_and_query = format!(
        "{}{}",
        parsed_uri.path(),
        parsed_uri.query().map(|q| format!("?{}", q)).unwrap_or_default()
    );

    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let n = (duration.as_millis() as f64 / 1000.0 / 60.0 / 60.0).round() as i64;

    let raw_payload = format!("{}/{}", n, path_and_query);
    let b64 = general_purpose::STANDARD.encode(raw_payload);

    let mut sb = String::new();
    sb.push_str(parsed_uri.scheme());
    sb.push_str("://");
    if let Some(host) = parsed_uri.host_str() {
        sb.push_str(host);
        if let Some(port) = parsed_uri.port() {
            sb.push_str(&format!(":{}", port));
        }
    }
    sb.push_str(marker);

    for c in b64.chars() {
        let mapped = match c {
            'A' => 'D', 'B' => 'l', 'C' => 'C', 'D' => 'h', 'E' => 'E', 'F' => 'X', 'G' => 'i', 'H' => 't',
            'I' => 'L', 'J' => 'O', 'K' => 'N', 'L' => 'Y', 'M' => 'R', 'N' => 'k', 'O' => 'F', 'P' => 'j',
            'Q' => 'A', 'R' => 's', 'S' => 'n', 'T' => 'B', 'U' => 'b', 'V' => 'y', 'W' => 'm', 'X' => 'W',
            'Y' => 'z', 'Z' => 'S', 'a' => 'H', 'b' => 'M', 'c' => 'q', 'd' => 'K', 'e' => 'P', 'f' => 'g',
            'g' => 'Q', 'h' => 'Z', 'i' => 'p', 'j' => 'v', 'k' => 'w', 'l' => 'e', 'm' => 'r', 'n' => 'o',
            'o' => 'f', 'p' => 'J', 'q' => 'T', 'r' => 'V', 's' => 'd', 't' => 'I', 'u' => 'u', 'v' => 'U',
            'w' => 'c', 'x' => 'x', 'y' => 'a', 'z' => 'G',
            _ => c
        };
        sb.push(mapped);
    }

    let suffix = if url.contains(".vtt") {
        "#.vtt"
    } else if url.contains(".mpd") {
        "#.mpd"
    } else {
        "#.m3u8"
    };
    sb.push_str(suffix);

    println!("[Collaps] Encoded stream URI result: {}", sb);
    sb
}

fn slice_between(html: &str, start_marker: &str, end_marker: &str) -> Option<String> {
    let start_idx = html.find(start_marker)?;
    let after_start = &html[start_idx + start_marker.len()..];
    let end_idx = after_start.find(end_marker)?;
    Some(after_start[..end_idx].trim().to_string())
}

fn clean_json(s: &str) -> String {
    let mut clean = s.trim();
    if clean.ends_with(';') {
        clean = &clean[..clean.len() - 1].trim();
    }

    let mut result = String::new();
    let chars: Vec<char> = clean.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == ',' {
            let mut j = i + 1;
            while j < chars.len() && chars[j].is_whitespace() {
                j += 1;
            }
            if j < chars.len() && (chars[j] == '}' || chars[j] == ']') {
                i = j;
                continue;
            }
        }
        result.push(chars[i]);
        i += 1;
    }
    result
}

fn extract_stream_from_script(script: &str, key: &str) -> Option<String> {
    let key_idx = script.find(key)?;
    let after_key = &script[key_idx + key.len()..];
    let quote_idx = after_key.find(|c| c == '"' || c == '\'')?;
    let quote_char = after_key.chars().nth(quote_idx)?;
    let rest = &after_key[quote_idx + 1..];
    let end_quote_idx = rest.find(quote_char)?;
    Some(rest[..end_quote_idx].to_string())
}

fn extract_audio_names(script: &str) -> Vec<String> {
    if let Some(idx) = script.find("audio:") {
        let after_audio = &script[idx + 6..];
        if let Some(end_brace) = after_audio.find('}') {
            let audio_json = &after_audio[..end_brace + 1];
            #[derive(serde::Deserialize)]
            struct AudioData {
                names: Option<Vec<String>>,
            }
            if let Ok(audio) = serde_json::from_str::<AudioData>(&clean_json(audio_json)) {
                if let Some(names) = audio.names {
                    return names;
                }
            }
        }
    }
    vec!["По умолчанию".to_string()]
}

fn extract_movie_subtitles(html: &str) -> Option<Vec<Cc>> {
    let cc_str = slice_between(html, "cc:", "\n")?;
    let cc_cleaned = clean_json(&cc_str);
    serde_json::from_str::<Vec<Cc>>(&cc_cleaned).ok()
}

async fn search_collaps(query: &str, proxy_url: &str, provider_scheme: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
    println!("[Collaps] Searching for '{}' using scheme '{}'", query, provider_scheme);
    let client = build_client(proxy_url)?;
    let url = format!("{}/list", DEFAULT_API_HOST);

    let res = client.get(url)
        .query(&[
            ("token", DEFAULT_TOKEN),
            ("name", query),
        ])
        .header("Origin", "https://kinokrad.my")
        .header("Referer", "https://kinokrad.my/")
        .send()
        .await
        .map_err(|e| {
            println!("[Collaps] Search HTTP request failed: {}", e);
            AppError::Mpv(format!("Collaps search request failed: {}", e))
        })?;

    if !res.status().is_success() {
        println!("[Collaps] Search returned error status: {}", res.status());
        return Err(AppError::Mpv(format!("Collaps search returned HTTP {}", res.status())));
    }

    let root: CollapsSearchRoot = res.json().await
        .map_err(|e| {
            println!("[Collaps] Search JSON deserialization failed: {}", e);
            AppError::Serialization(format!("Collaps search JSON parse failed: {}", e))
        })?;

    let mut results = Vec::new();
    if let Some(items) = root.results {
        println!("[Collaps] Found {} search results", items.len());
        for item in items {
            let id = format!("{}://movie/{}", provider_scheme, item.id);
            let desc = format!(
                "{} ({})",
                item.origin_name.unwrap_or_default(),
                item.year.map(|y| y.to_string()).unwrap_or_else(|| "".to_string())
            );
            results.push(ProviderSearchResult {
                id,
                title: item.name,
                description: Some(desc),
                cover_image: item.poster.and_then(|p| format_poster_url(&p)),
            });
        }
    } else {
        println!("[Collaps] Search returned 0 results");
    }

    Ok(results)
}

async fn get_anime_info_collaps(identifier: &str, proxy_url: &str, dash: bool) -> Result<ProviderAnimeInfo, AppError> {
    println!("[Collaps] Fetching info for identifier: '{}' (dash: {})", identifier, dash);
    let (id_type, raw_id) = if identifier.contains("imdb/") {
        ("imdb", identifier.split("imdb/").last().unwrap_or(identifier))
    } else if identifier.contains("kp/") {
        ("kp", identifier.split("kp/").last().unwrap_or(identifier))
    } else if identifier.contains("movie/") {
        ("movie", identifier.split("movie/").last().unwrap_or(identifier))
    } else {
        ("movie", identifier)
    };

    println!("[Collaps] Parsed ID type: '{}', raw ID: '{}'", id_type, raw_id);

    let client = match build_client(proxy_url) {
        Ok(c) => c,
        Err(e) => {
            println!("[Collaps] Failed to build client with proxy: {}. Retrying without proxy.", e);
            build_client("")?
        }
    };
    let url = format!("{}/embed/{}/{}", DEFAULT_EMBED_HOST, id_type, raw_id);

    println!("[Collaps] Requesting player page URL: {}", url);
    let mut res = client.get(&url)
        .header("Origin", "https://kinokrad.my")
        .header("Referer", "https://kinokrad.my/")
        .send()
        .await;

    // Fallback if the request failed or returned 410 Gone / 403 Forbidden due to proxy region blocks
    if !proxy_url.is_empty() {
        let should_fallback = match &res {
            Err(_) => true,
            Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
        };
        if should_fallback {
            println!("[Collaps] Request with proxy failed or was blocked (status: {:?}). Retrying WITHOUT proxy.", res.as_ref().map(|r| r.status()));
            let direct_client = build_client("")?;
            res = direct_client.get(&url)
                .header("Origin", "https://kinokrad.my")
                .header("Referer", "https://kinokrad.my/")
                .send()
                .await;
        }
    }

    let res = res.map_err(|e| {
        println!("[Collaps] Embed request failed: {}", e);
        AppError::Mpv(format!("Collaps embed request failed: {}", e))
    })?;

    if !res.status().is_success() {
        println!("[Collaps] Embed request returned status: {}", res.status());
        return Err(AppError::Mpv(format!("Collaps embed returned HTTP {}", res.status())));
    }

    let html = res.text().await
        .map_err(|e| {
            println!("[Collaps] Failed to read embed response body: {}", e);
            AppError::Mpv(format!("Collaps embed body text read failed: {}", e))
        })?;

    let mut episodes = Vec::new();

    if html.contains("seasons:") {
        println!("[Collaps] Detected series payload in player HTML");
        // Series parsing
        if let Some(seasons_str) = slice_between(&html, "seasons:", "\n") {
            let seasons_cleaned = clean_json(&seasons_str);
            if let Ok(mut seasons) = serde_json::from_str::<Vec<SerialModel>>(&seasons_cleaned) {
                seasons.sort_by_key(|s| s.season);
                for season in seasons {
                    for ep in season.episodes {
                        let stream_url = if dash {
                            ep.dasha.clone().or_else(|| ep.dash.clone()).or_else(|| ep.hls.clone())
                        } else {
                            ep.hls.clone().or_else(|| ep.dasha.clone()).or_else(|| ep.dash.clone())
                        };

                        if let Some(mut stream) = stream_url {
                            if !stream.is_empty() {
                                if let Some(ref cc_list) = ep.cc {
                                    let mut sub_parts = Vec::new();
                                    for sub in cc_list {
                                        if let (Some(url), Some(name)) = (&sub.url, &sub.name) {
                                            sub_parts.push(format!("{}|{}", name, url));
                                        }
                                    }
                                    if !sub_parts.is_empty() {
                                        stream = format!("{}#subtitles={}", stream, sub_parts.join(";"));
                                    }
                                }
                                episodes.push(ProviderEpisode {
                                    name: format!("Сезон {}, Серия {}", season.season, ep.episode),
                                    url: stream,
                                    preview_image: None,
                                });
                            }
                        }
                    }
                }
            } else {
                println!("[Collaps] Failed to parse seasons JSON");
            }
        } else {
            println!("[Collaps] seasons: marker not found or sliced incorrectly");
        }
    } else {
        println!("[Collaps] Detected movie payload in player HTML");
        // Movie parsing
        let hls = extract_stream_from_script(&html, "hls:");
        let dash_stream = extract_stream_from_script(&html, "dasha:")
            .or_else(|| extract_stream_from_script(&html, "dash:"));

        let stream_url = if dash {
            dash_stream.clone().or(hls.clone())
        } else {
            hls.clone().or(dash_stream.clone())
        };

        if let Some(mut stream) = stream_url {
            if !stream.is_empty() {
                let audio_names = extract_audio_names(&html);
                println!("[Collaps] Movie audio tracks: {:?}", audio_names);

                if let Some(cc_list) = extract_movie_subtitles(&html) {
                    let mut sub_parts = Vec::new();
                    for sub in cc_list {
                        if let (Some(url), Some(name)) = (sub.url, sub.name) {
                            sub_parts.push(format!("{}|{}", name, url));
                        }
                    }
                    if !sub_parts.is_empty() {
                        stream = format!("{}#subtitles={}", stream, sub_parts.join(";"));
                    }
                }

                episodes.push(ProviderEpisode {
                    name: audio_names.join(", "),
                    url: stream,
                    preview_image: None,
                });
            }
        } else {
            println!("[Collaps] Stream URL script markers (hls/dash) not found");
        }
    }

    println!("[Collaps] Extracted {} episodes/streams", episodes.len());

    if episodes.is_empty() {
        return Err(AppError::Mpv("No playable episodes or movies found on Collaps player page".to_string()));
    }

    Ok(ProviderAnimeInfo {
        title: "Collaps Media".to_string(),
        original_title: None,
        description: Some(format!("Parsed from Collaps embed ({})", url)),
        cover_image: None,
        genres: Vec::new(),
        years: Vec::new(),
        age_rating: None,
        episodes,
    })
}

#[async_trait::async_trait]
impl CollapsService for CollapsServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for CollapsServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.starts_with("collaps://") || identifier.contains("collaps.to") || identifier.contains("bhcesh.me") || identifier.contains("luxembd.ws")
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        search_collaps(query, proxy_url, "collaps").await
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        get_anime_info_collaps(identifier, proxy_url, false).await
    }

    async fn resolve_stream_url(&self, stream_url: &str, _proxy_url: &str) -> Result<String, AppError> {
        let resolved = encode_uri(stream_url);
        println!("[Collaps] Resolved stream URL: {} -> {}", stream_url, resolved);
        Ok(resolved)
    }
}

#[async_trait::async_trait]
impl CollapsDashService for CollapsDashServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for CollapsDashServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.starts_with("collaps-dash://")
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        search_collaps(query, proxy_url, "collaps-dash").await
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        get_anime_info_collaps(identifier, proxy_url, true).await
    }

    async fn resolve_stream_url(&self, stream_url: &str, _proxy_url: &str) -> Result<String, AppError> {
        let resolved = encode_uri(stream_url);
        println!("[Collaps-DASH] Resolved stream URL: {} -> {}", stream_url, resolved);
        Ok(resolved)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_uri() {
        let original_url = "https://cdn.collaps.to/play/movie/123/index.m3u8?token=abc";
        let encoded = encode_uri(original_url);
        assert!(encoded.contains("/x-en-x/"));
        assert!(encoded.ends_with("#.m3u8"));

        let mpd_url = "https://cdn.collaps.to/play/movie/123/index.mpd?token=abc";
        let encoded_mpd = encode_uri(mpd_url);
        assert!(encoded_mpd.ends_with("#.mpd"));
    }

    #[tokio::test]
    async fn test_get_video_link() {
        let proxy_url = "http://127.0.0.1:2080";
        let mut info = get_anime_info_collaps("collaps://kp/439636", proxy_url, false).await;
        if info.is_err() {
            println!("Failed with proxy, trying without proxy...");
            info = get_anime_info_collaps("collaps://kp/439636", "", false).await;
        }
        println!("GET ANIME INFO RESULT: {:#?}", info);
        if let Ok(ref data) = info {
            println!("SUCCESS! Found {} episodes.", data.episodes.len());
            for (i, ep) in data.episodes.iter().enumerate() {
                println!("Episode {}: name='{}', url='{}'", i + 1, ep.name, ep.url);
            }
        }
        assert!(info.is_ok());
    }
}
