import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BootScreen } from '../components/BootScreen';
import { DatabaseProvider } from '../db/DatabaseProvider';
import { migrateDatabase } from '../db/migrations';
import { trackAppOpenedOnce } from '../services/analytics';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  useEffect(() => {
    trackAppOpenedOnce();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Suspense fallback={<BootScreen />}>
          <SQLiteProvider databaseName="shengzhang.db" onInit={migrateDatabase} useSuspense>
            <DatabaseProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.canvas },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="index" options={{ animation: 'fade' }} />
                <Stack.Screen name="stats" options={{ animation: 'fade' }} />
                <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen
                  name="entry"
                  options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
                />
              </Stack>
            </DatabaseProvider>
          </SQLiteProvider>
        </Suspense>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
