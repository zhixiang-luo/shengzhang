const OFFICIAL_API_BASE_URL = 'https://bigai.xin';

export function resolveApiBaseUrl(
  configuredUrl: string | undefined,
): string {
  return (configuredUrl?.trim() || OFFICIAL_API_BASE_URL).replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
