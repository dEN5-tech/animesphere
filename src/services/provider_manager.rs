use shaku::{Component, Interface};
use crate::error::AppError;
use std::sync::Arc;
use super::{ProviderAnimeInfo, ProviderSearchResult};
use super::{AnimeVostService, JutsuService, AnimegoService, ShikimoriService, AniLibertyService};

#[async_trait::async_trait]
pub trait ProviderManager: Interface + Send + Sync {
    fn can_handle(&self, identifier: &str) -> bool;
    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError>;
    async fn search(&self, query: &str, provider: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError>;
    async fn resolve_stream_url(&self, stream_url: &str, proxy_url: &str) -> Result<String, AppError>;
}

#[derive(Component)]
#[shaku(interface = ProviderManager)]
pub struct ProviderManagerImpl {
    #[shaku(inject)]
    animevost: Arc<dyn AnimeVostService>,
    #[shaku(inject)]
    jutsu: Arc<dyn JutsuService>,
    #[shaku(inject)]
    animego: Arc<dyn AnimegoService>,
    #[shaku(inject)]
    shikimori: Arc<dyn ShikimoriService>,
    #[shaku(inject)]
    aniliberty: Arc<dyn AniLibertyService>,
}

#[async_trait::async_trait]
impl ProviderManager for ProviderManagerImpl {
    fn can_handle(&self, identifier: &str) -> bool {
        self.animevost.can_handle(identifier)
            || self.jutsu.can_handle(identifier)
            || self.animego.can_handle(identifier)
            || self.shikimori.can_handle(identifier)
            || self.aniliberty.can_handle(identifier)
    }

    async fn get_anime_info(&self, identifier: &str, proxy_url: &str) -> Result<ProviderAnimeInfo, AppError> {
        if self.jutsu.can_handle(identifier) {
            self.jutsu.get_anime_info(identifier, proxy_url).await
        } else if self.animego.can_handle(identifier) {
            self.animego.get_anime_info(identifier, proxy_url).await
        } else if self.shikimori.can_handle(identifier) {
            self.shikimori.get_anime_info(identifier, proxy_url).await
        } else if self.aniliberty.can_handle(identifier) {
            self.aniliberty.get_anime_info(identifier, proxy_url).await
        } else if self.animevost.can_handle(identifier) {
            self.animevost.get_anime_info(identifier, proxy_url).await
        } else {
            Err(AppError::Mpv(format!("No provider can handle identifier: {}", identifier)))
        }
    }

    async fn search(&self, query: &str, provider: &str, proxy_url: &str) -> Result<Vec<ProviderSearchResult>, AppError> {
        let mut results = Vec::new();
        if provider.eq_ignore_ascii_case("animevost") {
            if let Ok(res) = self.animevost.search(query, proxy_url).await {
                results.extend(res);
            }
        } else if provider.eq_ignore_ascii_case("jutsu") {
            if let Ok(res) = self.jutsu.search(query, proxy_url).await {
                results.extend(res);
            }
        } else if provider.eq_ignore_ascii_case("animego") {
            if let Ok(res) = self.animego.search(query, proxy_url).await {
                results.extend(res);
            }
        } else if provider.eq_ignore_ascii_case("shikimori") {
            if let Ok(res) = self.shikimori.search(query, proxy_url).await {
                results.extend(res);
            }
        } else if provider.eq_ignore_ascii_case("aniliberty") {
            if let Ok(res) = self.aniliberty.search(query, proxy_url).await {
                results.extend(res);
            }
        } else {
            // all providers
            if let Ok(res) = self.animevost.search(query, proxy_url).await {
                results.extend(res);
            }
            if let Ok(res) = self.jutsu.search(query, proxy_url).await {
                results.extend(res);
            }
            if let Ok(res) = self.animego.search(query, proxy_url).await {
                results.extend(res);
            }
            if let Ok(res) = self.shikimori.search(query, proxy_url).await {
                results.extend(res);
            }
            if let Ok(res) = self.aniliberty.search(query, proxy_url).await {
                results.extend(res);
            }
        }
        Ok(results)
    }

    async fn resolve_stream_url(&self, stream_url: &str, proxy_url: &str) -> Result<String, AppError> {
        if self.jutsu.can_handle(stream_url) {
            self.jutsu.resolve_stream_url(stream_url, proxy_url).await
        } else if self.animego.can_handle(stream_url) {
            self.animego.resolve_stream_url(stream_url, proxy_url).await
        } else if self.aniliberty.can_handle(stream_url) {
            self.aniliberty.resolve_stream_url(stream_url, proxy_url).await
        } else if self.animevost.can_handle(stream_url) {
            self.animevost.resolve_stream_url(stream_url, proxy_url).await
        } else {
            // Fallback — return as-is (handles shikimori:// and direct URLs)
            Ok(stream_url.to_string())
        }
    }
}
