// SI-assisted (Claude Code); reviewed by <name>

// The browsers built into chat and social apps (Instagram, Facebook, TikTok, Snapchat, LINE,
// and Android WebViews in general) often ignore file downloads. "; wv)" is the Android WebView marker.
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Snapchat|TikTok|musical_ly|BytedanceWebview|\bLine\/|; wv\)/i;

/** True when the page runs inside an app's built-in browser, where a PDF download may not start. */
export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP.test(userAgent);
}
