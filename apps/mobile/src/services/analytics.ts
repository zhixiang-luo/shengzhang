import type { FeedbackType } from '@shengzhang/contracts';
import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { API_BASE_URL } from '../config/env';
import { getInstallationId } from './installationId';

export type AnalyticsEventName =
  | 'app_opened'
  | 'app_backgrounded'
  | 'voice_started'
  | 'voice_completed'
  | 'voice_saved'
  | 'voice_undone'
  | 'voice_cancelled'
  | 'voice_failed'
  | 'manual_entry_opened'
  | 'manual_transaction_created'
  | 'transaction_updated'
  | 'transaction_deleted'
  | 'stats_opened'
  | 'monthly_review_opened'
  | 'monthly_review_previewed'
  | 'monthly_review_share_opened'
  | 'monthly_review_share_failed'
  | 'ledger_search_opened'
  | 'ledger_search_applied'
  | 'categories_opened'
  | 'settings_opened'
  | 'data_safety_opened'
  | 'data_backup_exported'
  | 'data_backup_restored'
  | 'data_csv_exported'
  | 'local_ledger_cleared'
  | 'feedback_opened'
  | 'feedback_submitted'
  | 'feedback_failed';

type AnalyticsProperties = {
  entryCount?: number;
  durationMs?: number;
  filterCount?: number;
  feedbackType?: FeedbackType;
  reason?:
    | 'cancelled'
    | 'permission'
    | 'connection'
    | 'timeout'
    | 'empty'
    | 'too_short'
    | 'provider'
    | 'save_failed'
    | 'unknown'
    | 'share_failed';
};

const PREFERENCE_KEY = 'shengzhang.analytics-enabled';
const BUILD_DEFAULT =
  process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== 'false';
let preferencePromise: Promise<boolean> | null = null;
let appOpenedTracked = false;

async function readPreference(): Promise<boolean> {
  if (!BUILD_DEFAULT) return false;
  const stored = await SecureStore.getItemAsync(PREFERENCE_KEY);
  return stored !== 'false';
}

export async function isAnalyticsEnabled(): Promise<boolean> {
  preferencePromise ??= readPreference().catch(() => BUILD_DEFAULT);
  return preferencePromise;
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  preferencePromise = Promise.resolve(enabled && BUILD_DEFAULT);
  await SecureStore.setItemAsync(PREFERENCE_KEY, enabled ? 'true' : 'false');
}

async function sendEvent(name: AnalyticsEventName, properties: AnalyticsProperties) {
  try {
    if (!(await isAnalyticsEnabled())) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      await fetch(`${API_BASE_URL}/v1/analytics/events`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          anonymousId: await getInstallationId(),
          events: [
            {
              name,
              occurredAt: new Date().toISOString(),
              properties: {
                ...properties,
                platform: Platform.OS === 'ios' ? 'ios' : 'android',
                appVersion: Constants.expoConfig?.version ?? '0.1.0',
              },
            },
          ],
        }),
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Analytics must never interrupt bookkeeping or surface network errors.
  }
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {},
) {
  void sendEvent(name, properties);
}

export function trackAppOpenedOnce() {
  if (appOpenedTracked) return;
  appOpenedTracked = true;
  trackAnalyticsEvent('app_opened');
}
