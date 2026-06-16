import axios from 'axios';

// ==========================================================================
// API client — every request carries the raw Telegram initData string in the
// X-Telegram-Init-Data header. The backend verifies HMAC before trusting it.
// ==========================================================================

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://gaytrix-production.up.railway.app/v1').trim();

export const api = axios.create({
  baseURL: BASE_URL,
  // 30s timeout — Railway services can take 20-30s to wake from sleep on the free tier
  timeout: 30000,
});

export function setInitData(initData: string) {
  if (initData) {
    api.defaults.headers.common['X-Telegram-Init-Data'] = initData;
  }
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized: Telegram session could not be verified.');
    }
    return Promise.reject(error);
  }
);

// Helper to build absolute URL for backend-served assets (photos, stories).
// ALWAYS returns https:// — photos uploaded before the Railway proxy fix were
// stored in the DB with http:// URLs. Android WebView enforces mixed-content
// blocking (http image on https page). iOS is lenient. Forcing https:// here
// fixes all existing photos on Android without requiring users to re-upload.
const BACKEND_BASE = BASE_URL.replace('/v1', '').replace(/\/+$/, '');
export function assetUrl(src: string): string {
  if (!src) return '';
  const url = src.startsWith('http')
    ? src
    : `${BACKEND_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
  // Upgrade http:// -> https:// to prevent mixed-content blocking on Android
  return url.replace(/^http:\/\//i, 'https://');
}
