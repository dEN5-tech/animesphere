use shaku::Component;
use crate::error::AppError;
use super::{BestSimilarService, ContentProvider, ProviderAnimeInfo, ProviderSearchResult, ProviderEpisode};
use reqwest::Proxy;

const BASE_URL: &str = "https://bestsimilar.com";

#[derive(Component)]
#[shaku(interface = BestSimilarService)]
pub struct BestSimilarServiceImpl {}

fn build_client(proxy_url: &str) -> Result<reqwest::Client, AppError> {
    let builder = reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
        )
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

fn get_cover_url(movie_id: &str) -> String {
    let hash = format!("{:x}", md5::compute(movie_id));
    let prefix = &hash[..2];
    format!("{}/img/movie/thumb/{}/{}.jpg", BASE_URL, prefix, movie_id)
}

fn get_tag_cover_url(tag_id: &str) -> String {
    let hash = format!("{:x}", md5::compute(tag_id));
    let prefix = &hash[..2];
    format!("{}/img/tag/thumb/{}/{}.jpg", BASE_URL, prefix, tag_id)
}

fn make_end_tag_handler<F>(f: F) -> Box<dyn for<'a, 'b> FnOnce(&'a mut lol_html::html_content::EndTag<'b>) -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> + 'static>
where
    F: for<'a, 'b> FnOnce(&'a mut lol_html::html_content::EndTag<'b>) -> Result<(), Box<dyn std::error::Error + Send + Sync + 'static>> + 'static
{
    Box::new(f)
}

#[async_trait::async_trait]
impl BestSimilarService for BestSimilarServiceImpl {}

#[async_trait::async_trait]
impl ContentProvider for BestSimilarServiceImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        identifier.contains("bestsimilar.com")
            || identifier.starts_with("bestsimilar://")
    }

    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let client = build_client(proxy_url)?;
        let url = format!("{}/site/autocomplete", BASE_URL);

        let mut res = client
            .get(&url)
            .query(&[("term", query)])
            .header("X-Requested-With", "XMLHttpRequest")
            .send()
            .await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[BestSimilar] Search request with proxy failed. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client
                    .get(&url)
                    .query(&[("term", query)])
                    .header("X-Requested-With", "XMLHttpRequest")
                    .send()
                    .await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("BestSimilar search request failed: {}", e)))?;

        if !res.status().is_success() {
            return Err(AppError::Mpv(format!(
                "BestSimilar search returned HTTP {}",
                res.status()
            )));
        }

        let json_body: serde_json::Value = res
            .json()
            .await
            .map_err(|e| AppError::Serialization(format!("BestSimilar search JSON parse failed: {}", e)))?;

        let mut results = Vec::new();

        // ── Movies ────────────────────────────────────────────────────────────
        if let Some(movies) = json_body.get("movie").and_then(|v| v.as_array()) {
            for item in movies {
                let id    = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let label = item.get("label").and_then(|v| v.as_str()).unwrap_or("");
                let path  = item.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let is_serial = item.get("serial").and_then(|v| v.as_str()).unwrap_or("0") == "1";

                if id.is_empty() || label.is_empty() {
                    continue;
                }

                let full_url = if path.starts_with("http") {
                    path.to_string()
                } else {
                    format!("{}{}", BASE_URL, path)
                };

                let cover_image = get_cover_url(id);
                let kind = if is_serial { "Сериал" } else { "Фильм" };

                results.push(ProviderSearchResult {
                    id: full_url,
                    title: label.to_string(),
                    description: Some(format!("{} · BestSimilar", kind)),
                    cover_image: Some(cover_image),
                });
            }
        }

        // ── Tags / Genres / Styles / Plots ───────────────────────────────────
        if let Some(tags) = json_body.get("tag").and_then(|v| v.as_array()) {
            for item in tags {
                let id        = item.get("id").and_then(|v| v.as_str()).unwrap_or("");
                let label     = item.get("label").and_then(|v| v.as_str()).unwrap_or("");
                let path      = item.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let movie_num = item.get("movie_num").and_then(|v| v.as_str()).unwrap_or("0");

                if id.is_empty() || label.is_empty() {
                    continue;
                }

                let full_url = if path.starts_with("http") {
                    path.to_string()
                } else {
                    format!("{}{}", BASE_URL, path)
                };

                let cover_image = get_tag_cover_url(id);

                results.push(ProviderSearchResult {
                    id: full_url,
                    title: format!("🏷 {} ({} тайтлов)", label, movie_num),
                    description: Some("Тег/Жанр · BestSimilar".to_string()),
                    cover_image: Some(cover_image),
                });
            }
        }

        Ok(results)
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        let client = build_client(proxy_url)?;

        let page_url = if identifier.starts_with("bestsimilar://") {
            identifier.replace("bestsimilar://", "https://")
        } else if identifier.starts_with("http") {
            identifier.to_string()
        } else {
            format!("{}/movies/{}", BASE_URL, identifier)
        };

        let is_tag_page = page_url.contains("/tag/");

        let mut res = client.get(&page_url).send().await;

        if !proxy_url.is_empty() {
            let should_fallback = match &res {
                Err(_) => true,
                Ok(r)  => r.status() == reqwest::StatusCode::GONE
                       || r.status() == reqwest::StatusCode::FORBIDDEN,
            };
            if should_fallback {
                println!("[BestSimilar] Page request with proxy failed. Retrying WITHOUT proxy.");
                let direct_client = build_client("")?;
                res = direct_client.get(&page_url).send().await;
            }
        }

        let res = res.map_err(|e| AppError::Mpv(format!("BestSimilar page fetch failed: {}", e)))?;
        if !res.status().is_success() {
            return Err(AppError::Mpv(format!("BestSimilar returned HTTP {}", res.status())));
        }

        let bytes = res.bytes().await
            .map_err(|e| AppError::Mpv(format!("BestSimilar page bytes fetch failed: {}", e)))?;

        // ── TAG PAGE ──────────────────────────────────────────────────────────
        if is_tag_page {
            use std::rc::Rc;
            use std::cell::RefCell;
            use lol_html::{element, text, HtmlRewriter, Settings};

            struct TempMovie {
                title: String,
                href: String,
                score: Option<String>,
                img: Option<String>,
            }

            let tag_name = Rc::new(RefCell::new(String::new()));
            let tag_cover = Rc::new(RefCell::new(None::<String>));
            let tag_desc = Rc::new(RefCell::new(String::new()));
            let count_txt = Rc::new(RefCell::new(String::new()));
            let episodes = Rc::new(RefCell::new(Vec::<ProviderEpisode>::new()));
            let current_movie = Rc::new(RefCell::new(None::<TempMovie>));

            let tag_name_c = Rc::clone(&tag_name);
            let tag_cover_c = Rc::clone(&tag_cover);
            let tag_desc_c = Rc::clone(&tag_desc);
            let count_txt_c = Rc::clone(&count_txt);
            
            let current_movie_el = Rc::clone(&current_movie);
            let episodes_el = Rc::clone(&episodes);
            let current_movie_a_el = Rc::clone(&current_movie);
            let current_movie_a_txt = Rc::clone(&current_movie);
            let current_movie_score_txt = Rc::clone(&current_movie);
            let current_movie_img_el = Rc::clone(&current_movie);

            let mut rewriter = HtmlRewriter::new(
                Settings {
                    element_content_handlers: vec![
                        // Tag title
                        text!("h1", move |t| {
                            tag_name_c.borrow_mut().push_str(t.as_str());
                            Ok(())
                        }),
                        // Tag cover
                        element!("div.item.item-tag img", move |el| {
                            if let Some(src) = el.get_attribute("src") {
                                *tag_cover_c.borrow_mut() = Some(if src.starts_with("http") {
                                    src
                                } else {
                                    format!("{}{}", BASE_URL, src)
                                });
                            }
                            Ok(())
                        }),
                        // Tag description
                        text!("div.text-block, p.description", move |t| {
                            tag_desc_c.borrow_mut().push_str(t.as_str());
                            Ok(())
                        }),
                        // Count badge
                        text!("span.count, .items-count", move |t| {
                            count_txt_c.borrow_mut().push_str(t.as_str());
                            Ok(())
                        }),
                        // Movie container
                        element!("div.item.item-movie", move |el| {
                            *current_movie_el.borrow_mut() = Some(TempMovie {
                                title: String::new(),
                                href: String::new(),
                                score: None,
                                img: None,
                            });
                            let current_movie_end = Rc::clone(&current_movie_el);
                            let episodes_end = Rc::clone(&episodes_el);
                            el.on_end_tag(make_end_tag_handler(move |_end| {
                                if let Some(m) = current_movie_end.borrow_mut().take() {
                                    let title = m.title.trim().to_string();
                                    let href = m.href.trim().to_string();
                                    if !title.is_empty() && !href.is_empty() {
                                        let rec_url = if href.starts_with("http") {
                                            href
                                        } else {
                                            format!("{}{}", BASE_URL, href)
                                        };
                                        let display = match m.score {
                                            Some(s) => {
                                                let s_clean = s.trim();
                                                if s_clean.is_empty() {
                                                    title
                                                } else {
                                                    format!("{} [{}]", title, s_clean)
                                                }
                                            }
                                            None => title,
                                        };
                                        episodes_end.borrow_mut().push(ProviderEpisode {
                                            name: display,
                                            url: rec_url,
                                            preview_image: m.img,
                                        });
                                    }
                                }
                                Ok(())
                            }))?;
                            Ok(())
                        }),
                        // Movie title link (href)
                        element!("div.item.item-movie a.name", move |el| {
                            if let Some(href) = el.get_attribute("href") {
                                if let Some(ref mut m) = *current_movie_a_el.borrow_mut() {
                                    m.href = href;
                                }
                            }
                            Ok(())
                        }),
                        // Movie title link (text)
                        text!("div.item.item-movie a.name", move |t| {
                            if let Some(ref mut m) = *current_movie_a_txt.borrow_mut() {
                                m.title.push_str(t.as_str());
                            }
                            Ok(())
                        }),
                        // Movie similarity score
                        text!("div.item.item-movie span.smt-value", move |t| {
                            if let Some(ref mut m) = *current_movie_score_txt.borrow_mut() {
                                m.score.get_or_insert_with(String::new).push_str(t.as_str());
                            }
                            Ok(())
                        }),
                        // Movie cover image
                        element!("div.item.item-movie img", move |el| {
                            if let Some(src) = el.get_attribute("src") {
                                if let Some(ref mut m) = *current_movie_img_el.borrow_mut() {
                                    m.img = Some(if src.starts_with("http") {
                                        src
                                    } else {
                                        format!("{}{}", BASE_URL, src)
                                    });
                                }
                            }
                            Ok(())
                        }),
                    ],
                    ..Default::default()
                },
                |_: &[u8]| {}
            );

            rewriter.write(&bytes).map_err(|e| AppError::Mpv(format!("BestSimilar parse error: {}", e)))?;
            rewriter.end().map_err(|e| AppError::Mpv(format!("BestSimilar parse end error: {}", e)))?;

            let title_str = tag_name.borrow().trim().to_string();
            let final_title = if title_str.is_empty() {
                "BestSimilar Tag".to_string()
            } else {
                title_str
            };

            let cover = tag_cover.borrow().clone();
            let desc_str = tag_desc.borrow().trim().to_string();
            let count_str = count_txt.borrow().trim().to_string();

            let description = match (!desc_str.is_empty(), !count_str.is_empty()) {
                (true, true) => Some(format!("{}\n\nКоличество тайтлов: {}", desc_str, count_str)),
                (true, false) => Some(desc_str),
                (false, true) => Some(format!("Количество тайтлов: {}", count_str)),
                _ => None,
            };

            let final_episodes = episodes.borrow().clone();

            return Ok(ProviderAnimeInfo {
                title: final_title,
                original_title: None,
                description,
                cover_image: cover,
                genres: vec!["BestSimilar Тег".to_string()],
                years: Vec::new(),
                age_rating: None,
                episodes: final_episodes,
            });
        }

        // ── MOVIE / SHOW PAGE ─────────────────────────────────────────────────
        use std::rc::Rc;
        use std::cell::RefCell;
        use lol_html::{element, text, HtmlRewriter, Settings};

        struct TempAttr {
            entry: String,
            value: String,
            links: Vec<(String, String)>,
            in_entry: bool,
            in_value: bool,
            current_link_label: String,
            current_link_href: String,
        }

        struct TempRec {
            title: String,
            href: String,
            similarity: Option<String>,
            img: Option<String>,
        }

        let title = Rc::new(RefCell::new(String::new()));
        let cover_image = Rc::new(RefCell::new(None::<String>));
        let story_txt = Rc::new(RefCell::new(String::new()));
        let style_tags_list = Rc::new(RefCell::new(Vec::<(String, String)>::new()));
        let plot_tags_list = Rc::new(RefCell::new(Vec::<(String, String)>::new()));
        let genres_list = Rc::new(RefCell::new(Vec::<(String, String)>::new()));
        let countries_list = Rc::new(RefCell::new(Vec::<(String, String)>::new()));
        let original_title = Rc::new(RefCell::new(None::<String>));
        let age_rating = Rc::new(RefCell::new(None::<String>));
        let years = Rc::new(RefCell::new(Vec::<String>::new()));
        let similar_movies = Rc::new(RefCell::new(Vec::<ProviderEpisode>::new()));

        let temp_attr = Rc::new(RefCell::new(None::<TempAttr>));
        let temp_style_tag = Rc::new(RefCell::new(None::<(String, String)>));
        let temp_plot_tag = Rc::new(RefCell::new(None::<(String, String)>));
        let temp_rec = Rc::new(RefCell::new(None::<TempRec>));

        let title_c = Rc::clone(&title);
        let cover_image_c = Rc::clone(&cover_image);
        let story_txt_c = Rc::clone(&story_txt);

        let temp_style_tag_el = Rc::clone(&temp_style_tag);
        let style_tags_list_el = Rc::clone(&style_tags_list);
        let temp_style_tag_txt = Rc::clone(&temp_style_tag);

        let temp_plot_tag_el = Rc::clone(&temp_plot_tag);
        let plot_tags_list_el = Rc::clone(&plot_tags_list);
        let temp_plot_tag_txt = Rc::clone(&temp_plot_tag);

        let temp_attr_el = Rc::clone(&temp_attr);
        let genres_list_el = Rc::clone(&genres_list);
        let countries_list_el = Rc::clone(&countries_list);
        let original_title_el = Rc::clone(&original_title);
        let age_rating_el = Rc::clone(&age_rating);
        let years_el = Rc::clone(&years);

        let temp_attr_entry_el = Rc::clone(&temp_attr);
        let temp_attr_entry_txt = Rc::clone(&temp_attr);

        let temp_attr_value_el = Rc::clone(&temp_attr);
        let temp_attr_value_txt = Rc::clone(&temp_attr);

        let temp_attr_link_el = Rc::clone(&temp_attr);
        let temp_attr_link_txt = Rc::clone(&temp_attr);

        let temp_rec_el = Rc::clone(&temp_rec);
        let similar_movies_el = Rc::clone(&similar_movies);
        let temp_rec_a_el = Rc::clone(&temp_rec);
        let temp_rec_a_txt = Rc::clone(&temp_rec);
        let temp_rec_score_txt = Rc::clone(&temp_rec);
        let temp_rec_img_el = Rc::clone(&temp_rec);

        let mut rewriter = HtmlRewriter::new(
            Settings {
                element_content_handlers: vec![
                    // Title
                    text!(".item-big .name-c span", move |t| {
                        title_c.borrow_mut().push_str(t.as_str());
                        Ok(())
                    }),
                    // Cover Image
                    element!(".item-big img.img-responsive", move |el| {
                        if let Some(src) = el.get_attribute("src") {
                            *cover_image_c.borrow_mut() = Some(if src.starts_with("http") {
                                src
                            } else {
                                format!("{}{}", BASE_URL, src)
                            });
                        }
                        Ok(())
                    }),
                    // Story
                    text!(".item-big div.attr-story span.value", move |t| {
                        story_txt_c.borrow_mut().push_str(t.as_str());
                        Ok(())
                    }),
                    // Style tag (a href/text)
                    element!(".item-big div.attr-tag-group-3 span.value a", move |el| {
                        let href = el.get_attribute("href").unwrap_or_default();
                        *temp_style_tag_el.borrow_mut() = Some((String::new(), href));
                        let temp_style_tag_end = Rc::clone(&temp_style_tag_el);
                        let style_tags_list_end = Rc::clone(&style_tags_list_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some((lbl, href)) = temp_style_tag_end.borrow_mut().take() {
                                let lbl_clean = lbl.trim().to_string();
                                if !lbl_clean.is_empty() {
                                    style_tags_list_end.borrow_mut().push((lbl_clean, href));
                                }
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    text!(".item-big div.attr-tag-group-3 span.value a", move |t| {
                        if let Some(ref mut tag) = *temp_style_tag_txt.borrow_mut() {
                            tag.0.push_str(t.as_str());
                        }
                        Ok(())
                    }),
                    // Plot tag (a href/text)
                    element!(".item-big div.attr-tag-group-1 span.value a", move |el| {
                        let href = el.get_attribute("href").unwrap_or_default();
                        *temp_plot_tag_el.borrow_mut() = Some((String::new(), href));
                        let temp_plot_tag_end = Rc::clone(&temp_plot_tag_el);
                        let plot_tags_list_end = Rc::clone(&plot_tags_list_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some((lbl, href)) = temp_plot_tag_end.borrow_mut().take() {
                                let lbl_clean = lbl.trim().to_string();
                                if !lbl_clean.is_empty() {
                                    plot_tags_list_end.borrow_mut().push((lbl_clean, href));
                                }
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    text!(".item-big div.attr-tag-group-1 span.value a", move |t| {
                        if let Some(ref mut tag) = *temp_plot_tag_txt.borrow_mut() {
                            tag.0.push_str(t.as_str());
                        }
                        Ok(())
                    }),
                    // Attributes Block Container
                    element!(".item-big div.attr", move |el| {
                        *temp_attr_el.borrow_mut() = Some(TempAttr {
                            entry: String::new(),
                            value: String::new(),
                            links: Vec::new(),
                            in_entry: false,
                            in_value: false,
                            current_link_label: String::new(),
                            current_link_href: String::new(),
                        });
                        let temp_attr_end = Rc::clone(&temp_attr_el);
                        let genres_list_end = Rc::clone(&genres_list_el);
                        let countries_list_end = Rc::clone(&countries_list_el);
                        let original_title_end = Rc::clone(&original_title_el);
                        let age_rating_end = Rc::clone(&age_rating_el);
                        let years_end = Rc::clone(&years_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some(attr) = temp_attr_end.borrow_mut().take() {
                                let entry_clean = attr.entry.trim().to_lowercase();
                                let val_clean = attr.value.trim().to_string();
                                if entry_clean.contains("genre") {
                                    if !attr.links.is_empty() {
                                        for (lbl, href) in attr.links {
                                            genres_list_end.borrow_mut().push((lbl, href));
                                        }
                                    } else if !val_clean.is_empty() {
                                        for part in val_clean.split(',') {
                                            let p = part.trim().to_string();
                                            if !p.is_empty() {
                                                genres_list_end.borrow_mut().push((p, String::new()));
                                            }
                                        }
                                    }
                                } else if entry_clean.contains("country") {
                                    if !attr.links.is_empty() {
                                        for (lbl, href) in attr.links {
                                            countries_list_end.borrow_mut().push((lbl, href));
                                        }
                                    } else if !val_clean.is_empty() {
                                        countries_list_end.borrow_mut().push((val_clean, String::new()));
                                    }
                                } else if entry_clean.contains("original name") || entry_clean.contains("original title") {
                                    if !val_clean.is_empty() {
                                        *original_title_end.borrow_mut() = Some(val_clean);
                                    }
                                } else if entry_clean.contains("rating") || entry_clean.contains("rated") {
                                    if !val_clean.is_empty() {
                                        *age_rating_end.borrow_mut() = Some(val_clean);
                                    }
                                } else if entry_clean.contains("year") {
                                    if let Ok(y) = val_clean.trim().parse::<u32>() {
                                        years_end.borrow_mut().push(y.to_string());
                                    }
                                }
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    // span.entry element handler
                    element!(".item-big div.attr span.entry", move |el| {
                        if let Some(ref mut attr) = *temp_attr_entry_el.borrow_mut() {
                            attr.in_entry = true;
                        }
                        let temp_attr_entry_end = Rc::clone(&temp_attr_entry_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some(ref mut attr) = *temp_attr_entry_end.borrow_mut() {
                                attr.in_entry = false;
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    // span.entry text handler
                    text!(".item-big div.attr span.entry", move |t| {
                        if let Some(ref mut attr) = *temp_attr_entry_txt.borrow_mut() {
                            if attr.in_entry {
                                attr.entry.push_str(t.as_str());
                            }
                        }
                        Ok(())
                    }),
                    // span.value element handler
                    element!(".item-big div.attr span.value", move |el| {
                        if let Some(ref mut attr) = *temp_attr_value_el.borrow_mut() {
                            attr.in_value = true;
                        }
                        let temp_attr_value_end = Rc::clone(&temp_attr_value_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some(ref mut attr) = *temp_attr_value_end.borrow_mut() {
                                attr.in_value = false;
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    // span.value text handler
                    text!(".item-big div.attr span.value", move |t| {
                        if let Some(ref mut attr) = *temp_attr_value_txt.borrow_mut() {
                            if attr.in_value {
                                attr.value.push_str(t.as_str());
                            }
                        }
                        Ok(())
                    }),
                    // span.value a element handler
                    element!(".item-big div.attr span.value a", move |el| {
                        let href = el.get_attribute("href").unwrap_or_default();
                        if let Some(ref mut attr) = *temp_attr_link_el.borrow_mut() {
                            attr.current_link_href = href;
                        }
                        let temp_attr_link_end = Rc::clone(&temp_attr_link_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some(ref mut attr) = *temp_attr_link_end.borrow_mut() {
                                let lbl = attr.current_link_label.trim().to_string();
                                let href = attr.current_link_href.trim().to_string();
                                if !lbl.is_empty() {
                                    attr.links.push((lbl, href));
                                }
                                attr.current_link_label.clear();
                                attr.current_link_href.clear();
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    // span.value a text handler
                    text!(".item-big div.attr span.value a", move |t| {
                        if let Some(ref mut attr) = *temp_attr_link_txt.borrow_mut() {
                            attr.current_link_label.push_str(t.as_str());
                        }
                        Ok(())
                    }),
                    // Similar movie container
                    element!("div.item.item-small.item-movie", move |el| {
                        *temp_rec_el.borrow_mut() = Some(TempRec {
                            title: String::new(),
                            href: String::new(),
                            similarity: None,
                            img: None,
                        });
                        let temp_rec_end = Rc::clone(&temp_rec_el);
                        let similar_movies_end = Rc::clone(&similar_movies_el);
                        el.on_end_tag(make_end_tag_handler(move |_end| {
                            if let Some(r) = temp_rec_end.borrow_mut().take() {
                                let r_title = r.title.trim().to_string();
                                let href = r.href.trim().to_string();
                                if !r_title.is_empty() && !href.is_empty() {
                                    let similarity = r.similarity.unwrap_or_else(|| "~90%".to_string());
                                    let similarity_clean = similarity.trim();
                                    let sim_str = if similarity_clean.is_empty() { "~90%" } else { similarity_clean };
                                    let rec_url = if href.starts_with("http") {
                                        href
                                    } else {
                                        format!("{}{}", BASE_URL, href)
                                    };
                                    similar_movies_end.borrow_mut().push(ProviderEpisode {
                                        name: format!("{} [Похоже на {}]", r_title, sim_str),
                                        url: rec_url,
                                        preview_image: r.img,
                                    });
                                }
                            }
                            Ok(())
                        }))?;
                        Ok(())
                    }),
                    // Similar movie title (href)
                    element!("div.item.item-small.item-movie a.name", move |el| {
                        if let Some(href) = el.get_attribute("href") {
                            if let Some(ref mut r) = *temp_rec_a_el.borrow_mut() {
                                r.href = href;
                            }
                        }
                        Ok(())
                    }),
                    // Similar movie title (text)
                    text!("div.item.item-small.item-movie a.name", move |t| {
                        if let Some(ref mut r) = *temp_rec_a_txt.borrow_mut() {
                            r.title.push_str(t.as_str());
                        }
                        Ok(())
                    }),
                    // Similar movie score
                    text!("div.item.item-small.item-movie span.smt-value", move |t| {
                        if let Some(ref mut r) = *temp_rec_score_txt.borrow_mut() {
                            r.similarity.get_or_insert_with(String::new).push_str(t.as_str());
                        }
                        Ok(())
                    }),
                    // Similar movie image
                    element!("div.item.item-small.item-movie img", move |el| {
                        if let Some(src) = el.get_attribute("src") {
                            if let Some(ref mut r) = *temp_rec_img_el.borrow_mut() {
                                r.img = Some(if src.starts_with("http") {
                                    src
                                } else {
                                    format!("{}{}", BASE_URL, src)
                                });
                            }
                        }
                        Ok(())
                    }),
                ],
                ..Default::default()
            },
            |_: &[u8]| {}
        );

        rewriter.write(&bytes).map_err(|e| AppError::Mpv(format!("BestSimilar parse error: {}", e)))?;
        rewriter.end().map_err(|e| AppError::Mpv(format!("BestSimilar parse end error: {}", e)))?;

        let title_str = title.borrow().trim().to_string();
        let final_title = if title_str.is_empty() {
            "Unknown Title".to_string()
        } else {
            title_str
        };

        let cover = cover_image.borrow().clone();
        let story_str = story_txt.borrow().trim().to_string();
        let story_txt_opt = if story_str.is_empty() { None } else { Some(story_str) };

        let mut genres_final = Vec::new();
        for (lbl, href) in genres_list.borrow().iter() {
            if !href.is_empty() {
                let full_href = if href.starts_with("http") { href.clone() } else { format!("{}{}", BASE_URL, href) };
                genres_final.push(format!("{}|{}", lbl, full_href));
            } else {
                genres_final.push(lbl.clone());
            }
        }

        for (lbl, href) in style_tags_list.borrow().iter() {
            if !href.is_empty() {
                let full_href = if href.starts_with("http") { href.clone() } else { format!("{}{}", BASE_URL, href) };
                genres_final.push(format!("🎨 {}|{}", lbl, full_href));
            } else {
                genres_final.push(format!("🎨 {}", lbl));
            }
        }

        for (lbl, href) in plot_tags_list.borrow().iter() {
            if !href.is_empty() {
                let full_href = if href.starts_with("http") { href.clone() } else { format!("{}{}", BASE_URL, href) };
                genres_final.push(format!("📖 {}|{}", lbl, full_href));
            } else {
                genres_final.push(format!("📖 {}", lbl));
            }
        }

        for (lbl, href) in countries_list.borrow().iter() {
            if !href.is_empty() {
                let full_href = if href.starts_with("http") { href.clone() } else { format!("{}{}", BASE_URL, href) };
                genres_final.push(format!("🌍 {}|{}", lbl, full_href));
            } else {
                genres_final.push(format!("🌍 {}", lbl));
            }
        }

        let mut desc_parts = Vec::new();
        if let Some(story) = story_txt_opt {
            desc_parts.push(story);
        }

        let style_names: Vec<String> = style_tags_list.borrow().iter().map(|(lbl, _)| lbl.clone()).collect();
        if !style_names.is_empty() {
            desc_parts.push(format!("🎨 Стиль: {}", style_names.join(", ")));
        }

        let plot_names: Vec<String> = plot_tags_list.borrow().iter().map(|(lbl, _)| lbl.clone()).collect();
        if !plot_names.is_empty() {
            desc_parts.push(format!("📖 Сюжет: {}", plot_names.join(", ")));
        }

        let description = if desc_parts.is_empty() { None } else { Some(desc_parts.join("\n\n")) };

        let mut final_years = years.borrow().clone();
        if final_years.is_empty() {
            if let Some(start) = final_title.find('(') {
                if let Some(end) = final_title[start..].find(')').map(|i| start + i) {
                    let y = &final_title[start + 1..end];
                    if y.len() == 4 && y.chars().all(|c| c.is_ascii_digit()) {
                        final_years.push(y.to_string());
                    }
                }
            }
        }

        let orig_title = original_title.borrow().clone();
        let rating = age_rating.borrow().clone();
        let final_episodes = similar_movies.borrow().clone();

        Ok(ProviderAnimeInfo {
            title: final_title,
            original_title: orig_title,
            description,
            cover_image: cover,
            genres: genres_final,
            years: final_years,
            age_rating: rating,
            episodes: final_episodes,
        })
    }

    async fn resolve_stream_url(&self, stream_url: &str, _proxy_url: &str) -> Result<String, AppError> {
        // Return stream url as-is since this is metadata only
        Ok(stream_url.to_string())
    }
}
