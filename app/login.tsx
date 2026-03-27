import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMe, loginRequest } from '@/lib/api';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const email = identifier.trim().toLowerCase();

    if (!email || !password) {
      Alert.alert('Ошибка', 'Введите email и пароль');
      return;
    }

    setLoading(true);

    try {
      await loginRequest(email, password);
      const me = await getMe();

      await AsyncStorage.multiSet([
        ['isLoggedIn', 'true'],
        ['activeUserRole', me.role || 'admin'],
        ['currentSessionName', me.full_name || 'Пользователь'],
        ['currentSessionRole', me.role || 'admin'],
      ]);

      router.replace('/(tabs)');
    } catch (e: any) {

      let message = 'Неверный email или пароль';

      Alert.alert('Ошибка входа', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <View style={styles.headerSection}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>ED</Text>
              </View>

              <Text style={styles.welcomeTitle}>С возвращением!</Text>
              <Text style={styles.welcomeSubtitle}>
                Войдите в свой аккаунт ErteDamu
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={22} color="#FFFFFF" />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={22} color="#FFFFFF" />
                <TextInput
                  style={styles.input}
                  placeholder="Пароль"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'ВХОД...' : 'ВОЙТИ'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
  style={styles.registerBtn}
  onPress={async () => {
    await AsyncStorage.multiRemove([
      'hasOnboarded',
      'accessToken',
      'refreshToken',
      'isLoggedIn',
      'activeUserRole',
      'currentSessionName',
      'currentSessionRole',
    ]);
    router.replace('/');
  }}
  disabled={loading}
>
  <Text style={styles.registerBtnText}>
    ЗАРЕГИСТРИРОВАТЬСЯ
  </Text>
</TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#6366F1',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  formContainer: {
    gap: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#FFFFFF',
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: width < 380 ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 4,
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  signUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
registerBtn: {
  height: 60,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 10,
  borderWidth: 2,
  borderColor: '#FFFFFF',
},

registerBtnText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '900',
  letterSpacing: 1,
},
});