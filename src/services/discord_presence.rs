use std::sync::Mutex;

use discord_rich_presence::{
    activity,
    DiscordIpc,
    DiscordIpcClient,
};
use shaku::Component;

use super::{Anime4KMode, Anime4KQuality, DiscordPresenceService};

#[derive(Default)]
struct PresenceState {
    client_id: Option<String>,
    client: Option<DiscordIpcClient>,
    connected: bool,
    active_title: Option<String>,
    active_cover_url: Option<String>,
    paused: bool,
    anime4k_label: Option<String>,
    last_signature: Option<String>,
}

#[derive(Component)]
#[shaku(interface = DiscordPresenceService)]
pub struct DiscordPresenceServiceImpl {
    #[shaku(default)]
    state: Mutex<PresenceState>,
}

struct EffectiveDiscordConfig {
    enabled: bool,
    client_id: Option<String>,
}

impl DiscordPresenceServiceImpl {
    fn config() -> EffectiveDiscordConfig {
        let cfg = super::config::load_config();

        let env_client_id = std::env::var("ANIMESPHERE_DISCORD_CLIENT_ID")
            .ok()
            .or_else(|| std::env::var("DISCORD_CLIENT_ID").ok())
            .filter(|value| !value.trim().is_empty());

        let config_client_id = if cfg.discord_client_id.trim().is_empty() {
            None
        } else {
            Some(cfg.discord_client_id.trim().to_string())
        };

        let client_id = env_client_id.or(config_client_id).or_else(|| {
            // Default AnimeSphere Client ID fallback
            Some("1251640242253893693".to_string())
        });

        let env_enabled = std::env::var("ANIMESPHERE_DISCORD_PRESENCE_ENABLED")
            .ok()
            .map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"));

        let enabled = env_enabled.unwrap_or(cfg.discord_presence_enabled || client_id.is_some());

        EffectiveDiscordConfig { enabled, client_id }
    }

    fn anime4k_label(mode: &Anime4KMode) -> Option<String> {
        let label = match mode {
            Anime4KMode::Off => return None,
            Anime4KMode::ModeA(quality) => format!("Anime4K A·{}", Self::quality_label(quality)),
            Anime4KMode::ModeB(quality) => format!("Anime4K B·{}", Self::quality_label(quality)),
            Anime4KMode::ModeC(quality) => format!("Anime4K C·{}", Self::quality_label(quality)),
        };
        Some(label)
    }

    fn quality_label(quality: &Anime4KQuality) -> &'static str {
        match quality {
            Anime4KQuality::S => "S",
            Anime4KQuality::M => "M",
            Anime4KQuality::L => "L",
            Anime4KQuality::VL => "VL",
            Anime4KQuality::UL => "UL",
        }
    }

    fn sync_locked(state: &mut PresenceState) {
        let cfg = Self::config();

        if !cfg.enabled {
            Self::clear_locked(state);
            return;
        }

        let Some(client_id) = cfg.client_id else {
            return;
        };

        if state.client_id.as_deref() != Some(client_id.as_str()) {
            state.client = None;
            state.client_id = Some(client_id.clone());
            state.connected = false;
            state.last_signature = None;
        }

        if state.client.is_none() {
            match DiscordIpcClient::new(client_id.as_str()) {
                Ok(client) => {
                    state.client = Some(client);
                }
                Err(err) => {
                    eprintln!("[DiscordPresence] Failed to create IPC client: {err}");
                    return;
                }
            }
        }

        let Some(client) = state.client.as_mut() else {
            return;
        };

        if !state.connected {
            if let Err(err) = client.connect() {
                eprintln!("[DiscordPresence] Failed to connect to Discord IPC: {err}");
                state.client = None;
                state.connected = false;
                return;
            }
            state.connected = true;
        }

        let Some(title) = state.active_title.clone() else {
            if state.last_signature.is_some() {
                if let Err(err) = client.clear_activity() {
                    eprintln!("[DiscordPresence] Failed to clear activity: {err}");
                    state.connected = false;
                    state.client = None;
                }
                state.last_signature = None;
            }
            return;
        };

        let mut state_text = if state.paused {
            "Paused".to_string()
        } else {
            "Watching".to_string()
        };

        if let Some(anime4k) = state.anime4k_label.as_deref() {
            state_text.push_str(" · ");
            state_text.push_str(anime4k);
        }

        let cover_url = state.active_cover_url.as_deref().unwrap_or("large_icon");
        let signature = format!("{title}|{state_text}|{cover_url}");
        if state.last_signature.as_deref() == Some(signature.as_str()) {
            return;
        }

        let mut assets = activity::Assets::new();
        
        // Use external cover URL if available, otherwise fallback to static asset key
        if let Some(url) = state.active_cover_url.as_deref() {
            assets = assets.large_image(url);
        } else {
            assets = assets.large_image("large_icon");
        }
        assets = assets.large_text(title.as_str());

        // Add small status icon based on playback/anime4k state
        if state.paused {
            assets = assets.small_image("state_paused").small_text("Paused");
        } else if state.anime4k_label.is_some() {
            assets = assets.small_image("state_anime4k").small_text(state.anime4k_label.as_ref().unwrap().as_str());
        } else {
            assets = assets.small_image("state_playing").small_text("Playing");
        }

        let activity = activity::Activity::new()
            .details(title)
            .state(state_text)
            .assets(assets);

        if let Err(err) = client.set_activity(activity) {
            eprintln!("[DiscordPresence] Failed to set activity: {err}");
            state.connected = false;
            state.client = None;
            return;
        }

        state.last_signature = Some(signature);
    }

    fn clear_locked(state: &mut PresenceState) {
        state.active_title = None;
        state.active_cover_url = None;
        state.paused = false;
        state.anime4k_label = None;

        if let Some(client) = state.client.as_mut() {
            if state.last_signature.is_some() {
                let _ = client.clear_activity();
            }
        }

        state.last_signature = None;
    }
}

impl Default for DiscordPresenceServiceImpl {
    fn default() -> Self {
        Self {
            state: Mutex::new(PresenceState::default()),
        }
    }
}

impl DiscordPresenceService for DiscordPresenceServiceImpl {
    fn update_now_playing(&self, title: String, cover_url: Option<String>) {
        if let Ok(mut state) = self.state.lock() {
            state.active_title = Some(title);
            state.active_cover_url = cover_url;
            state.paused = false;
            Self::sync_locked(&mut state);
        }
    }

    fn set_paused(&self, paused: bool) {
        if let Ok(mut state) = self.state.lock() {
            state.paused = paused;
            Self::sync_locked(&mut state);
        }
    }

    fn set_anime4k(&self, mode: Anime4KMode) {
        if let Ok(mut state) = self.state.lock() {
            state.anime4k_label = Self::anime4k_label(&mode);
            Self::sync_locked(&mut state);
        }
    }

    fn clear(&self) {
        if let Ok(mut state) = self.state.lock() {
            Self::clear_locked(&mut state);
        }
    }

    fn refresh(&self) {
        if let Ok(mut state) = self.state.lock() {
            Self::sync_locked(&mut state);
        }
    }
}
