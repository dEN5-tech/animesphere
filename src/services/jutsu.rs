use shaku::Component;
use crate::error::AppError;
use super::{JutsuService, ContentProvider, ProviderEpisode, ProviderAnimeInfo, ProviderSearchResult};
use crate::local_server::DbAnime;
use std::fs::File;
use std::io::Write;
use reqwest::Proxy;
use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct JutsuEpisode {
    pub name: String,
    pub url: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct JutsuAnimeInfo {
    pub title: String,
    pub original_title: String,
    pub age_rating: String,
    pub description: String,
    pub years: Vec<String>,
    pub genres: Vec<String>,
    pub poster: Option<String>,
    pub seasons: Vec<Vec<JutsuEpisode>>,
    pub seasons_names: Vec<String>,
    pub films: Vec<JutsuEpisode>,
}

#[derive(Component)]
#[shaku(interface = JutsuService)]
pub struct JutsuServiceImpl {}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let client_builder = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0");
    
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
impl JutsuService for JutsuServiceImpl {
    async fn get_anime_info_raw(&self, url: &str, proxy_url: &str) -> Result<JutsuAnimeInfo, AppError> {
        let client = build_client(proxy_url)?;
        let res = client.get(url)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Jut.su request failed: {}", e)))?;
        
        let html_content = res.text()
            .await
            .map_err(|e| AppError::Mpv(format!("Jut.su text fetch failed: {}", e)))?;
        
        let document = scraper::Html::parse_document(&html_content);
        
        let dle_selector = scraper::Selector::parse("div#dle-content")
            .map_err(|_| AppError::Serialization("Invalid div#dle-content CSS selector".to_string()))?;
            
        let dle_content = document.select(&dle_selector).next()
            .ok_or_else(|| AppError::Mpv("Could not find div#dle-content on Jut.su page".to_string()))?;
            
        let h1_selector = scraper::Selector::parse("h1.header_video").unwrap();
        let title = if let Some(h1) = dle_content.select(&h1_selector).next() {
            let text = h1.text().collect::<Vec<_>>().join("");
            text.replace("Смотреть ", "")
                .replace(" все серии и сезоны", "")
                .replace(" все серии", "")
                .trim()
                .to_string()
        } else {
            String::new()
        };
        
        let poster_selector = scraper::Selector::parse("div.all_anime_title").unwrap();
        let poster = if let Some(div) = dle_content.select(&poster_selector).next() {
            if let Some(style) = div.value().attr("style") {
                if let (Some(start), Some(end)) = (style.find('\''), style.rfind('\'')) {
                    if start < end {
                        Some(style[start+1..end].to_string())
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        } else {
            None
        };
        
        let additional_selector = scraper::Selector::parse("div.under_video_additional").unwrap();
        let a_selector = scraper::Selector::parse("a").unwrap();
        let mut genres = Vec::new();
        let mut years = Vec::new();
        let mut original_title = String::new();
        let mut age_rating = String::new();

        if let Some(additional) = dle_content.select(&additional_selector).next() {
            let b_selector = scraper::Selector::parse("b").unwrap();
            if let Some(b) = additional.select(&b_selector).next() {
                original_title = b.text().collect::<Vec<_>>().join("").trim().to_string();
            }
            
            let span_selector = scraper::Selector::parse("span.age_rating_all").unwrap();
            if let Some(span) = additional.select(&span_selector).next() {
                age_rating = span.text().collect::<Vec<_>>().join("").trim().to_string();
            }

            for a in additional.select(&a_selector) {
                if let Some(href) = a.value().attr("href") {
                    let text = a.text().collect::<Vec<_>>().join("");
                    let clean_text = if let Some(space_pos) = text.find(' ') {
                        text[space_pos+1..].trim().to_string()
                    } else {
                        text.trim().to_string()
                    };

                    let href_trimmed = href.trim_end_matches('/');
                    if let Some(last_slash_pos) = href_trimmed.rfind('/') {
                        let part = &href_trimmed[last_slash_pos+1..];
                        let is_year = part.chars().all(|c| c.is_ascii_digit() || c == '-');
                        if is_year && !part.is_empty() {
                            years.push(clean_text);
                        } else {
                            genres.push(clean_text);
                        }
                    }
                }
            }
        }
        
        let desc_selector = scraper::Selector::parse("p").unwrap();
        let description = if let Some(p) = dle_content.select(&desc_selector).next() {
            let mut desc_text = String::new();
            for child in p.children() {
                if let Some(el) = child.value().as_element() {
                    if el.name() == "i" {
                        continue;
                    }
                }
                if let Some(text_node) = child.value().as_text() {
                    desc_text.push_str(&text_node);
                }
            }
            desc_text.trim().to_string()
        } else {
            String::new()
        };
        
        let video_a_selector = scraper::Selector::parse("a.video").unwrap();
        let mut seasons: Vec<Vec<JutsuEpisode>> = Vec::new();
        let mut films = Vec::new();

        let domain = if url.contains("jut.su") {
            "jut.su"
        } else {
            if let Some(start) = url.find("://") {
                let rest = &url[start+3..];
                rest.split('/').next().unwrap_or("jut.su")
            } else {
                "jut.su"
            }
        };

        for episode in dle_content.select(&video_a_selector) {
            if let Some(href) = episode.value().attr("href") {
                let full_href = if href.starts_with("http") {
                    href.to_string()
                } else {
                    format!("https://{}/{}", domain, href.trim_start_matches('/'))
                };
                let name = episode.text().collect::<Vec<_>>().join("").trim().to_string();
                let ep = JutsuEpisode { name, url: full_href };

                if href.contains("season-") {
                    if let Some(season_idx) = href.find("season-") {
                        let sub = &href[season_idx + 7..];
                        if let Some(slash_idx) = sub.find('/') {
                            if let Ok(num) = sub[..slash_idx].parse::<usize>() {
                                while seasons.len() < num {
                                    seasons.push(Vec::new());
                                }
                                seasons[num - 1].push(ep);
                                continue;
                            }
                        }
                    }
                    if seasons.is_empty() {
                        seasons.push(Vec::new());
                    }
                    seasons.last_mut().unwrap().push(ep);
                } else if href.contains("film-") || href.contains("/film/") {
                    films.push(ep);
                } else {
                    if seasons.is_empty() {
                        seasons.push(Vec::new());
                    }
                    seasons.last_mut().unwrap().push(ep);
                }
            }
        }

        let h2_selector = scraper::Selector::parse("h2.the-anime-season").unwrap();
        let mut seasons_names = Vec::new();
        for h2 in dle_content.select(&h2_selector) {
            seasons_names.push(h2.text().collect::<Vec<_>>().join("").trim().to_string());
        }

        Ok(JutsuAnimeInfo {
            title,
            original_title,
            age_rating,
            description,
            years,
            genres,
            poster,
            seasons,
            seasons_names,
            films,
        })
    }

    async fn get_mp4_link(&self, url: &str, proxy_url: &str) -> Result<HashMap<String, String>, AppError> {
        let client = build_client(proxy_url)?;
        let res = client.get(url)
            .send()
            .await
            .map_err(|e| AppError::Mpv(format!("Jut.su video page fetch failed: {}", e)))?;
            
        let html_content = res.text()
            .await
            .map_err(|e| AppError::Mpv(format!("Jut.su video page text fetch failed: {}", e)))?;
            
        let document = scraper::Html::parse_document(&html_content);
        
        let video_selector = scraper::Selector::parse("video#my-player")
            .map_err(|_| AppError::Serialization("Invalid video#my-player CSS selector".to_string()))?;
            
        let source_selector = scraper::Selector::parse("source")
            .map_err(|_| AppError::Serialization("Invalid source CSS selector".to_string()))?;
            
        if let Some(video) = document.select(&video_selector).next() {
            let mut links = HashMap::new();
            for src in video.select(&source_selector) {
                if let (Some(res), Some(src_url)) = (src.value().attr("res"), src.value().attr("src")) {
                    links.insert(res.to_string(), src_url.to_string());
                }
            }
            if links.is_empty() {
                Err(AppError::Mpv("No sources found in my-player video element".to_string()))
            } else {
                Ok(links)
            }
        } else {
            Err(AppError::Mpv("Could not find video#my-player element on Jut.su episode page".to_string()))
        }
    }

    async fn import_by_url(&self, url: &str, proxy_url: &str) -> Result<(), AppError> {
        let anime_details = self.get_anime_info_raw(url, proxy_url).await?;
        let ru_title = &anime_details.title;
        let mut seeded = Vec::new();
        let mut ep_id = 1;
        
        for (season_idx, season) in anime_details.seasons.iter().enumerate() {
            let season_prefix = if anime_details.seasons.len() > 1 {
                format!("Сезон {} - ", season_idx + 1)
            } else {
                String::new()
            };
            
            for ep in season {
                seeded.push(DbAnime {
                    id: ep_id,
                    title: format!("{} - {}{}", ru_title, season_prefix, ep.name),
                    description: format!("Episode {} of {}", ep.name, ru_title),
                    stream_url: ep.url.clone(),
                    cover_image: anime_details.poster.clone().unwrap_or_default(),
                });
                ep_id += 1;
            }
        }
        
        for film in &anime_details.films {
            seeded.push(DbAnime {
                id: ep_id,
                title: format!("{} - {}", ru_title, film.name),
                description: format!("Film of {}", ru_title),
                stream_url: film.url.clone(),
                cover_image: anime_details.poster.clone().unwrap_or_default(),
            });
            ep_id += 1;
        }

        if seeded.is_empty() {
            return Err(AppError::Mpv("No episodes found in Jut.su playlist".to_string()));
        }

        let content = serde_json::to_string_pretty(&seeded)
            .map_err(|e| AppError::Serialization(format!("JSON serialization failed: {}", e)))?;

        let mut file = File::create(super::config::get_episodes_path())
            .map_err(|e| AppError::Mpv(format!("Failed to create episodes.json: {}", e)))?;

        file.write_all(content.as_bytes())
            .map_err(|e| AppError::Mpv(format!("Failed to write episodes.json: {}", e)))?;

        println!("Successfully imported {} Jut.su episodes for '{}'", seeded.len(), ru_title);
        Ok(())
    }
}

#[async_trait::async_trait]
impl ContentProvider for JutsuServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.contains("jut.su")
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let raw = <Self as JutsuService>::get_anime_info_raw(self, identifier, proxy_url).await?;
        
        let mut episodes = Vec::new();
        for (season_idx, season) in raw.seasons.iter().enumerate() {
            let season_prefix = if raw.seasons.len() > 1 {
                format!("Сезон {} - ", season_idx + 1)
            } else {
                String::new()
            };
            
            for ep in season {
                episodes.push(ProviderEpisode {
                    name: format!("{}{}", season_prefix, ep.name),
                    url: ep.url.clone(),
                    preview_image: None,
                });
            }
        }

        for film in &raw.films {
            episodes.push(ProviderEpisode {
                name: film.name.clone(),
                url: film.url.clone(),
                preview_image: None,
            });
        }

        Ok(ProviderAnimeInfo {
            title: raw.title,
            original_title: Some(raw.original_title),
            description: Some(raw.description),
            cover_image: raw.poster,
            genres: raw.genres,
            years: raw.years,
            age_rating: Some(raw.age_rating),
            episodes,
        })
    }

    async fn search(&self, query: &str, _proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let query_trimmed = query.trim();
        if query_trimmed.is_empty() {
            return Ok(Vec::new());
        }

        let url = if query_trimmed.starts_with("http") {
            query_trimmed.to_string()
        } else if query_trimmed.contains('/') {
            format!("https://jut.su/{}", query_trimmed.trim_start_matches('/'))
        } else {
            let slug = query_trimmed.to_ascii_lowercase().replace(' ', "-");
            format!("https://jut.su/{}/", slug)
        };

        Ok(vec![ProviderSearchResult {
            id: url.clone(),
            title: format!("Импортировать с Jut.su: {}", query_trimmed),
            description: Some(format!("Открыть страницу аниме: {}", url)),
            cover_image: None,
        }])
    }

    async fn resolve_stream_url(&self, stream_url: &str, proxy_url: &str) -> Result<String, AppError> {
        let links = self.get_mp4_link(stream_url, proxy_url).await?;
        if let Some(url) = links.get("1080p")
            .or_else(|| links.get("720p"))
            .or_else(|| links.get("480p"))
            .or_else(|| links.get("360p"))
            .or_else(|| links.values().next()) {
            Ok(url.clone())
        } else {
            Err(AppError::Mpv("No playable streams found on Jut.su page".to_string()))
        }
    }
}

