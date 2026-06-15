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
impl ShikimoriService for ShikimoriServiceImpl {
    fn get_auth_url(&self, client_id: &str) -> String {
        format!(
            "{}/oauth/authorize?client_id={}&redirect_uri=http%3A%2F%2F127.0.0.1%3A50052%2F&response_type=code&scope=user_rates",
            SHIKIMORI_BASE,
            client_id
        )
    }

    async fn start_auth_flow(&self) -> Result<(), AppError> {
        let config = crate::services::config::load_config();
        if config.shikimori_client_id.trim().is_empty() || config.shikimori_client_secret.trim().is_empty() {
            return Err(AppError::Mpv("Пожалуйста, сначала укажите Client ID и Client Secret в настройках.".to_string()));
        }

        let auth_url = self.get_auth_url(&config.shikimori_client_id);

        // Bind listener on 50052
        let listener = std::net::TcpListener::bind("127.0.0.1:50052")
            .map_err(|e| AppError::Mpv(format!("Не удалось запустить локальный сервер на порту 50052: {}", e)))?;

        // Launch browser
        let _ = open::that(&auth_url);

        let mut auth_code = None;
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0; 2048];
            use std::io::Read;
            if let Ok(size) = stream.read(&mut buffer) {
                let request_str = String::from_utf8_lossy(&buffer[..size]);
                if let Some(code_idx) = request_str.find("code=") {
                    let after_code = &request_str[code_idx + 5..];
                    let code = after_code.split(|c: char| c.is_whitespace() || c == '&').next().unwrap_or("");
                    auth_code = Some(code.to_string());
                }
            }

            use std::io::Write;
            let response = "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\n\r\n\
                <html><body style='font-family: sans-serif; background: #09090b; color: #f4f4f5; text-align: center; padding: 50px;'>\
                <h1 style='color: #8b5cf6;'>AnimeSphere</h1>\
                <p>Авторизация в Shikimori успешно завершена! Вы можете закрыть эту вкладку.</p>\
                </body></html>";
            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
        }

        let Some(code) = auth_code else {
            return Err(AppError::Mpv("Не удалось получить код авторизации из браузера.".to_string()));
        };

        // Exchange code for tokens
        let client = build_client(&config.proxy_url)?;
        let params = [
            ("grant_type", "authorization_code"),
            ("client_id", &config.shikimori_client_id),
            ("client_secret", &config.shikimori_client_secret),
            ("code", &code),
            ("redirect_uri", "http://127.0.0.1:50052/"),
        ];

        let res = client.post("https://shikimori.one/oauth/token")
            .header("User-Agent", "AnimeSphere/1.0.0")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Запрос обмена токена завершился ошибкой: {}", e)))?;

        if !res.status().is_success() {
            let err_txt = res.text().await.unwrap_or_default();
            return Err(AppError::Mpv(format!("Ошибка Shikimori при обмене токена: {}", err_txt)));
        }

        let token_json: serde_json::Value = res.json().await
            .map_err(|e| AppError::Serialization(format!("Не удалось распарсить JSON токена: {}", e)))?;

        let access_token = token_json.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let refresh_token = token_json.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string();

        if access_token.is_empty() {
            return Err(AppError::Mpv("Получен пустой access_token от Shikimori.".to_string()));
        }

        let mut new_config = config.clone();
        new_config.shikimori_access_token = access_token;
        new_config.shikimori_refresh_token = refresh_token;
        crate::services::config::save_config(&new_config)
            .map_err(|e| AppError::Mpv(format!("Не удалось сохранить конфигурацию: {}", e)))?;

        Ok(())
    }

    async fn refresh_access_token(&self) -> Result<(), AppError> {
        let config = crate::services::config::load_config();
        if config.shikimori_refresh_token.trim().is_empty() {
            return Err(AppError::Mpv("Отсутствует refresh token. Необходим повторный вход.".to_string()));
        }

        let client = build_client(&config.proxy_url)?;
        let params = [
            ("grant_type", "refresh_token"),
            ("client_id", &config.shikimori_client_id),
            ("client_secret", &config.shikimori_client_secret),
            ("refresh_token", &config.shikimori_refresh_token),
        ];

        let res = client.post("https://shikimori.one/oauth/token")
            .header("User-Agent", "AnimeSphere/1.0.0")
            .form(&params)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Запрос обновления токена завершился ошибкой: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("Ошибка Shikimori при обновлении токена: HTTP {}", res.status())));
        }

        let token_json: serde_json::Value = res.json().await
            .map_err(|e| AppError::Serialization(format!("Не удалось распарсить JSON токена: {}", e)))?;

        let access_token = token_json.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let refresh_token = token_json.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string();

        if access_token.is_empty() {
            return Err(AppError::Mpv("Получен пустой access_token от Shikimori при обновлении.".to_string()));
        }

        let mut new_config = config.clone();
        new_config.shikimori_access_token = access_token;
        if !refresh_token.is_empty() {
            new_config.shikimori_refresh_token = refresh_token;
        }
        crate::services::config::save_config(&new_config)
            .map_err(|e| AppError::Mpv(format!("Не удалось сохранить конфигурацию: {}", e)))?;

        Ok(())
    }

    async fn get_user_profile(&self) -> Result<serde_json::Value, AppError> {
        let config = crate::services::config::load_config();
        if config.shikimori_access_token.trim().is_empty() {
            return Err(AppError::Mpv("No access token found".to_string()));
        }

        let client = build_client(&config.proxy_url)?;
        
        let fetch_profile = |token: &str| {
            let client = client.clone();
            let token = token.to_string();
            async move {
                client.get("https://shikimori.one/api/users/whoami")
                    .header("User-Agent", "AnimeSphere/1.0.0")
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await
            }
        };

        let mut res = fetch_profile(&config.shikimori_access_token).await
            .map_err(|e| AppError::Mpv(format!("whoami request failed: {}", e)))?;

        // Handle token expiration / 401 Unauthorized
        if res.status().as_u16() == 401 {
            println!("Shikimori returned 401. Attempting to refresh access token...");
            if self.refresh_access_token().await.is_ok() {
                let fresh_config = crate::services::config::load_config();
                res = fetch_profile(&fresh_config.shikimori_access_token).await
                    .map_err(|e| AppError::Mpv(format!("whoami retry request failed: {}", e)))?;
            }
        }

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("whoami returned HTTP {}", res.status())));
        }

        let profile: serde_json::Value = res.json().await
            .map_err(|e| AppError::Serialization(format!("Parse whoami JSON failed: {}", e)))?;
        Ok(profile)
    }

    async fn get_user_bookmarks(&self, limit: i32) -> Result<serde_json::Value, AppError> {
        let config = crate::services::config::load_config();
        if config.shikimori_access_token.trim().is_empty() {
            return Err(AppError::Mpv("No access token found".to_string()));
        }

        // Fetch user profile first to retrieve user ID
        let profile = self.get_user_profile().await?;
        let user_id = profile.get("id").and_then(|v| v.as_i64())
            .ok_or_else(|| AppError::Mpv("Failed to get user ID from profile".to_string()))?;

        let client = build_client(&config.proxy_url)?;
        let url = format!("https://shikimori.one/api/users/{}/anime_rates?limit={}", user_id, limit);

        let fetch_bookmarks = |token: &str| {
            let client = client.clone();
            let url = url.clone();
            let token = token.to_string();
            async move {
                client.get(&url)
                    .header("User-Agent", "AnimeSphere/1.0.0")
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await
            }
        };

        let mut res = fetch_bookmarks(&config.shikimori_access_token).await
            .map_err(|e| AppError::Mpv(format!("anime_rates request failed: {}", e)))?;

        // Handle token expiration / 401 Unauthorized
        if res.status().as_u16() == 401 {
            println!("Shikimori returned 401 for bookmarks. Attempting token refresh...");
            if self.refresh_access_token().await.is_ok() {
                let fresh_config = crate::services::config::load_config();
                res = fetch_bookmarks(&fresh_config.shikimori_access_token).await
                    .map_err(|e| AppError::Mpv(format!("anime_rates retry request failed: {}", e)))?;
            }
        }

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("anime_rates returned HTTP {}", res.status())));
        }

        let bookmarks: serde_json::Value = res.json().await
            .map_err(|e| AppError::Serialization(format!("Parse anime_rates JSON failed: {}", e)))?;
        Ok(bookmarks)
    }
}

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
