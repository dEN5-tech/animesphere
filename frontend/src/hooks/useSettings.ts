import { useState, useEffect } from 'preact/hooks';
import { callNative } from '../lib/ipc';

export function useSettings() {
  const [showSettings, setShowSettings] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("http://127.0.0.1:2080");
  const [searchProvider, setSearchProvider] = useState("animevost");
  const [discordPresenceEnabled, setDiscordPresenceEnabled] = useState(false);
  const [discordClientId, setDiscordClientId] = useState("");

  const loadSettings = async () => {
    try {
      const config = await callNative<{ proxy_url: string, search_provider: string, discord_presence_enabled: boolean, discord_client_id: string }>("get_settings");
      setProxyUrl(config.proxy_url);
      setSearchProvider(config.search_provider || "animevost");
      setDiscordPresenceEnabled(config.discord_presence_enabled || false);
      setDiscordClientId(config.discord_client_id || "");
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    showSettings, setShowSettings,
    proxyUrl, setProxyUrl,
    searchProvider, setSearchProvider,
    discordPresenceEnabled, setDiscordPresenceEnabled,
    discordClientId, setDiscordClientId,
    loadSettings
  };
}
