use shaku::module;
use crate::services::grpc_anime::AnimeServiceImpl;
use crate::services::animevost::AnimeVostServiceImpl;
use crate::services::jutsu::JutsuServiceImpl;
use crate::services::animego::AnimegoServiceImpl;
use crate::services::shikimori::ShikimoriServiceImpl;
use crate::services::provider_manager::ProviderManagerImpl;
use crate::services::headless::HeadlessServiceImpl;
use crate::services::aniliberty::AniLibertyServiceImpl;
use crate::services::collaps::{CollapsServiceImpl, CollapsDashServiceImpl};
use crate::services::kodik::KodikServiceImpl;
use crate::services::bestsimilar::BestSimilarServiceImpl;

#[cfg(not(target_os = "android"))]
use crate::services::mpv_player::MpvPlayerServiceImpl;
#[cfg(not(target_os = "android"))]
use crate::services::discord_presence::DiscordPresenceServiceImpl;
#[cfg(not(target_os = "android"))]
use crate::services::thumbnail_generator::ThumbnailServiceImpl;

// ─── Desktop DI Module (includes MPV, Discord, Thumbnail) ────────────────────
#[cfg(not(target_os = "android"))]
module! {
    pub AppModule {
        components = [
            AnimeServiceImpl,
            MpvPlayerServiceImpl,
            AnimeVostServiceImpl,
            JutsuServiceImpl,
            AnimegoServiceImpl,
            ShikimoriServiceImpl,
            ProviderManagerImpl,
            DiscordPresenceServiceImpl,
            HeadlessServiceImpl,
            AniLibertyServiceImpl,
            ThumbnailServiceImpl,
            CollapsServiceImpl,
            CollapsDashServiceImpl,
            KodikServiceImpl,
            BestSimilarServiceImpl
        ],
        providers = []
    }
}

// ─── Android DI Module (no MPV, Discord, Thumbnail — native-only services) ───
#[cfg(target_os = "android")]
module! {
    pub AppModule {
        components = [
            AnimeServiceImpl,
            AnimeVostServiceImpl,
            JutsuServiceImpl,
            AnimegoServiceImpl,
            ShikimoriServiceImpl,
            ProviderManagerImpl,
            HeadlessServiceImpl,
            AniLibertyServiceImpl,
            CollapsServiceImpl,
            CollapsDashServiceImpl,
            KodikServiceImpl,
            BestSimilarServiceImpl
        ],
        providers = []
    }
}
