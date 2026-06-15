use shaku::module;
use crate::services::grpc_anime::AnimeServiceImpl;
use crate::services::mpv_player::MpvPlayerServiceImpl;
use crate::services::animevost::AnimeVostServiceImpl;
use crate::services::jutsu::JutsuServiceImpl;
use crate::services::animego::AnimegoServiceImpl;
use crate::services::shikimori::ShikimoriServiceImpl;
use crate::services::provider_manager::ProviderManagerImpl;
use crate::services::discord_presence::DiscordPresenceServiceImpl;

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
            DiscordPresenceServiceImpl
        ],
        providers = []
    }
}
