export const isAndroidRuntime = () => {
  if (typeof window === "undefined") return false;
  if ((window as any).__ANDROID__ !== undefined) return (window as any).__ANDROID__;
  const hostname = window.location?.hostname?.toLowerCase() || "";
  const protocol = window.location?.protocol?.toLowerCase() || "";
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  return (
    hostname === "wry.assets" ||
    (protocol === "https:" && hostname.endsWith(".assets")) ||
    /android/i.test(userAgent) ||
    protocol.startsWith("wry")
  );
};

export const getProxiedImageUrl = (url: string) => {
  if (!url) return "";
  if (
    url.includes("media.animetop.info") ||
    url.includes("media.animevost.org") ||
    url.includes("shikimori.one") ||
    url.includes("shikimori.me") ||
    url.includes("shikimori")
  ) {
    const isWindowsOrAndroid = /windows/i.test(navigator.userAgent) || isAndroidRuntime();
    const isHttps = url.startsWith("https");
    const proto = isHttps ? "https" : "http";
    const cleanUrl = url.replace(/^https?:\/\//i, "");
    if (isWindowsOrAndroid) {
      return `http://vostmedia.localhost/${proto}/${cleanUrl}`;
    } else {
      return `vostmedia://${proto}/${cleanUrl}`;
    }
  }
  return url;
};

export const formatTime = (secs: number) => {
  if (isNaN(secs) || secs < 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function getSafeStorage(key: string, defaultValue: string): string {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (e) {
    console.warn(`localStorage read failed for key "${key}":`, e);
    return defaultValue;
  }
}

export function setSafeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage write failed for key "${key}":`, e);
  }
}
