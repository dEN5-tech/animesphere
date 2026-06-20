use shaku::Component;
use reqwest::Proxy;
use base64::{Engine as _, engine::general_purpose};
use crate::error::AppError;
use super::{ContentProvider, ProviderAnimeInfo, ProviderSearchResult, ProviderEpisode};

const DEFAULT_API_HOST: &str = "https://kodik-api.com";
const DEFAULT_TOKEN: &str = "41dd95f84c21719b09d6c71182237a25";

#[derive(Component)]
#[shaku(interface = crate::services::KodikService)]
pub struct KodikServiceImpl {}

#[derive(serde::Deserialize, Debug, Clone)]
struct Translation {
    title: Option<String>,
}

#[derive(serde::Deserialize, Debug, Clone)]
struct MaterialData {
    poster_url: Option<String>,
    drama_poster_url: Option<String>,
    anime_poster_url: Option<String>,
}

#[derive(serde::Deserialize, Debug, Clone)]
struct Season {
    link: Option<String>,
    episodes: Option<std::collections::BTreeMap<String, String>>,
}

#[derive(serde::Deserialize, Debug, Clone)]
struct KodikResult {
    id: String,
    title: Option<String>,
    title_orig: Option<String>,
    #[serde(rename = "type")]
    item_type: Option<String>,
    link: Option<String>,
    translation: Option<Translation>,
    seasons: Option<std::collections::BTreeMap<String, Season>>,
    material_data: Option<MaterialData>,
    year: Option<i32>,
}

#[derive(serde::Deserialize, Debug, Clone)]
struct KodikSearchResponse {
    results: Option<Vec<KodikResult>>,
}

#[derive(serde::Deserialize, Debug, Clone)]
struct KodikLinkItem {
    src: String,
    #[serde(rename = "type")]
    link_type: Option<String>,
}

#[derive(serde::Deserialize, Debug, Clone)]
struct KodikPostResponse {
    links: std::collections::HashMap<String, Vec<KodikLinkItem>>,
}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert("Referer", reqwest::header::HeaderValue::from_static("https://anilib.me/"));

    let builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .default_headers(headers)
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

pub fn rot18(s: &str) -> String {
    s.chars().map(|c| {
        if c.is_ascii_alphabetic() {
            let base = if c.is_ascii_uppercase() { b'A' } else { b'a' };
            let shifted = (c as u8 - base + 18) % 26 + base;
            shifted as char
        } else {
            c
        }
    }).collect()
}

pub fn decode_base64(s: &str) -> Result<String, AppError> {
    let clean = s.replace('-', "+").replace('_', "/");
    let mut clean = clean.trim().to_string();
    while clean.len() % 4 != 0 {
        clean.push('=');
    }
    let bytes = general_purpose::STANDARD.decode(clean)
        .map_err(|e| AppError::Serialization(format!("Base64 decode failed: {}", e)))?;
    String::from_utf8(bytes)
        .map_err(|e| AppError::Serialization(format!("UTF8 decode failed: {}", e)))
}

fn get_var_clean(html: &str, var_name: &str) -> Option<String> {
    let patterns = [
        format!("{} = \"", var_name),
        format!("{} = '", var_name),
        format!("{} =\"", var_name),
        format!("{} ='", var_name),
        format!("{}=\"", var_name),
        format!("{}=\'", var_name),
        format!("{}\":\"", var_name),
        format!("{}:'", var_name),
        format!("{}:\"", var_name),
        format!("{} : '", var_name),
        format!("{} : \"", var_name),
    ];
    for p in &patterns {
        let mut start_idx = 0;
        while let Some(idx) = html[start_idx..].find(p) {
            let absolute_idx = start_idx + idx;
            let is_word_boundary = if absolute_idx > 0 {
                let prev_char = html.as_bytes()[absolute_idx - 1] as char;
                !prev_char.is_alphanumeric() && prev_char != '_'
            } else {
                true
            };

            if is_word_boundary {
                let start = absolute_idx + p.len();
                let rest = &html[start..];
                let quote = if p.contains('\'') { '\'' } else { '"' };
                if let Some(end) = rest.find(quote) {
                    return Some(rest[..end].to_string());
                }
            }
            start_idx = absolute_idx + 1;
        }
    }
    None
}

fn get_player_single(html: &str) -> Option<String> {
    if let Some(idx) = html.find("/assets/js/app.player_") {
        let rest = &html[idx..];
        if let Some(end) = rest.find('"').or_else(|| rest.find('\'')) {
            return Some(rest[1..end].to_string()); // trim leading slash
        }
    }
    None
}

fn get_atob_post_url(js: &str) -> Option<String> {
    if let Some(idx) = js.find("url:atob(\"") {
        let rest = &js[idx + 10..];
        if let Some(end) = rest.find('"') {
            return Some(rest[..end].to_string());
        }
    }
    if let Some(idx) = js.find("url:atob('") {
        let rest = &js[idx + 10..];
        if let Some(end) = rest.find('\'') {
            return Some(rest[..end].to_string());
        }
    }
    None
}

fn parse_number(s: &str) -> i32 {
    s.chars().filter(|c| c.is_ascii_digit()).collect::<String>().parse::<i32>().unwrap_or(0)
}

#[async_trait::async_trait]
impl crate::services::KodikService for KodikServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for KodikServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.starts_with("kodik://") || identifier.contains("kodik.info") || identifier.contains("kodikplayer.com")
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let client = build_client(proxy_url)?;
        let url = format!("{}/search", DEFAULT_API_HOST);

        let mut res = client.get(&url)
            .query(&[
                ("token", DEFAULT_TOKEN),
                ("title", query),
                ("limit", "100"),
                ("with_material_data", "true"),
                ("with_episodes", "true"),
            ])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[Kodik] Search request with proxy failed or was blocked (status: {:?}). Retrying WITHOUT proxy.", res.as_ref().map(|r| r.status()));
                let direct_client = build_client("")?;
                res = direct_client.get(&url)
                    .query(&[
                        ("token", DEFAULT_TOKEN),
                        ("title", query),
                        ("limit", "100"),
                        ("with_material_data", "true"),
                        ("with_episodes", "true"),
                    ])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Kodik search request failed: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("Kodik search returned HTTP {}", res.status())));
        }

        let search_response: KodikSearchResponse = res.json().await
            .map_err(|e| AppError::Serialization(format!("Kodik search JSON parse failed: {}", e)))?;

        let mut results = Vec::new();
        if let Some(items) = search_response.results {
            for item in items {
                let id = format!("kodik://{}", item.id);
                let desc = format!(
                    "{} ({}) [{}]",
                    item.title_orig.clone().unwrap_or_default(),
                    item.year.map(|y| y.to_string()).unwrap_or_else(|| "".to_string()),
                    item.translation.and_then(|t| t.title).unwrap_or_else(|| "Оригинал".to_string())
                );
                let cover = item.material_data.and_then(|m| {
                    m.poster_url.or(m.anime_poster_url).or(m.drama_poster_url)
                }).map(|c| if c.starts_with("//") { format!("https:{}", c) } else { c });

                results.push(ProviderSearchResult {
                    id,
                    title: item.title.unwrap_or_else(|| item.title_orig.unwrap_or_else(|| "Kodik Media".to_string())),
                    description: Some(desc),
                    cover_image: cover,
                });
            }
        }

        Ok(results)
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let raw_id = identifier.trim_start_matches("kodik://");
        let client = build_client(proxy_url)?;
        let url = format!("{}/search", DEFAULT_API_HOST);

        let mut res = client.get(&url)
            .query(&[
                ("token", DEFAULT_TOKEN),
                ("id", raw_id),
                ("with_material_data", "true"),
                ("with_episodes", "true"),
            ])
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[Kodik] Detail fetch request with proxy failed or was blocked (status: {:?}). Retrying WITHOUT proxy.", res.as_ref().map(|r| r.status()));
                let direct_client = build_client("")?;
                res = direct_client.get(&url)
                    .query(&[
                        ("token", DEFAULT_TOKEN),
                        ("id", raw_id),
                        ("with_material_data", "true"),
                        ("with_episodes", "true"),
                    ])
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Kodik detail fetch request failed: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("Kodik detail returned HTTP {}", res.status())));
        }

        let search_response: KodikSearchResponse = res.json().await
            .map_err(|e| AppError::Serialization(format!("Kodik detail JSON parse failed: {}", e)))?;

        let item = search_response.results
            .and_then(|r| r.into_iter().next())
            .ok_or_else(|| AppError::Mpv(format!("No Kodik results found for ID: {}", raw_id)))?;

        let title = item.title.clone().unwrap_or_else(|| item.title_orig.clone().unwrap_or_else(|| "Kodik Media".to_string()));
        let original_title = item.title_orig.clone();
        let cover_image = item.material_data.as_ref().and_then(|m| {
            m.poster_url.clone().or_else(|| m.anime_poster_url.clone()).or_else(|| m.drama_poster_url.clone())
        }).map(|c| if c.starts_with("//") { format!("https:{}", c) } else { c });

        let mut episodes = Vec::new();

        if let Some(seasons_map) = item.seasons {
            for (season_num, season) in seasons_map {
                if let Some(episodes_map) = season.episodes {
                    for (episode_num, link) in episodes_map {
                        episodes.push(ProviderEpisode {
                            name: format!("Сезон {}, Серия {}", season_num, episode_num),
                            url: if link.starts_with("//") { format!("https:{}", link) } else { link },
                            preview_image: None,
                        });
                    }
                }
            }
            episodes.sort_by(|a, b| {
                let s_a = parse_number(a.name.split(',').next().unwrap_or(""));
                let s_b = parse_number(b.name.split(',').next().unwrap_or(""));
                if s_a != s_b {
                    s_a.cmp(&s_b)
                } else {
                    let ep_a = parse_number(a.name.split(',').nth(1).unwrap_or(""));
                    let ep_b = parse_number(b.name.split(',').nth(1).unwrap_or(""));
                    ep_a.cmp(&ep_b)
                }
            });
        } else if let Some(link) = item.link {
            episodes.push(ProviderEpisode {
                name: "Фильм / Просмотр".to_string(),
                url: if link.starts_with("//") { format!("https:{}", link) } else { link },
                preview_image: None,
            });
        }

        Ok(ProviderAnimeInfo {
            title,
            original_title,
            description: None,
            cover_image,
            genres: Vec::new(),
            years: item.year.map(|y| vec![y.to_string()]).unwrap_or_default(),
            age_rating: None,
            episodes,
        })
    }

    async fn resolve_stream_url(&self, stream_url: &str, proxy_url: &str) -> Result<String, AppError> {
        let mut client = build_client(proxy_url)?;
        let mut using_proxy = !proxy_url.is_empty();
        let url = if stream_url.starts_with("//") {
            format!("https:{}", stream_url)
        } else {
            stream_url.to_string()
        };

        let parsed_url = reqwest::Url::parse(&url)
            .map_err(|e| AppError::Mpv(format!("Failed to parse stream URL: {}", e)))?;
        let domain = parsed_url.host_str().unwrap_or("kodik.info");
        let scheme = parsed_url.scheme();
        let base_host = format!("{}://{}", scheme, domain);

        // 1. Fetch player embed HTML page
        let mut res = client.get(&url).send().await;

        if using_proxy {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[Kodik] Player page fetch with proxy failed or was blocked. Retrying WITHOUT proxy.");
                client = build_client("")?;
                using_proxy = false;
                res = client.get(&url).send().await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("Failed to fetch player page: {}", e)))?;

        let html = res.text().await
            .map_err(|e| AppError::Mpv(format!("Failed to read player HTML: {}", e)))?;

        let player_single = get_player_single(&html)
            .ok_or_else(|| AppError::Mpv("Failed to locate player JS asset path".to_string()))?;

        let domain_var = get_var_clean(&html, "domain")
            .ok_or_else(|| AppError::Mpv("Failed to locate domain token in player HTML".to_string()))?;
        let d_sign = get_var_clean(&html, "d_sign").unwrap_or_default();
        let pd = get_var_clean(&html, "pd").unwrap_or_default();
        let pd_sign = get_var_clean(&html, "pd_sign").unwrap_or_default();
        let ref_domain = get_var_clean(&html, "ref").unwrap_or_default();
        let ref_sign = get_var_clean(&html, "ref_sign").unwrap_or_default();
        let item_type = get_var_clean(&html, "type")
            .ok_or_else(|| AppError::Mpv("Failed to locate media type in player HTML".to_string()))?;
        let hash = get_var_clean(&html, "hash")
            .ok_or_else(|| AppError::Mpv("Failed to locate media hash in player HTML".to_string()))?;
        let id = get_var_clean(&html, "id")
            .ok_or_else(|| AppError::Mpv("Failed to locate media ID in player HTML".to_string()))?;

        // 2. Fetch JS file to extract POST route
        let js_url = format!("{}/{}", base_host, player_single);
        let mut js_res = client.get(&js_url).send().await;

        if using_proxy {
            let should_fallback = match &js_res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[Kodik] Player JS fetch with proxy failed or was blocked. Retrying WITHOUT proxy.");
                client = build_client("")?;
                using_proxy = false;
                js_res = client.get(&js_url).send().await;
            }
        }

        let js_res = js_res.map_err(|e| AppError::Mpv(format!("Failed to fetch player JS: {}", e)))?;

        let js = js_res.text().await
            .map_err(|e| AppError::Mpv(format!("Failed to read player JS: {}", e)))?;

        let b64_post_uri = get_atob_post_url(&js)
            .ok_or_else(|| AppError::Mpv("Failed to locate post url token in player JS".to_string()))?;

        let post_uri = decode_base64(&b64_post_uri)?;

        // 3. Make POST request to obtain stream links
        let post_url = format!("{}{}", base_host, post_uri);
        let post_body = format!(
            "d={}&d_sign={}&pd={}&pd_sign={}&ref={}&ref_sign={}&bad_user=false&cdn_is_working=true&type={}&hash={}&id={}&info=%7B%7D",
            domain_var, d_sign, pd, pd_sign, ref_domain, ref_sign, item_type, hash, id
        );

        let mut links_res = client.post(&post_url)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header("X-Requested-With", "XMLHttpRequest")
            .body(post_body.clone())
            .send()
            .await;

        if using_proxy {
            let should_fallback = match &links_res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[Kodik] Stream links request with proxy failed or was blocked. Retrying WITHOUT proxy.");
                client = build_client("")?;
                links_res = client.post(&post_url)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("X-Requested-With", "XMLHttpRequest")
                    .body(post_body)
                    .send()
                    .await;
            }
        }

        let links_res = links_res.map_err(|e| AppError::Mpv(format!("Failed to request stream details: {}", e)))?;

        let links_response: KodikPostResponse = links_res.json().await
            .map_err(|e| AppError::Serialization(format!("Stream details parse failed: {}", e)))?;

        // 4. Resolve the highest quality HLS stream
        let mut final_url = None;
        let qualities = ["1080", "720", "480", "360"];
        for q in &qualities {
            if let Some(items) = links_response.links.get(*q) {
                if let Some(item) = items.first() {
                    let mut src = item.src.clone();
                    if !src.contains("manifest.m3u8") {
                        let deciphered = rot18(&src);
                        if let Ok(decoded) = decode_base64(&deciphered) {
                            src = decoded;
                        }
                    }
                    if src.starts_with("//") {
                        src = format!("https:{}", src);
                    }
                    final_url = Some(src);
                    break;
                }
            }
        }

        if let Some(res_url) = final_url {
            Ok(res_url)
        } else {
            // Fallback: search for any links
            for items in links_response.links.values() {
                if let Some(item) = items.first() {
                    let mut src = item.src.clone();
                    if !src.contains("manifest.m3u8") {
                        let deciphered = rot18(&src);
                        if let Ok(decoded) = decode_base64(&deciphered) {
                            src = decoded;
                        }
                    }
                    if src.starts_with("//") {
                        src = format!("https:{}", src);
                    }
                    return Ok(src);
                }
            }
            Err(AppError::Mpv("No streams found in Kodik player API response".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rot18() {
        assert_eq!(rot18("A"), "S");
        assert_eq!(rot18("Z"), "R");
        assert_eq!(rot18("a"), "s");
        assert_eq!(rot18("z"), "r");
    }

    #[test]
    fn test_decode_base64() {
        assert_eq!(decode_base64("L2dzdQ==").unwrap(), "/gsu");
    }
}
