import { useState, useEffect } from 'preact/hooks';
import { callNative } from '../lib/ipc';

export function useSettings() {
  const [showSettings, setShowSettings] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("http://127.0.0.1:2080");
  const [searchProvider, setSearchProvider] = useState("animevost");
  const [discordPresenceEnabled, setDiscordPresenceEnabled] = useState(false);
  const [discordClientId, setDiscordClientId] = useState("");
  const [shikimoriClientId, setShikimoriClientId] = useState("");
  const [shikimoriClientSecret, setShikimoriClientSecret] = useState("");
  const [shikimoriAuthorized, setShikimoriAuthorized] = useState(false);
  const [shikimoriLoggingIn, setShikimoriLoggingIn] = useState(false);
  const [shikimoriProfile, setShikimoriProfile] = useState<{ nickname: string, avatar: string, url: string } | null>(null);

  const loadSettings = async () => {
    try {
      const config = await callNative<{
        proxy_url: string,
        search_provider: string,
        discord_presence_enabled: boolean,
        discord_client_id: string,
        shikimori_client_id: string,
        shikimori_client_secret: string
      }>("get_settings");
      setProxyUrl(config.proxy_url);
      setSearchProvider(config.search_provider || "animevost");
      setDiscordPresenceEnabled(config.discord_presence_enabled || false);
      setDiscordClientId(config.discord_client_id || "");
      setShikimoriClientId(config.shikimori_client_id || "");
      setShikimoriClientSecret(config.shikimori_client_secret || "");

      const status = await callNative<{ authorized: boolean, profile: { nickname: string, avatar: string, url: string } | null }>("shikimori_status");
      setShikimoriAuthorized(status.authorized);
      setShikimoriProfile(status.profile || null);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loginShikimori = async () => {
    setShikimoriLoggingIn(true);
    try {
      await callNative<any>("shikimori_login");
      const status = await callNative<{ authorized: boolean, profile: { nickname: string, avatar: string, url: string } | null }>("shikimori_status");
      setShikimoriAuthorized(status.authorized);
      setShikimoriProfile(status.profile || null);
    } catch (err) {
      console.error("Shikimori login failed:", err);
      alert("Ошибка авторизации Shikimori: " + err);
    } finally {
      setShikimoriLoggingIn(false);
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
    shikimoriClientId, setShikimoriClientId,
    shikimoriClientSecret, setShikimoriClientSecret,
    shikimoriAuthorized, setShikimoriAuthorized,
    shikimoriLoggingIn, setShikimoriLoggingIn,
    shikimoriProfile, setShikimoriProfile,
    loginShikimori,
    loadSettings
  };
}
