#![allow(dead_code)]

pub mod grpc_anime;
#[cfg(not(target_os = "android"))]
pub mod mpv_player;
pub mod animevost;
pub mod config;
pub mod jutsu;
pub mod animego;
pub mod shikimori;
pub mod provider_manager;
#[cfg(not(target_os = "android"))]
pub mod discord_presence;
pub mod headless;
pub mod aniliberty;
#[cfg(not(target_os = "android"))]
pub mod thumbnail_generator;
pub mod collaps;
pub mod kodik;
pub mod bestsimilar;


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
pub struct NerdStats {
    pub video_codec: String,
    pub audio_codec: String,
    pub width: i64,
    pub height: i64,
    pub fps: f64,
    pub hwdec: String,
    pub video_bitrate: f64,
    pub frame_drop_count: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct PlaybackState {
    pub time_pos: f64,
    pub duration: f64,
    pub paused: bool,
    pub volume: f64,
    pub demuxer_cache_duration: f64,
    pub nerd_stats: Option<NerdStats>,
    pub current_edition: i64,
    pub editions_count: i64,
    pub edition_list: String,
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

#[cfg(not(target_os = "android"))]
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
    CycleAudio,
    CycleSubtitles,
    SetQuality(i32),
}

#[async_trait::async_trait]
pub trait HeadlessService: Interface + Send + Sync {
    fn set_proxy(&self, proxy: tao::event_loop::EventLoopProxy<crate::window::UserEvent>);
    async fn navigate(&self, url: &str) -> Result<(), AppError>;
    async fn eval(&self, script: &str) -> Result<serde_json::Value, AppError>;
    fn resolve_callback(&self, callback_id: &str, success: bool, data: serde_json::Value);
}

#[async_trait::async_trait]
pub trait AnimeService: Interface + Send + Sync {
    async fn get_list(&self) -> Result<Vec<grpc_anime::proto::Anime>, AppError>;
    async fn get_stream(&self, id: i32) -> Result<grpc_anime::proto::StreamResponse, AppError>;
}

#[cfg(not(target_os = "android"))]
pub trait MpvService: Interface + Send + Sync {
    fn send_command(&self, cmd: MpvCommand) -> Result<(), AppError>;
    fn subscribe(&self) -> tokio::sync::broadcast::Receiver<PlaybackEvent>;
}

#[cfg(not(target_os = "android"))]
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
pub trait ShikimoriService: ContentProvider + Interface + Send + Sync {
    fn get_auth_url(&self, client_id: &str) -> String;
    async fn start_auth_flow(&self) -> Result<(), AppError>;
    async fn refresh_access_token(&self) -> Result<(), AppError>;
    async fn get_user_profile(&self) -> Result<serde_json::Value, AppError>;
    async fn get_user_bookmarks(&self, limit: i32) -> Result<serde_json::Value, AppError>;
    async fn get_user_friends(&self) -> Result<serde_json::Value, AppError>;
    async fn get_friend_bookmarks(&self, friend_id_or_nickname: &str, limit: i32) -> Result<serde_json::Value, AppError>;
}

#[async_trait::async_trait]
pub trait AniLibertyService: ContentProvider + Interface + Send + Sync {}

#[async_trait::async_trait]
pub trait CollapsService: ContentProvider + Interface + Send + Sync {}

#[async_trait::async_trait]
pub trait CollapsDashService: ContentProvider + Interface + Send + Sync {}

#[async_trait::async_trait]
pub trait KodikService: ContentProvider + Interface + Send + Sync {}

#[async_trait::async_trait]
pub trait BestSimilarService: ContentProvider + Interface + Send + Sync {}

pub use provider_manager::ProviderManager;

#[cfg(not(target_os = "android"))]
#[async_trait::async_trait]
pub trait ThumbnailService: Interface + Send + Sync {
    async fn load_video(&self, url: String) -> Result<(), AppError>;
    async fn get_thumbnail(&self, time: f64) -> Result<String, AppError>;
}
