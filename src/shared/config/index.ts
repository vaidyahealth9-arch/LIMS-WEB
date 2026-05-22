// Centralized config for LIMS frontend (Vite)

export const API_BASE_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:8080').trim();
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const config = {
  API_BASE_URL,
  GOOGLE_CLIENT_ID,
};

export default config;
