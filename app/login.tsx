import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState(''); // Email или Телефон
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Ошибка', 'Введите данные');
      return;
    }

    setLoading(true);
    try {
      // Загружаем данные из хранилища
      const savedEmail = await AsyncStorage.getItem('parentEmail');
      const savedPhone = await AsyncStorage.getItem('parentPhone');
      const savedPassword = await AsyncStorage.getItem('parentPassword');
      const savedName = await AsyncStorage.getItem('parentName');
      const savedRole = await AsyncStorage.getItem('parentRole');
      
      const familyMembersRaw = await AsyncStorage.getItem('familyMembers');
      const familyMembers = familyMembersRaw ? JSON.parse(familyMembersRaw) : [];

      // Очищаем вводимый текст от пробелов для сравнения с телефонами
      const cleanIdentifier = identifier.replace(/\s/g, '');
      const cleanSavedPhone = savedPhone ? savedPhone.replace(/\s/g, '') : '';

      // 1. Проверка основного родителя (Админа)
      const isMainParent = (identifier === savedEmail || cleanIdentifier === cleanSavedPhone) && password === savedPassword;

      if (isMainParent) {
        await AsyncStorage.multiSet([
          ['isLoggedIn', 'true'],
          ['activeUserRole', 'admin'],
          ['currentSessionName', savedName || 'Родитель'],
          ['currentSessionRole', savedRole || 'admin']
        ]);
        router.replace('/(tabs)');
        return;
      }

      // 2. Проверка родственников
      const foundMember = familyMembers.find((member: any) => {
        const cleanMemberPhone = member.phone.replace(/\s/g, '');
        return (cleanMemberPhone === cleanIdentifier || member.email === identifier) && member.password === password;
      });

      if (foundMember) {
        // Сохраняем данные сессии конкретного родственника
        await AsyncStorage.multiSet([
          ['isLoggedIn', 'true'],
          ['activeUserRole', foundMember.role],
          ['currentSessionName', foundMember.name],
          ['currentSessionRole', foundMember.role]
        ]);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Ошибка', 'Неверный логин или пароль');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Ошибка', 'Произошла ошибка при входе');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#4F46E5']}
        style={styles.background}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            
            <View style={styles.headerSection}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoText}>ED</Text>
              </View>
              <Text style={styles.welcomeTitle}>С возвращением!</Text>
              <Text style={styles.welcomeSubtitle}>Войдите в свой аккаунт ErteDamu</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.input}
                  placeholder="E-mail или Телефон"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.input}
                  placeholder="Пароль"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="rgba(255,255,255,0.7)" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'ВХОД...' : 'ВОЙТИ'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* <View style={styles.footer}>
              <Text style={styles.footerText}>Нет аккаунта?</Text>
              <TouchableOpacity onPress={() => router.push('/onboarding' as any)}>
                <Text style={styles.signUpText}> Зарегистрироваться</Text>
              </TouchableOpacity>
            </View> */}

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
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
  loginBtnText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
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
});