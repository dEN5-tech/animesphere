use shaku::Component;
use crate::error::AppError;
use super::{ShikimoriService, ContentProvider, ProviderAnimeInfo, ProviderSearchResult};
use reqwest::Proxy;

const SHIKIMORI_BASE: &str = "https://shikimori.one";

#[derive(Component)]
#[shaku(interface = ShikimoriService)]
pub struct ShikimoriServiceImpl {}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let builder = reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
        );

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

/// Extract the numeric Shikimori ID from an anime URL.
/// e.g. "https://shikimori.one/animes/z20-naruto" → "20"
#[allow(dead_code)]
fn extract_shikimori_id(url: &str) -> String {
    let segment = url.split('/').last().unwrap_or(url);
    // Remove leading non-digit chars (like 'z')
    let digits: String = segment.chars().skip_while(|c| !c.is_ascii_digit()).take_while(|c| c.is_ascii_digit()).collect();
    digits
}

#[async_trait::async_trait]
impl ShikimoriService for ShikimoriServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for ShikimoriServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.contains("shikimori.one")
            || identifier.contains("shikimori.io")
            || identifier.starts_with("shikimori://")
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let client = build_client(proxy_url)?;

        let res = client
            .get(format!("{}/animes/autocomplete/v2", SHIKIMORI_BASE))
            .query(&[("search", query)])
            .header("Accept", "application/json, text/plain, */*")
            .header("X-Requested-With", "XMLHttpRequest")
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Shikimori search request failed: {}", e)))?;

        if res.status().as_u16() == 429 {
            return Err(AppError::Mpv(
                "Shikimori returned 429 — too many requests, slow down.".into(),
            ));
        }
        if !res.status().is_success() {
            return Err(AppError::Mpv(format!(
                "Shikimori returned HTTP {}",
                res.status()
            )));
        }

        let json_body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| AppError::Serialization(format!("Shikimori search JSON parse failed: {}", e)))?;

        let html_content = json_body
            .get("content")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        // Parse HTML in a scoped block so scraper's non-Send types don't cross .await
        let results = {
            let doc = scraper::Html::parse_fragment(&html_content);
            let item_sel = scraper::Selector::parse("div.b-db_entry-variant-list_item").unwrap();
            let img_sel  = scraper::Selector::parse("div.image picture img").unwrap();
            let name_sel = scraper::Selector::parse("div.info div.name a").unwrap();

            let mut results: Vec<ProviderSearchResult> = Vec::new();

            for item in doc.select(&item_sel) {
                // Only anime entries
                if item.value().attr("data-type") != Some("anime") {
                    continue;
                }

                let data_url = item.value().attr("data-url").unwrap_or("").to_string();
                if data_url.is_empty() {
                    continue;
                }

                // Build full URL
                let full_url = if data_url.starts_with("http") {
                    data_url.clone()
                } else {
                    format!("{}{}", SHIKIMORI_BASE, data_url)
                };

                // Title: text before first '/' in the link text
                let title = item.select(&name_sel).next()
                    .map(|el| {
                        let raw = el.text().collect::<String>();
                        raw.split('/').next().unwrap_or(&raw).trim().to_string()
                    })
                    .unwrap_or_default();

                // Original title: `title` attribute of the anchor
                let original_title = item.select(&name_sel).next()
                    .and_then(|el| el.value().attr("title").map(|s| s.to_string()));

                // Poster
                let cover_image = item.select(&img_sel).next()
                    .and_then(|img| {
                        img.value().attr("srcset")
                            .map(|s| s.replace(" 2x", ""))
                    });

                results.push(ProviderSearchResult {
                    id: full_url,
                    title,
                    description: original_title,
                    cover_image,
                });
            }
            results
        };

        Ok(results)
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let client = build_client(proxy_url)?;

        let anime_url = if identifier.starts_with("http") {
            identifier.to_string()
        } else {
            format!("{}/animes/{}", SHIKIMORI_BASE, identifier)
        };

        let res = client
            .get(&anime_url)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Shikimori page fetch failed: {}", e)))?;

        if res.status().as_u16() == 429 {
            return Err(AppError::Mpv("Shikimori returned 429 — too many requests.".into()));
        }
        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("Shikimori returned HTTP {}", res.status())));
        }

        let html = res
            .text()
            .await
            .map_err(|e| AppError::Mpv(format!("Shikimori page text fetch failed: {}", e)))?;

        // Parse all needed data before any subsequent .await
        let info = {
            let doc = scraper::Html::parse_document(&html);

            // Title: <header class="head"><h1>Russian / Original</h1>
            let header_sel = scraper::Selector::parse("header.head h1").unwrap();
            let (title, original_title) = doc.select(&header_sel).next()
                .map(|el| {
                    let text = el.text().collect::<String>();
                    let mut parts = text.splitn(2, " / ");
                    let ru = parts.next().unwrap_or("").trim().to_string();
                    let en = parts.next().map(|s| s.trim().to_string());
                    (ru, en)
                })
                .unwrap_or_default();

            // Cover image
            let pic_sel = scraper::Selector::parse("picture img").unwrap();
            let cover_image = doc.select(&pic_sel).next()
                .and_then(|img| img.value().attr("srcset").map(|s| s.replace(" 2x", "")));

            // Info block
            let line_sel = scraper::Selector::parse("div.c-info-left div.block div.line").unwrap();
            let key_sel  = scraper::Selector::parse("div.key").unwrap();
            let val_sel  = scraper::Selector::parse("div.value").unwrap();
            let genre_sel = scraper::Selector::parse("span.genre-ru").unwrap();

            let mut genres: Vec<String> = Vec::new();
            let mut years:  Vec<String> = Vec::new();
            let mut age_rating: Option<String> = None;

            for line in doc.select(&line_sel) {
                let key = line.select(&key_sel).next()
                    .map(|k| k.text().collect::<String>())
                    .unwrap_or_default();
                let key = key.trim();

                if key == "Жанры:" || key == "Темы:" || key == "Тема:" {
                    for g in line.select(&genre_sel) {
                        genres.push(g.text().collect::<String>().trim().to_string());
                    }
                } else if key == "Рейтинг:" {
                    age_rating = line.select(&val_sel).next()
                        .map(|v| v.text().collect::<String>().trim().to_string());
                }
            }

            // Year: look for b-tag elements or dates in the page
            let btag_sel = scraper::Selector::parse("div.b-tag").unwrap();
            for tag in doc.select(&btag_sel) {
                let txt = tag.text().collect::<String>();
                let txt = txt.trim();
                // 4-digit year
                if txt.len() == 4 && txt.chars().all(|c| c.is_ascii_digit()) && !years.contains(&txt.to_string()) {
                    years.push(txt.to_string());
                }
            }

            // Description
            let desc_sel = scraper::Selector::parse("div.text").unwrap();
            let description_txt = doc.select(&desc_sel).next()
                .map(|el| el.text().collect::<String>().trim().to_string());

            // Score
            let score_sel = scraper::Selector::parse("div.score-value").unwrap();
            let score = doc.select(&score_sel).next()
                .map(|el| el.text().collect::<String>().trim().to_string());

            let desc_with_score = match (description_txt, score) {
                (Some(d), Some(s)) => Some(format!("★ {} | {}", s, d)),
                (Some(d), None)    => Some(d),
                (None, Some(s))    => Some(format!("★ {}", s)),
                _                  => None,
            };

            (title, original_title, cover_image, genres, years, age_rating, desc_with_score)
        };

        let (title, original_title, cover_image, genres, years, age_rating, description) = info;

        // Shikimori is metadata-only — no video stream episodes
        Ok(ProviderAnimeInfo {
            title,
            original_title,
            description,
            cover_image,
            genres,
            years,
            age_rating,
            episodes: Vec::new(), // Shikimori doesn't provide stream URLs
        })
    }

    async fn resolve_stream_url(&self, stream_url: &str, _proxy_url: &str) -> Result<String, AppError> {
        // Shikimori has no video streams — pass through as-is
        Ok(stream_url.to_string())
    }
}
