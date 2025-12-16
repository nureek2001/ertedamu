import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen: React.FC = () => {
  const [identifier, setIdentifier] = useState(''); // email или телефон
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля.');
      return;
    }

    try {
      setLoading(true);

      // читаем регистрационные данные
      const entries = await AsyncStorage.multiGet([
        'parentEmail',
        'parentPhone',
        'parentPassword',
      ]);

      const map: Record<string, string | null> = Object.fromEntries(
        entries.map(([k, v]) => [k, v ?? null])
      );

      const storedEmail = map.parentEmail;
      const storedPhone = map.parentPhone;
      const storedPassword = map.parentPassword;
      console.log(storedEmail);
      console.log(storedPassword);
      console.log(entries);

      // если вообще ничего не сохранено — отправляем на регистрацию
      const noProfile =
        (!storedEmail || storedEmail.trim() === '') &&
        (!storedPhone || storedPhone.trim() === '') &&
        (!storedPassword || storedPassword.trim() === '');

      if (noProfile) {
        Alert.alert(
          'Профиль не найден',
          'Похоже, вы ещё не проходили регистрацию в слайдерах. Пожалуйста, сначала заполните онбординг.'
        );
        router.replace('/'); // открыть экран слайдеров (онбординг)
        return;
      }

      // нормализация email
      const inputEmailLike = trimmedId.toLowerCase();
      const normalizedStoredEmail = (storedEmail ?? '').trim().toLowerCase();

      // нормализация телефона: оставляем только + и цифры
      const normalizePhone = (v: string | null) =>
        (v ?? '').replace(/[^\d+]/g, '');

      const normalizedInputPhone = normalizePhone(trimmedId);
      const normalizedStoredPhone = normalizePhone(storedPhone);

      const identifierMatches =
        (!!normalizedStoredEmail &&
          inputEmailLike.length > 0 &&
          inputEmailLike === normalizedStoredEmail) ||
        (!!normalizedStoredPhone &&
          normalizedInputPhone.length > 0 &&
          normalizedInputPhone === normalizedStoredPhone);

      const passwordMatches =
        storedPassword !== null &&
        storedPassword !== undefined &&
        trimmedPass === storedPassword;

      if (!identifierMatches || !passwordMatches) {
        Alert.alert('Ошибка входа', 'Неверный логин или пароль.');
        return;
      }

      await AsyncStorage.setItem('isLoggedIn', 'true');
      router.replace('/(tabs)');
    } catch (e) {
      console.warn('Login error', e);
      Alert.alert('Ошибка', 'Не удалось выполнить вход. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Логотип / заголовок */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🧩</Text>
            </View>
            <Text style={styles.logoText}>ErteDamu</Text>
            <Text style={styles.logoSubtitle}>
              Вход для родителей и близких взрослых
            </Text>
          </View>

          {/* Карточка логина */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Войти в профиль</Text>
            <Text style={styles.cardSubtitle}>
              Используйте тот же e-mail или телефон, что указали при регистрации.
            </Text>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.label}>Email или телефон</Text>
              <TextInput
                style={styles.input}
                placeholder="Например, name@mail.com или +7..."
                placeholderTextColor="#9CA3AF"
                value={identifier}
                onChangeText={setIdentifier}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите пароль"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.forgotRow}>
              <Text style={styles.forgotText}>Забыли пароль?</Text>
              <Text style={styles.forgotHint}>
                В тестовой версии можно просто пройти регистрацию заново.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              activeOpacity={0.9}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Входим...' : 'Войти'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Низ экрана */}
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomText}>
              Впервые в ErteDamu? Просто закройте приложение и откройте заново —
              сначала появятся слайдеры регистрации.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 24,
    flexGrow: 1,
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoEmoji: {
    fontSize: 30,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  logoSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },

  label: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },

  forgotRow: {
    marginTop: 10,
  },
  forgotText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
  forgotHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  loginButton: {
    marginTop: 16,
    backgroundColor: '#F97316',
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FEF3C7',
    fontSize: 16,
    fontWeight: '600',
  },

  bottomInfo: {
    marginTop: 18,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  bottomText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
