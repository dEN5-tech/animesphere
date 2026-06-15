pub mod proto {
    tonic::include_proto!("anime");
}

use std::fs::File;
use std::io::{Read, Write};
use serde::{Deserialize, Serialize};
use proto::anime_service_server::{AnimeService, AnimeServiceServer};
use proto::{Anime, AnimeListResponse, Empty, StreamRequest, StreamResponse};
use tonic::{Request, Response, Status};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DbAnime {
    pub id: i32,
    pub title: String,
    pub description: String,
    pub stream_url: String,
    pub cover_image: String,
}

// Load database from file or write seeded defaults if missing
fn load_database() -> Vec<DbAnime> {
    let path = crate::services::config::get_episodes_path();
    crate::services::config::ensure_config_dir();
    if path.exists() {
        if let Ok(mut file) = File::open(&path) {
            let mut content = String::new();
            if file.read_to_string(&mut content).is_ok() {
                if let Ok(data) = serde_json::from_str::<Vec<DbAnime>>(&content) {
                    println!("Successfully loaded {} catalog entries from episodes.json", data.len());
                    return data;
                }
            }
        }
    }

    println!("episodes.json not found or corrupted. Seeding default anime metadata catalog...");
    let seeded = vec![
        DbAnime {
            id: 1,
            title: "Власть книжного червя: Приёмная дочь лорда  1 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 1".to_string(),
            stream_url: "http://video.animetop.info/720/722517103.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 2,
            title: "Власть книжного червя: Приёмная дочь лорда  2 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 2".to_string(),
            stream_url: "http://video.animetop.info/720/1510382619.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 3,
            title: "Власть книжного червя: Приёмная дочь лорда  3 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 3".to_string(),
            stream_url: "http://video.animetop.info/720/588130062.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 4,
            title: "Власть книжного червя: Приёмная дочь лорда  4 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 4".to_string(),
            stream_url: "http://video.animetop.info/720/1381494862.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 5,
            title: "Власть книжного червя: Приёмная дочь лорда  5 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 5".to_string(),
            stream_url: "http://video.animetop.info/720/734449122.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 6,
            title: "Власть книжного червя: Приёмная дочь лорда  6 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 6".to_string(),
            stream_url: "http://video.animetop.info/720/1712548772.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 7,
            title: "Власть книжного червя: Приёмная дочь лорда  7 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 7".to_string(),
            stream_url: "http://video.animetop.info/720/1420834.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 8,
            title: "Власть книжного червя: Приёмная дочь лорда  8 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 8".to_string(),
            stream_url: "http://video.animetop.info/720/511580829.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 9,
            title: "Власть книжного червя: Приёмная дочь лорда  9 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 9".to_string(),
            stream_url: "http://video.animetop.info/720/1460835072.mp4".to_string(),
            cover_image: "".to_string(),
        },
        DbAnime {
            id: 10,
            title: "Власть книжного червя: Приёмная дочь лорда  10 серия".to_string(),
            description: "Ascendance of a Bookworm: Part III - Episode 10".to_string(),
            stream_url: "http://video.animetop.info/720/55749527.mp4".to_string(),
            cover_image: "".to_string(),
        },
    ];

    if let Ok(content) = serde_json::to_string_pretty(&seeded) {
        if let Ok(mut file) = File::create(&path) {
            let _ = file.write_all(content.as_bytes());
        }
    }

    seeded
}

use std::sync::OnceLock;
use std::sync::RwLock;

fn get_database() -> &'static RwLock<Vec<DbAnime>> {
    static DB: OnceLock<RwLock<Vec<DbAnime>>> = OnceLock::new();
    DB.get_or_init(|| RwLock::new(load_database()))
}

pub fn reload_database() -> Result<(), String> {
    let fresh_db = load_database();
    let mut db_lock = get_database().write().map_err(|e| e.to_string())?;
    *db_lock = fresh_db;
    Ok(())
}

pub struct AnimeServiceImpl {}

impl AnimeServiceImpl {
    pub fn new() -> Self {
        // Ensure static initialization happens
        let _ = get_database();
        Self {}
    }
}

#[async_trait::async_trait]
impl AnimeService for AnimeServiceImpl {
    async fn get_anime_list(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<AnimeListResponse>, Status> {
        let db = get_database().read().map_err(|_| Status::internal("Database lock poisoned"))?;
        let animes = db.iter().map(|item| {
            Anime {
                id: item.id,
                title: item.title.clone(),
                description: item.description.clone(),
                cover_image: item.cover_image.clone(),
            }
        }).collect();
        Ok(Response::new(AnimeListResponse { animes }))
    }

    async fn get_anime_streams(
        &self,
        request: Request<StreamRequest>,
    ) -> Result<Response<StreamResponse>, Status> {
        let req = request.into_inner();
        let db = get_database().read().map_err(|_| Status::internal("Database lock poisoned"))?;
        if let Some(found) = db.iter().find(|item| item.id == req.anime_id) {
            Ok(Response::new(StreamResponse {
                stream_url: found.stream_url.clone(),
                title: found.title.clone(),
            }))
        } else {
            Err(Status::not_found("Anime not found in database"))
        }
    }
}

pub async fn run_local_server(addr: std::net::SocketAddr) -> Result<(), tonic::transport::Error> {
    println!("Starting AnimeSphere local gRPC Metadata Server on {}", addr);
    let service = AnimeServiceImpl::new();
    tonic::transport::Server::builder()
        .add_service(AnimeServiceServer::new(service))
        .serve(addr)
        .await
}
