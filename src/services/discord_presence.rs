use std::sync::Mutex;

use shaku::Component;
use super::{Anime4KMode, Anime4KQuality, DiscordPresenceService};

// =========================================================================
// Desktop Implementation (Windows, Linux, macOS)
// =========================================================================
#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
use discord_rich_presence::{
    activity,
    DiscordIpc,
    DiscordIpcClient,
};

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
#[derive(Default)]
pub(crate) struct PresenceState {
    client_id: Option<String>,
    client: Option<DiscordIpcClient>,
    connected: bool,
    active_title: Option<String>,
    active_cover_url: Option<String>,
    paused: bool,
    anime4k_label: Option<String>,
    last_signature: Option<String>,
}

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
#[derive(Component)]
#[shaku(interface = DiscordPresenceService)]
pub struct DiscordPresenceServiceImpl {
    #[shaku(default)]
    state: Mutex<PresenceState>,
}

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
struct EffectiveDiscordConfig {
    enabled: bool,
    client_id: Option<String>,
}

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
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
            Some("925843819302379581".to_string())
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
            let client = DiscordIpcClient::new(client_id.as_str());
            state.client = Some(client);
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
        
        let base_url = "https://raw.githubusercontent.com/dEN5-tech/animesphere/main/assets";
        
        let large_image_url: String;
        // Use external cover URL if available, otherwise fallback to brand icon URL
        if let Some(url) = state.active_cover_url.as_deref() {
            large_image_url = url.to_string();
        } else {
            large_image_url = format!("{}/icon_512.png", base_url);
        }
        assets = assets.large_image(&large_image_url);
        assets = assets.large_text(&title);

        let small_image_url: String;
        let small_text: String;
        // Add small status icon based on playback/anime4k state using external URLs
        if state.paused {
            small_image_url = format!("{}/discord_paused.png", base_url);
            small_text = "Paused".to_string();
        } else if let Some(label) = state.anime4k_label.as_ref() {
            small_image_url = format!("{}/discord_anime4k.png", base_url);
            small_text = label.clone();
        } else {
            small_image_url = format!("{}/discord_playing.png", base_url);
            small_text = "Playing".to_string();
        }
        
        assets = assets.small_image(&small_image_url).small_text(&small_text);

        let activity = activity::Activity::new()
            .details(&title)
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

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
impl Default for DiscordPresenceServiceImpl {
    fn default() -> Self {
        Self {
            state: Mutex::new(PresenceState::default()),
        }
    }
}

#[cfg(any(target_os = "windows", target_os = "linux", target_os = "macos"))]
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

// =========================================================================
// Stub Implementation (Android and other non-desktop platforms)
// =========================================================================
#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
#[derive(Component)]
#[shaku(interface = DiscordPresenceService)]
pub struct DiscordPresenceServiceImpl {}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
impl Default for DiscordPresenceServiceImpl {
    fn default() -> Self {
        Self {}
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
impl DiscordPresenceService for DiscordPresenceServiceImpl {
    fn update_now_playing(&self, _title: String, _cover_url: Option<String>) {}
    fn set_paused(&self, _paused: bool) {}
    fn set_anime4k(&self, _mode: Anime4KMode) {}
    fn clear(&self) {}
    fn refresh(&self) {}
}
