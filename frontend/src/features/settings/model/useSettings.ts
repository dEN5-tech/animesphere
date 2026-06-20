import { useEffect } from 'preact/hooks';
import { useAtomValue, useSetAtom } from 'jotai';
import { useServices } from '../../../shared/di/context';
import { jotaiStore } from '../../../shared/store/jotaiStore';
import * as store from './store';
import * as uiStore from '../../../entities/ui';
import * as userEntity from '../../../entities/user';
import { setSafeStorage } from '../../../shared/lib/utils';

export function useSettings() {
  const { settingsService } = useServices();

  // Reactive reads
  const showSettingsVal = useAtomValue(store.showSettings);
  const proxyUrlVal = useAtomValue(store.proxyUrl);
  const searchProviderVal = useAtomValue(store.searchProvider);
  const discordPresenceEnabledVal = useAtomValue(store.discordPresenceEnabled);
  const discordClientIdVal = useAtomValue(store.discordClientId);
  const shikimoriClientIdVal = useAtomValue(store.shikimoriClientId);
  const shikimoriClientSecretVal = useAtomValue(store.shikimoriClientSecret);
  const shikimoriAuthorizedVal = useAtomValue(userEntity.shikimoriAuthorized);
  const shikimoriLoggingInVal = useAtomValue(store.shikimoriLoggingIn);
  const shikimoriProfileVal = useAtomValue(userEntity.shikimoriProfile);
  const syncServerUrlVal = useAtomValue(store.syncServerUrl);

  // Setters
  const setShowSettings = useSetAtom(store.showSettings);
  const setProxyUrl = useSetAtom(store.proxyUrl);
  const setSearchProvider = useSetAtom(store.searchProvider);
  const setDiscordPresenceEnabled = useSetAtom(store.discordPresenceEnabled);
  const setDiscordClientId = useSetAtom(store.discordClientId);
  const setShikimoriClientId = useSetAtom(store.shikimoriClientId);
  const setShikimoriClientSecret = useSetAtom(store.shikimoriClientSecret);
  const setShikimoriAuthorized = useSetAtom(userEntity.shikimoriAuthorized);
  const setShikimoriLoggingIn = useSetAtom(store.shikimoriLoggingIn);
  const setShikimoriProfile = useSetAtom(userEntity.shikimoriProfile);
  const setSyncServerUrl = useSetAtom(store.syncServerUrl);

  const loadSettings = async () => {
    try {
      const config = await settingsService.getSettings();
      jotaiStore.set(store.proxyUrl, config.proxy_url);
      jotaiStore.set(store.searchProvider, config.search_provider || "animevost");
      jotaiStore.set(store.discordPresenceEnabled, config.discord_presence_enabled || false);
      jotaiStore.set(store.discordClientId, config.discord_client_id || "");
      jotaiStore.set(store.shikimoriClientId, config.shikimori_client_id || "");
      jotaiStore.set(store.shikimoriClientSecret, config.shikimori_client_secret || "");

      const status = await settingsService.shikimoriStatus();
      jotaiStore.set(userEntity.shikimoriAuthorized, status.authorized);
      jotaiStore.set(userEntity.shikimoriProfile, status.profile || null);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loginShikimori = async () => {
    jotaiStore.set(store.shikimoriLoggingIn, true);
    try {
      await settingsService.shikimoriLogin();
      const status = await settingsService.shikimoriStatus();
      jotaiStore.set(userEntity.shikimoriAuthorized, status.authorized);
      jotaiStore.set(userEntity.shikimoriProfile, status.profile || null);
    } catch (err) {
      console.error("Shikimori login failed:", err);
      alert("Ошибка авторизации Shikimori: " + err);
    } finally {
      jotaiStore.set(store.shikimoriLoggingIn, false);
    }
  };

  const saveConfig = () => {
    jotaiStore.set(uiStore.globalError, null);
    setSafeStorage("sync_server_url", jotaiStore.get(store.syncServerUrl));
    return settingsService.saveSettings(JSON.stringify({
      proxy_url: jotaiStore.get(store.proxyUrl),
      search_provider: jotaiStore.get(store.searchProvider),
      discord_presence_enabled: jotaiStore.get(store.discordPresenceEnabled),
      discord_client_id: jotaiStore.get(store.discordClientId),
      shikimori_client_id: jotaiStore.get(store.shikimoriClientId),
      shikimori_client_secret: jotaiStore.get(store.shikimoriClientSecret),
    }))
      .catch((err: any) => {
        jotaiStore.set(uiStore.globalError, 'Ошибка сохранения настроек: ' + err);
        throw err;
      });
  };

  useEffect(() => {
    // Avoid double fetching
    if (jotaiStore.get(store.proxyUrl) === "http://127.0.0.1:2080") {
      loadSettings();
    }
  }, []);

  return {
    showSettings: showSettingsVal,
    setShowSettings,

    proxyUrl: proxyUrlVal,
    setProxyUrl,

    searchProvider: searchProviderVal,
    setSearchProvider,

    discordPresenceEnabled: discordPresenceEnabledVal,
    setDiscordPresenceEnabled,

    discordClientId: discordClientIdVal,
    setDiscordClientId,

    shikimoriClientId: shikimoriClientIdVal,
    setShikimoriClientId,

    shikimoriClientSecret: shikimoriClientSecretVal,
    setShikimoriClientSecret,

    shikimoriAuthorized: shikimoriAuthorizedVal,
    setShikimoriAuthorized,

    shikimoriLoggingIn: shikimoriLoggingInVal,
    setShikimoriLoggingIn,

    shikimoriProfile: shikimoriProfileVal,
    setShikimoriProfile,

    syncServerUrl: syncServerUrlVal,
    setSyncServerUrl,

    loginShikimori,
    loadSettings,
    saveConfig,
  };
}
