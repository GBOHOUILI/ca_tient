const STORAGE_KEY = "ca-tient:acquisition";
const MAX_LENGTH = 100;

export interface Acquisition {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrerHost?: string;
}

function clip(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, MAX_LENGTH) : undefined;
}

// First source of the tab wins: later internal navigations must not overwrite it.
export function captureAcquisition(): void {
  try {
    if (window.sessionStorage.getItem(STORAGE_KEY) !== null) return;

    const params = new URLSearchParams(window.location.search);
    const acquisition: Acquisition = {
      utmSource: clip(params.get("utm_source")),
      utmMedium: clip(params.get("utm_medium")),
      utmCampaign: clip(params.get("utm_campaign")),
    };
    if (document.referrer) {
      // Only the host is kept: the full referrer URL can carry personal data.
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host && host !== window.location.hostname && /^[a-z0-9.-]+$/.test(host)) {
        acquisition.referrerHost = host.slice(0, MAX_LENGTH);
      }
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(acquisition));
  } catch {
    // storage blocked or malformed referrer: the source is simply unknown
  }
}

export function readAcquisition(): Acquisition | undefined {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Acquisition;
    return Object.values(parsed).some(Boolean) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
