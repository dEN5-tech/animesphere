use shaku::Component;
use crate::error::AppError;
use super::{AnimegoService, ContentProvider, ProviderEpisode, ProviderAnimeInfo, ProviderSearchResult};
use reqwest::Proxy;

#[derive(Component)]
#[shaku(interface = AnimegoService)]
pub struct AnimegoServiceImpl {}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let client_builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
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

fn extract_anime_id(url: &str) -> Result<String, AppError> {
    let trimmed = url.trim_end_matches('/');
    if let Some(last_dash) = trimmed.rfind('-') {
        let id_part = &trimmed[last_dash + 1..];
        if id_part.chars().all(|c| c.is_ascii_digit()) && !id_part.is_empty() {
            return Ok(id_part.to_string());
        }
    }
    if let Some(last_slash) = trimmed.rfind('/') {
        let id_part = &trimmed[last_slash + 1..];
        if id_part.chars().all(|c| c.is_ascii_digit()) && !id_part.is_empty() {
            return Ok(id_part.to_string());
        }
    }
    Err(AppError::Mpv(format!("Could not extract AnimeGO ID from URL: {}", url)))
}

fn parse_episode_number_from_name(name: &str) -> i32 {
    let clean: String = name.chars().filter(|c| c.is_ascii_digit()).collect();
    clean.parse::<i32>().unwrap_or(0)
}

struct VoiceOption {
    label: String,
    player: String,
    embed: String,
    cvh_id: Option<String>,
}

#[derive(serde::Deserialize, Debug)]
struct CvhPlaylistItem {
    #[serde(rename = "season")]
    season: i32,
    #[serde(rename = "episode")]
    episode: i32,
    #[serde(rename = "vkId")]
    vk_id: String,
    #[serde(rename = "voiceStudio")]
    voice_studio: String,
}

#[derive(serde::Deserialize)]
struct CvhPlaylistResponse {
    items: Option<Vec<CvhPlaylistItem>>,
}

impl AnimegoServiceImpl {
    async fn get_voices(&self, anime_id: &str, episode: i32, proxy_url: &str) -> Result<Vec<VoiceOption>, AppError> {
        let client = build_client(proxy_url)?;
        let url = self.get_player_url_for_episode(anime_id, episode, proxy_url).await?;
        
        let res = client.get(&url)
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Referer", "https://animego.org/")
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Player fetch failed: {}", e)))?;
            
        let json_body: serde_json::Value = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("Player JSON parse failed: {}", e)))?;
            
        let html_escaped = json_body.pointer("/data/content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Mpv("Failed to get player content from JSON response".to_string()))?;
            
        let html_unescaped = html_escape::decode_html_entities(html_escaped).into_owned();
        
        let doc = scraper::Html::parse_document(&html_unescaped);
        let provider_selector = scraper::Selector::parse("div#provider button").unwrap();
        let mut voices = Vec::new();
        
        for btn in doc.select(&provider_selector) {
            let translation_id = btn.value().attr("data-ptranslation").unwrap_or("").to_string();
            let provider = btn.value().attr("data-provider-title").unwrap_or("").to_string();
            let player_attr = btn.value().attr("data-player").unwrap_or("");
            let embed = if player_attr.starts_with("//") {
                format!("https:{}", player_attr)
            } else {
                player_attr.to_string()
            };
            let name = btn.value().attr("data-translation-title").unwrap_or("").to_string();
            
            if !translation_id.is_empty() && !name.is_empty() {
                let label = name.replace(" (ошибка)", "").trim().to_string();
                let cvh_id = if provider == "CVH" {
                    if let Some(pos) = embed.find("cdn-iframe/") {
                        let sub = &embed[pos + 11..];
                        if let Some(slash_idx) = sub.find('/') {
                            Some(sub[..slash_idx].to_string())
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                };
                
                voices.push(VoiceOption {
                    label,
                    player: provider,
                    embed,
                    cvh_id,
                });
            }
        }
        
        Ok(voices)
    }

    async fn get_player_url_for_episode(&self, anime_id: &str, episode: i32, proxy_url: &str) -> Result<String, AppError> {
        if episode == 1 {
            return Ok(format!("https://animego.org/player/{}", anime_id));
        }
        
        let client = build_client(proxy_url)?;
        let first_player_url = format!("https://animego.org/player/{}", anime_id);
        
        let res = client.get(&first_player_url)
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Referer", "https://animego.org/")
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("First player fetch failed: {}", e)))?;
            
        let json_body: serde_json::Value = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("First player JSON parse failed: {}", e)))?;
            
        let html_escaped = json_body.pointer("/data/content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Mpv("Failed to get player content from JSON response".to_string()))?;
            
        let html_unescaped = html_escape::decode_html_entities(html_escaped).into_owned();
        
        let doc = scraper::Html::parse_document(&html_unescaped);
        let episode_selector = scraper::Selector::parse("[data-episode]").unwrap();
        for el in doc.select(&episode_selector) {
            let ep_num_attr = el.value().attr("data-episode-number").unwrap_or("").trim();
            if let Ok(num) = ep_num_attr.parse::<i32>() {
                if num == episode {
                    if let Some(ep_id) = el.value().attr("data-episode") {
                        return Ok(format!("https://animego.org/player/videos/{}", ep_id));
                    }
                }
            }
        }
        
        Err(AppError::Mpv(format!("Requested episode ({}) was not found in the player episode list.", episode)))
    }

    async fn aniboom_get_stream(&self, embed_url: &str, proxy_url: &str) -> Result<String, AppError> {
        let client = build_client(proxy_url)?;
        
        let res = client.get(embed_url)
            .header("Referer", "https://animego.org/")
            .header("Accept-Language", "ru-RU,ru;q=0.9")
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Aniboom embed page fetch failed: {}", e)))?;
            
        let html_content = res.text()
            .await
            .map_err(|e| AppError::Mpv(format!("Aniboom embed text fetch failed: {}", e)))?;
            
        let doc = scraper::Html::parse_document(&html_content);
        let video_selector = scraper::Selector::parse("video#video").unwrap();
        let video_tag = doc.select(&video_selector).next()
            .ok_or_else(|| AppError::Mpv("video#video element not found in Aniboom embed".to_string()))?;
            
        let raw_params_escaped = video_tag.value().attr("data-parameters")
            .ok_or_else(|| AppError::Mpv("data-parameters missing in video element".to_string()))?;
            
        let raw_params = html_escape::decode_html_entities(raw_params_escaped).into_owned();
        
        let data: serde_json::Value = serde_json::from_str(&raw_params)
            .map_err(|e| AppError::Serialization(format!("Aniboom data-parameters parse failed: {}", e)))?;
            
        if let Some(dash_str) = data.get("dash").and_then(|v| v.as_str()) {
            if let Ok(dash_obj) = serde_json::from_str::<serde_json::Value>(dash_str) {
                if let Some(src) = dash_obj.get("src").and_then(|v| v.as_str()) {
                    return Ok(src.to_string());
                }
            }
        }
        
        if let Some(hls_str) = data.get("hls").and_then(|v| v.as_str()) {
            if let Ok(hls_obj) = serde_json::from_str::<serde_json::Value>(hls_str) {
                if let Some(src) = hls_obj.get("src").and_then(|v| v.as_str()) {
                    return Ok(src.to_string());
                }
            }
        }
        
        Err(AppError::Mpv("No dash or hls stream found in Aniboom data-parameters".to_string()))
    }

    async fn cvh_get_playlist(&self, cvh_id: &str, proxy_url: &str) -> Result<Vec<CvhPlaylistItem>, AppError> {
        let client = build_client(proxy_url)?;
        let url = format!(
            "https://plapi.cdnvideohub.com/api/v1/player/sv/playlist?pub=747&aggr=mali&id={}",
            cvh_id
        );
        
        let res = client.get(&url)
            .header("Referer", "https://animego.org/")
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("CVH playlist request failed: {}", e)))?;
            
        let response: CvhPlaylistResponse = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("CVH playlist JSON parse failed: {}", e)))?;
            
        Ok(response.items.unwrap_or_default())
    }
    
    async fn cvh_get_stream(
        &self,
        cvh_id: &str,
        mut season: i32,
        episode: i32,
        translation: &str,
        proxy_url: &str,
    ) -> Result<String, AppError> {
        let playlist = self.cvh_get_playlist(cvh_id, proxy_url).await?;
        if playlist.is_empty() {
            return Err(AppError::Mpv("CVH playlist is empty".to_string()));
        }
        
        let seasons_in_playlist: Vec<_> = playlist.iter().map(|item| item.season).collect();
        let mut unique_seasons = seasons_in_playlist.clone();
        unique_seasons.sort();
        unique_seasons.dedup();
        if unique_seasons.len() == 1 {
            season = unique_seasons[0];
        }
        
        let matched_episodes: Vec<_> = playlist.iter()
            .filter(|item| item.season == season && item.episode == episode)
            .collect();
            
        if matched_episodes.is_empty() {
            return Err(AppError::Mpv(format!("Episode {} Season {} not found in CVH playlist", episode, season)));
        }
        
        let mut studios = Vec::new();
        for ep in &matched_episodes {
            studios.push(ep.voice_studio.clone());
        }
        
        let matched_studio = match_cvh_studio(translation, &studios)
            .ok_or_else(|| AppError::Mpv(format!("Failed to match voice translation '{}' in CVH options: {:?}", translation, studios)))?;
            
        let matched_item = matched_episodes.into_iter()
            .find(|item| item.voice_studio == matched_studio)
            .ok_or_else(|| AppError::Mpv("Matched studio disappeared from list".to_string()))?;
            
        self.cvh_get_stream_by_id(&matched_item.vk_id, proxy_url).await
    }
    
    async fn cvh_get_stream_by_id(&self, vk_id: &str, proxy_url: &str) -> Result<String, AppError> {
        let client = build_client(proxy_url)?;
        let url = format!("https://plapi.cdnvideohub.com/api/v1/player/sv/video/{}", vk_id);
        
        let res = client.get(&url)
            .header("Referer", "https://animego.org/")
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("CVH video details request failed: {}", e)))?;
            
        let json_body: serde_json::Value = res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("CVH video details JSON parse failed: {}", e)))?;
            
        let sources = json_body.pointer("/sources")
            .ok_or_else(|| AppError::Mpv("sources missing in CVH video response".to_string()))?;
            
        if let Some(hls) = sources.get("hlsUrl").and_then(|v| v.as_str()) {
            if !hls.is_empty() {
                return Ok(hls.to_string());
            }
        }
        
        if let Some(dash) = sources.get("dashUrl").or_else(|| sources.get("dashManifestUrl")).and_then(|v| v.as_str()) {
            if !dash.is_empty() {
                return Ok(dash.to_string());
            }
        }
        
        if let Some(sources_obj) = sources.as_object() {
            for (k, v) in sources_obj {
                if k.starts_with("url") {
                    if let Some(url_str) = v.as_str() {
                        if url_str.starts_with("http") {
                            return Ok(url_str.to_string());
                        }
                    }
                }
            }
        }
        
        Err(AppError::Mpv("No playable streams found in CVH sources".to_string()))
    }
}

fn match_cvh_studio(label: &str, cvh_studios: &[String]) -> Option<String> {
    let lo = label.to_lowercase();
    for s in cvh_studios {
        if s.to_lowercase() == lo {
            return Some(s.clone());
        }
    }
    for s in cvh_studios {
        let sl = s.to_lowercase();
        if lo.contains(&sl) || sl.contains(&lo) {
            return Some(s.clone());
        }
    }
    None
}

#[async_trait::async_trait]
impl AnimegoService for AnimegoServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for AnimegoServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.contains("animego.org") || identifier.contains("animego.me") || identifier.starts_with("animego://")
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let client = build_client(proxy_url)?;
        
        let anime_url = if identifier.starts_with("http") {
            identifier.to_string()
        } else {
            format!("https://animego.org/anime/{}", identifier)
        };
        
        let res = client.get(&anime_url)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("AnimeGO anime page fetch failed: {}", e)))?;
            
        let html_content = res.text()
            .await
            .map_err(|e| AppError::Mpv(format!("AnimeGO text fetch failed: {}", e)))?;
        
        // Parse page DOM in a scoped block — all ElementRef borrows must be dropped
        // before the next .await (scraper types are !Send, cannot cross await boundaries)
        let (title, original_title, cover_image, description, genres, years, age_rating, anime_id) = {
            let document = scraper::Html::parse_document(&html_content);
            let entity_selector = scraper::Selector::parse("div.entity").unwrap();
            let entity = document.select(&entity_selector).next()
                .ok_or_else(|| AppError::Mpv("Failed to find div.entity on AnimeGO page".to_string()))?;
                
            let title_selector = scraper::Selector::parse("div.entity__title").unwrap();
            let title = entity.select(&title_selector).next()
                .map(|el| el.text().collect::<Vec<_>>().join("").trim().to_string())
                .unwrap_or_default();
                
            let other_selector = scraper::Selector::parse("div.entity__title-synonyms").unwrap();
            let original_title = entity.select(&other_selector).next()
                .map(|el| el.text().collect::<Vec<_>>().join("").trim().to_string());
                
            let img_selector = scraper::Selector::parse("img.image__img").unwrap();
            let cover_image = entity.select(&img_selector).next()
                .and_then(|img| img.value().attr("src").map(|s| s.to_string()));
                
            let desc_selector = scraper::Selector::parse("div.description").unwrap();
            let description = entity.select(&desc_selector).next()
                .map(|el| el.text().collect::<Vec<_>>().join("").trim().to_string());
                
            let fields_selector = scraper::Selector::parse("div.entity-field > div").unwrap();
            let a_selector = scraper::Selector::parse("a").unwrap();
            
            let mut genres: Vec<String> = Vec::new();
            let mut years: Vec<String> = Vec::new();
            let mut age_rating: Option<String> = None;
            
            let fields: Vec<_> = entity.select(&fields_selector).collect();
            for chunk in fields.chunks_exact(2) {
                let key = chunk[0].text().collect::<Vec<_>>().join("").trim().to_string();
                if key == "Жанры" {
                    for a in chunk[1].select(&a_selector) {
                        genres.push(a.text().collect::<Vec<_>>().join("").trim().to_string());
                    }
                } else if key == "Выпуск" || key == "Сезон" {
                    let val_text = chunk[1].text().collect::<Vec<_>>().join("").trim().to_string();
                    for word in val_text.split_whitespace() {
                        let clean: String = word.chars().filter(|c| c.is_ascii_digit()).collect();
                        if clean.len() == 4 && !years.contains(&clean) {
                            years.push(clean);
                        }
                    }
                } else if key == "Возраст" {
                    age_rating = Some(chunk[1].text().collect::<Vec<_>>().join("").trim().to_string());
                }
            }
            
            let anime_id = extract_anime_id(&anime_url)?;
            (title, original_title, cover_image, description, genres, years, age_rating, anime_id)
        }; // all scraper borrows dropped here — safe to .await below
        
        let anime_id_ref = anime_id.clone();
        let schedule_url = format!("https://animego.org/anime/{}/9999999/schedule/load", anime_id_ref);
        
        let schedule_res = client.get(&schedule_url)
            .header("X-Requested-With", "XMLHttpRequest")
            .header("Referer", &anime_url)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("AnimeGO schedule load request failed: {}", e)))?;
            
        let json_body: serde_json::Value = schedule_res.json()
            .await
            .map_err(|e| AppError::Serialization(format!("AnimeGO schedule JSON parsing failed: {}", e)))?;
            
        let html_escaped = json_body.pointer("/data/content")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Mpv("Failed to get schedule content from JSON response".to_string()))?
            .to_string();
            
        let html_unescaped = html_escape::decode_html_entities(&html_escaped).into_owned();
        
        let mut episodes = {
            let schedule_doc = scraper::Html::parse_document(&html_unescaped);
            let div_selector = scraper::Selector::parse("body > div").unwrap();
            let inner_div_sel = scraper::Selector::parse("div").unwrap();
            let schedule_divs: Vec<_> = schedule_doc.select(&div_selector).collect();
            
            let mut episodes: Vec<ProviderEpisode> = Vec::new();
            for chunk in schedule_divs.chunks_exact(4) {
                let label = chunk[0].value().attr("data-label").unwrap_or("").trim_matches(|c: char| !c.is_ascii_digit());
                let ep_num = label.parse::<i32>().unwrap_or(-1);
                if ep_num <= 0 {
                    continue;
                }
                
                let is_released = chunk[3].select(&inner_div_sel).next().is_some();
                if is_released {
                    episodes.push(ProviderEpisode {
                        name: format!("Серия {}", ep_num),
                        url: format!("animego://play?anime_id={}&episode={}", anime_id_ref, ep_num),
                        preview_image: None,
                    });
                }
            }
            episodes
        }; // schedule_doc and all borrows dropped here
        
        episodes.sort_by(|a, b| {
            let num_a = parse_episode_number_from_name(&a.name);
            let num_b = parse_episode_number_from_name(&b.name);
            num_a.cmp(&num_b)
        });
        
        Ok(ProviderAnimeInfo {
            title,
            original_title,
            description,
            cover_image,
            genres,
            years,
            age_rating,
            episodes,
        })
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let client = build_client(proxy_url)?;
        let base_url = "https://animego.org";
        let search_url = format!("{}/search/anime", base_url);
        
        let res = client.get(&search_url)
            .query(&[("q", query)])
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("AnimeGO search request failed: {}", e)))?;
            
        let html_content = res.text()
            .await
            .map_err(|e| AppError::Mpv(format!("AnimeGO search text fetch failed: {}", e)))?;
            
        let document = scraper::Html::parse_document(&html_content);
        let item_selector = scraper::Selector::parse("div.ani-grid__item").unwrap();
        let link_selectors = [
            scraper::Selector::parse("a.ani-grid__item-body").unwrap(),
            scraper::Selector::parse("div.ani-grid__item-title a").unwrap(),
            scraper::Selector::parse("a[href*='/anime/']").unwrap(),
        ];
        
        let mut results = Vec::new();
        for item in document.select(&item_selector) {
            let mut link_el = None;
            for sel in &link_selectors {
                if let Some(el) = item.select(sel).next() {
                    link_el = Some(el);
                    break;
                }
            }
            let link_el = match link_el {
                Some(el) => el,
                None => continue,
            };
            
            let href = link_el.value().attr("href").unwrap_or("").trim_matches('/');
            let full_url = format!("https://animego.org/{}", href);
            
            if !href.starts_with("anime/") {
                continue;
            }
            
            let title_selector = scraper::Selector::parse("div.ani-grid__item-title a").unwrap();
            let title = if let Some(title_el) = item.select(&title_selector).next() {
                title_el.text().collect::<Vec<_>>().join("").trim().to_string()
            } else {
                let path = &href["anime/".len()..];
                path.replace('-', " ")
            };
            
            let img_selector = scraper::Selector::parse("img").unwrap();
            let image = item.select(&img_selector).next()
                .and_then(|img| img.value().attr("src").map(|s| s.to_string()));
                
            let desc_selector = scraper::Selector::parse("div.ani-grid__item-body").unwrap();
            let sub_title_selector = scraper::Selector::parse("div.fw-lighter").unwrap();
            let description = if let Some(desc_el) = item.select(&desc_selector).next() {
                if let Some(sub_title_el) = desc_el.select(&sub_title_selector).next() {
                    Some(sub_title_el.text().collect::<Vec<_>>().join("").trim().to_string())
                } else {
                    None
                }
            } else {
                None
            };
            
            results.push(ProviderSearchResult {
                id: full_url,
                title,
                description,
                cover_image: image,
            });
        }
        
        Ok(results)
    }

    async fn resolve_stream_url(&self, stream_url: &str, proxy_url: &str) -> Result<String, AppError> {
        if !stream_url.starts_with("animego://play") {
            return Ok(stream_url.to_string());
        }
        
        let parsed_url = reqwest::Url::parse(stream_url)
            .map_err(|e| AppError::Mpv(format!("Failed to parse stream URL: {}", e)))?;
            
        let mut anime_id = String::new();
        let mut episode = 1;
        
        for (k, v) in parsed_url.query_pairs() {
            if k == "anime_id" {
                anime_id = v.to_string();
            } else if k == "episode" {
                episode = v.parse::<i32>().unwrap_or(1);
            }
        }
        
        if anime_id.is_empty() {
            return Err(AppError::Mpv("Missing anime_id in stream URL".to_string()));
        }
        
        let voices = self.get_voices(&anime_id, episode, proxy_url).await?;
        if voices.is_empty() {
            return Err(AppError::Mpv(format!("No voice translations found for anime_id={} episode={}", anime_id, episode)));
        }
        
        for voice in voices {
            match voice.player.as_str() {
                "AniBoom" => {
                    match self.aniboom_get_stream(&voice.embed, proxy_url).await {
                        Ok(url) => return Ok(url),
                        Err(e) => println!("AniBoom stream resolution failed for translation '{}': {}", voice.label, e),
                    }
                }
                "CVH" => {
                    if let Some(cvh_id) = &voice.cvh_id {
                        match self.cvh_get_stream(cvh_id, 1, episode, &voice.label, proxy_url).await {
                            Ok(url) => return Ok(url),
                            Err(e) => println!("CVH stream resolution failed for translation '{}': {}", voice.label, e),
                        }
                    }
                }
                _ => {}
            }
        }
        
        Err(AppError::Mpv(format!("Could not resolve any playable streams for anime_id={} episode={}", anime_id, episode)))
    }
}
