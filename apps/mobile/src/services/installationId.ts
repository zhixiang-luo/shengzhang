import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEY = 'shengzhang.installation-id';
let cached: string | null = null;

export async function getInstallationId(): Promise<string> {
  if (cached) return cached;
  const stored = await SecureStore.getItemAsync(KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const created = randomUUID();
  await SecureStore.setItemAsync(KEY, created);
  cached = created;
  return created;
}
