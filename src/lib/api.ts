const SPONSORSHIPS_PATH = '/api/sponsorships';

/** Resolve the standalone API base URL without trailing slash or `/api/sponsorships` suffix. */
export function getApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    const trimmed = configuredUrl.replace(/\/+$/, '');
    if (trimmed.endsWith(SPONSORSHIPS_PATH)) {
      return trimmed.slice(0, -SPONSORSHIPS_PATH.length);
    }
    return trimmed;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:8080`;
  }
  return process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ?? '';
}

/** Resolve the standalone sponsorships API endpoint URL. */
export function getSponsorshipsApiUrl(): string {
  return `${getApiBaseUrl()}${SPONSORSHIPS_PATH}`;
}
