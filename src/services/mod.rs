pub mod grpc_anime;
pub mod mpv_player;
pub mod animevost;
pub mod config;
pub mod jutsu;
pub mod animego;
pub mod shikimori;
pub mod provider_manager;
pub mod discord_presence;

use shaku::Interface;
use crate::error::AppError;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProviderEpisode {
    pub name: String,
    pub url: String,
    pub preview_image: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProviderAnimeInfo {
    pub title: String,
    pub original_title: Option<String>,
    pub description: Option<String>,
    pub cover_image: Option<String>,
    pub genres: Vec<String>,
    pub years: Vec<String>,
    pub age_rating: Option<String>,
    pub episodes: Vec<ProviderEpisode>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProviderSearchResult {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub cover_image: Option<String>,
}

#[async_trait::async_trait]
pub trait ContentProvider: Send + Sync {
    fn can_handle(&self, identifier: &str) -> bool;
    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError>;
    async fn search(&self, query: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError>;
    async fn resolve_stream_url(&self, stream_url: &str, proxy_url: &str) -> Result<String, AppError>;
}


#[derive(Debug, Clone, serde::Serialize)]
pub struct PlaybackState {
    pub time_pos: f64,
    pub duration: f64,
    pub paused: bool,
    pub volume: f64,
}

#[derive(Debug, Clone)]
pub enum PlaybackEvent {
    StateUpdate(PlaybackState),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Anime4KQuality {
    S,
    M,
    L,
    VL,
    UL,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum Anime4KMode {
    Off,
    ModeA(Anime4KQuality),
    ModeB(Anime4KQuality),
    ModeC(Anime4KQuality),
}

pub enum MpvCommand {
    AttachWindow(i64),
    LoadVideo(String),
    Play,
    Pause,
    Stop,
    Seek(f64),
    SetVolume(f64),
    SetAnime4K(Anime4KMode),
    ClearShaders,
}

#[async_trait::async_trait]
pub trait AnimeService: Interface + Send + Sync {
    async fn get_list(&self) -> Result<Vec<grpc_anime::proto::Anime>, AppError>;
    async fn get_stream(&self, id: i32) -> Result<grpc_anime::proto::StreamResponse, AppError>;
}

pub trait MpvService: Interface + Send + Sync {
    fn send_command(&self, cmd: MpvCommand) -> Result<(), AppError>;
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<PlaybackEvent>;
}

pub trait DiscordPresenceService: Interface + Send + Sync {
    fn update_now_playing(&self, title: String, cover_url: Option<String>);
    fn set_paused(&self, paused: bool);
    fn set_anime4k(&self, mode: Anime4KMode);
    fn clear(&self);
    fn refresh(&self);
}

pub use animevost::{AnimeVostTitle, AnimeVostEpisode};

#[async_trait::async_trait]
pub trait AnimeVostService: ContentProvider + Interface + Send + Sync {
    async fn import_by_id(&self, id: i32, proxy_url: &str) -> Result<(), AppError>;
    async fn get_info(&self, id: i32, proxy_url: &str) -> Result<AnimeVostTitle, AppError>;
    async fn get_playlist(&self, id: i32, proxy_url: &str) -> Result<Vec<AnimeVostEpisode>, AppError>;
    async fn get_list(&self, page: i32, limit: i32, proxy_url: &str) -> Result<Vec<AnimeVostTitle>, AppError>;
    async fn get_last(&self, page: i32, limit: i32, proxy_url: &str) -> Result<Vec<AnimeVostTitle>, AppError>;
    async fn search_vost(&self, query: &str, proxy_url: &str) -> Result<Vec<AnimeVostTitle>, AppError>;
}

pub use jutsu::JutsuAnimeInfo;

#[async_trait::async_trait]
pub trait JutsuService: ContentProvider + Interface + Send + Sync {
    async fn get_anime_info_raw(&self, url: &str, proxy_url: &str) -> Result<JutsuAnimeInfo, AppError>;
    async fn get_mp4_link(&self, url: &str, proxy_url: &str) -> Result<std::collections::HashMap<String, String>, AppError>;
    async fn import_by_url(&self, url: &str, proxy_url: &str) -> Result<(), AppError>;
}

#[async_trait::async_trait]
pub trait AnimegoService: ContentProvider + Interface + Send + Sync {}

#[async_trait::async_trait]
pub trait ShikimoriService: ContentProvider + Interface + Send + Sync {}

pub use provider_manager::ProviderManager;
