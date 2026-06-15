export const getProxiedImageUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("media.animetop.info") || url.includes("media.animevost.org")) {
    const isWindowsOrAndroid = /windows|android/i.test(navigator.userAgent);
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
