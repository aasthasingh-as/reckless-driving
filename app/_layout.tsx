import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

export const unstable_settings = {
  anchor: '(tabs)',
};

function ProtectedLayout() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // To avoid unmounted navigation errors in router
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    // Wait briefly for standard stack initialization so router.replace resolves safely
    const t = setTimeout(() => setIsNavigationReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading || !isNavigationReady) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, isNavigationReady]);

  if (loading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f7fb' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProtectedLayout />
    </AuthProvider>
  );
}
