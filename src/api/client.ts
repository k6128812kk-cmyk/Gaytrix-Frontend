import axios from 'axios';

// ==========================================================================
// API client
// Every request carries the raw Telegram initData string in the
// X-Telegram-Init-Data header. The backend verifies its HMAC signature
// against the bot token before trusting any user identity from it —
// see backend AuthGuard. Never trust a decoded-but-unverified payload.
// ==========================================================================

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://k5-production.up.railway.app/v1').trim();

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
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
      // Session invalid/expired — surface to the user via a toast in callers.
      console.error('Unauthorized: Telegram session could not be verified.');
    }
    return Promise.reject(error);
  }
);

// Helper to build absolute URL for backend-served files (photos, selfies)
const BACKEND_BASE = BASE_URL.replace('/v1', '').replace(/\/+$/, '');
export function assetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
