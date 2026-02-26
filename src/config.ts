export const processEnv = import.meta.env;

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_URL = rawApiUrl.replace(/\/+$/, '');
