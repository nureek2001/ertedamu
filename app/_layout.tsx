import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Онбординг при запуске */}
      <Stack.Screen name="index" />

      {/* Экран логина */}
      <Stack.Screen name="login" />

      {/* Основное приложение с табами */}
      <Stack.Screen name="(tabs)" />

      {/* Модалка (по желанию) */}
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal' }}
      />
    </Stack>
  );
}
