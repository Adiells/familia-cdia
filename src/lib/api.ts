const SPONSORSHIPS_PATH = '/api/sponsorships';

/** Shared key for browser-only additions when the API cannot be reached. */
export const LOCAL_ADDITIONS_STORAGE_KEY = 'familia-cdia:user-additions:v1';

/** Resolve the standalone API origin at build time, or use the local standalone backend on port 8080 when running on localhost. */
export function getSponsorshipsApiUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    const baseUrl = configuredUrl.replace(/\/+$/, '');
    if (baseUrl.endsWith(SPONSORSHIPS_PATH)) return baseUrl;
    return `${baseUrl}${SPONSORSHIPS_PATH}`;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:8080${SPONSORSHIPS_PATH}`;
  }
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, '') ?? '';
  return `${basePath}${SPONSORSHIPS_PATH}`;
}
