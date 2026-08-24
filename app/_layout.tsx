import SubscriptionModal from '@/components/SubscriptionModal';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { PermissionsProvider } from '@/contexts/PermissionsContext';
import { SaleProvider } from '@/contexts/SaleContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import '@/utils/suppressWarnings';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <PermissionsProvider>
                <SubscriptionProvider>
                  <CartProvider>
                    <SaleProvider>
                      <StatusBar style="light" />
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="login" options={{ headerShown: false }} />
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="cart" options={{ headerShown: false }} />
                        <Stack.Screen name="products/index" options={{ headerShown: false }} />
                        <Stack.Screen name="categories/index" options={{ headerShown: false }} />
                        <Stack.Screen name="categories/[id]" options={{ headerShown: false }} />
                        <Stack.Screen name="categories/new" options={{ headerShown: false }} />
                        <Stack.Screen name="customers/index" options={{ headerShown: false }} />
                        <Stack.Screen name="shifts" options={{ headerShown: false }} />
                        <Stack.Screen name="sales/index" options={{ headerShown: false }} />
                        <Stack.Screen name="purchases/index" options={{ headerShown: false }} />
                        <Stack.Screen name="warehouses/index" options={{ headerShown: false }} />
                        <Stack.Screen name="coupons/index" options={{ headerShown: false }} />
                        <Stack.Screen name="taxes/index" options={{ headerShown: false }} />
                        <Stack.Screen name="company/index" options={{ headerShown: false }} />
                        <Stack.Screen name="profile/index" options={{ headerShown: false }} />
                      </Stack>
                      <SubscriptionModal />
                    </SaleProvider>
                  </CartProvider>
                </SubscriptionProvider>
              </PermissionsProvider>
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
