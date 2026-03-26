import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens, getMe } from './api';

export async function bootstrapSession() {
  const access = await AsyncStorage.getItem('accessToken');
  if (!access) return { isLoggedIn: false };

  try {
    const me = await getMe();

    await AsyncStorage.multiSet([
      ['currentSessionName', me.full_name || 'Пользователь'],
      ['currentSessionRole', me.role || 'admin'],
      ['isLoggedIn', 'true'],
    ]);

    return { isLoggedIn: true, me };
  } catch (e) {
    await clearTokens();
    await AsyncStorage.multiRemove([
      'currentSessionName',
      'currentSessionRole',
      'isLoggedIn',
    ]);
    return { isLoggedIn: false };
  }
}