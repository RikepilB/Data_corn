// SI-assisted (Claude Code); reviewed by <name>
import { describe, expect, it } from 'vitest';
import { isInAppBrowser } from './inApp';

const UA = {
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  instagramIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.0.0',
  facebookAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.0]',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 13; SM-A536B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

describe('isInAppBrowser', () => {
  it('is false for the regular browsers, where the download starts by itself', () => {
    expect(isInAppBrowser(UA.chromeAndroid)).toBe(false);
    expect(isInAppBrowser(UA.safariIphone)).toBe(false);
    expect(isInAppBrowser(UA.desktopChrome)).toBe(false);
  });

  it('is true inside the browsers of social apps and Android WebViews', () => {
    expect(isInAppBrowser(UA.instagramIphone)).toBe(true);
    expect(isInAppBrowser(UA.facebookAndroid)).toBe(true);
    expect(isInAppBrowser(UA.androidWebView)).toBe(true);
  });
});
