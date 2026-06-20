use wry::RequestAsyncResponder;

pub fn handle_vostmedia(
    tokio_runtime: &tokio::runtime::Handle,
    request: wry::http::Request<Vec<u8>>,
    responder: RequestAsyncResponder,
) {
    let tokio_proto = tokio_runtime.clone();
    let uri_str = request.uri().to_string();
    println!("[VostMedia] Original URI: {}", uri_str);
    let target_url = if let Some(pos) = uri_str.find("vostmedia.localhost/http/") {
        format!("http://{}", &uri_str[pos + "vostmedia.localhost/http/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia.localhost/https/") {
        format!("https://{}", &uri_str[pos + "vostmedia.localhost/https/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia://localhost/http/") {
        format!("http://{}", &uri_str[pos + "vostmedia://localhost/http/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia://localhost/https/") {
        format!("https://{}", &uri_str[pos + "vostmedia://localhost/https/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia://http/") {
        format!("http://{}", &uri_str[pos + "vostmedia://http/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia://https/") {
        format!("https://{}", &uri_str[pos + "vostmedia://https/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia.localhost/") {
        format!("http://{}", &uri_str[pos + "vostmedia.localhost/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia://localhost/") {
        format!("http://{}", &uri_str[pos + "vostmedia://localhost/".len()..])
    } else if let Some(pos) = uri_str.find("vostmedia://") {
        format!("http://{}", &uri_str[pos + "vostmedia://".len()..])
    } else {
        uri_str
    };
    println!("[VostMedia] Target URL: {}", target_url);

    tokio_proto.spawn(async move {
        let config = crate::services::config::load_config();
        println!("[VostMedia] Configured Proxy: {}", config.proxy_url);
        let client_builder = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(10));
        let client_builder = if !config.proxy_url.trim().is_empty() {
            if let Ok(proxy) = reqwest::Proxy::all(&config.proxy_url) {
                client_builder.proxy(proxy)
            } else {
                client_builder
            }
        } else {
            client_builder
        };

        let respond_err = |responder: wry::RequestAsyncResponder, status: u16, msg: String| {
            println!("[VostMedia] Error for target {}: {}", target_url, msg);
            let body: std::borrow::Cow<'static, [u8]> = std::borrow::Cow::Owned(msg.into_bytes());
            let response = wry::http::Response::builder()
                .status(status)
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", "text/plain")
                .body(body)
                .unwrap();
            responder.respond(response);
        };

        // Check cache first
        if let Some((cached_content_type, cached_bytes)) = crate::services::config::get_cached_image(&target_url) {
            println!("[VostMedia] Cache HIT for target: {}", target_url);
            let body: std::borrow::Cow<'static, [u8]> = std::borrow::Cow::Owned(cached_bytes);
            let response = wry::http::Response::builder()
                .status(200)
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", cached_content_type)
                .body(body)
                .unwrap();
            responder.respond(response);
            return;
        }

        println!("[VostMedia] Cache MISS for target: {}", target_url);

        let has_proxy = !config.proxy_url.trim().is_empty();

        match client_builder.build() {
            Ok(client) => {
                let mut res = client.get(&target_url).send().await;

                if has_proxy {
                    let should_fallback = match &res {
                        Err(_) => true,
                        Ok(r) => r.status() == reqwest::StatusCode::GONE || r.status() == reqwest::StatusCode::FORBIDDEN,
                    };
                    if should_fallback {
                        println!("[VostMedia] Proxy request failed or was blocked (status: {:?}). Retrying WITHOUT proxy.", res.as_ref().map(|r| r.status()));
                        let direct_client = reqwest::Client::builder()
                            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                            .timeout(std::time::Duration::from_secs(10))
                            .build();
                        match direct_client {
                            Ok(dc) => {
                                res = dc.get(&target_url).send().await;
                            }
                            Err(e) => {
                                println!("[VostMedia] Failed to build direct client: {}", e);
                            }
                        }
                    }
                }

                match res {
                    Ok(res) => {
                        let status = res.status();
                        let content_type = res.headers()
                            .get(reqwest::header::CONTENT_TYPE)
                            .and_then(|v| v.to_str().ok())
                            .unwrap_or("image/jpeg")
                            .to_string();
                        match res.bytes().await {
                            Ok(bytes) => {
                                // Save to Cache
                                let _ = crate::services::config::save_cached_image(&target_url, &content_type, &bytes);

                                let body: std::borrow::Cow<'static, [u8]> = std::borrow::Cow::Owned(bytes.to_vec());
                                let response = wry::http::Response::builder()
                                    .status(status.as_u16())
                                    .header("Access-Control-Allow-Origin", "*")
                                    .header("Content-Type", content_type)
                                    .body(body)
                                    .unwrap();
                                responder.respond(response);
                            }
                            Err(e) => {
                                respond_err(responder, 500, format!("Failed to read image bytes: {}", e));
                            }
                        }
                    }
                    Err(e) => {
                        respond_err(responder, 500, format!("Failed to fetch image: {}", e));
                    }
                }
            }
            Err(e) => {
                respond_err(responder, 500, format!("Failed to build client: {}", e));
            }
        }
    });
}
