import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, getMe, loginRequest } from '@/lib/api';

const { width } = Dimensions.get('window');

const MAIN_APP_ROUTE = '/(tabs)';

type AgeGroup = 'baby' | 'toddler' | 'preschool';
type ParentRole =
  | 'mother'
  | 'father'
  | 'grandma'
  | 'grandpa'
  | 'relative'
  | 'other';
type HomeLanguage = 'kk' | 'ru' | 'both' | 'other';
type ChildGender = 'boy' | 'girl';

type SlideType = 'welcome' | 'child' | 'parent' | 'overview';

type Slide = {
  id: string;
  type: SlideType;
};

type ExtraChild = {
  id: string;
  name: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: string;
  height: string;
  weight: string;
};

const SLIDES: Slide[] = [
  { id: '1', type: 'welcome' },
  { id: '2', type: 'child' },
  { id: '3', type: 'parent' },
  { id: '4', type: 'overview' },
];

const calculateAgeGroup = (
  dayStr: string,
  monthStr: string,
  yearStr: string
): AgeGroup | null => {
  const day = parseInt(dayStr || '1', 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  if (
    isNaN(day) ||
    isNaN(month) ||
    isNaN(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;
  const nowDay = now.getDate();

  let yearDiff = nowYear - year;
  let monthDiff = nowMonth - month;
  let dayDiff = nowDay - day;

  let totalMonths = yearDiff * 12 + monthDiff;

  if (dayDiff < 0) {
    totalMonths -= 1;
  }

  if (totalMonths < 0) return null;

  if (totalMonths < 12) return 'baby';
  if (totalMonths < 36) return 'toddler';
  return 'preschool';
};

function toIsoDate(day: string, month: string, year: string) {
  const dd = String(day || '').padStart(2, '0');
  const mm = String(month || '').padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function uiRoleToBackend(role: ParentRole): string {
  switch (role) {
    case 'mother':
      return 'mother';
    case 'father':
      return 'father';
    case 'grandma':
      return 'grandmother';
    case 'grandpa':
      return 'grandfather';
    case 'relative':
      return 'relative';
    case 'other':
    default:
      return 'relative';
  }
}

function uiGenderToBackend(gender: string): 'male' | 'female' {
  return gender === 'girl' ? 'female' : 'male';
}

const OnboardingScreen: React.FC = () => {
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [childName, setChildName] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [homeLanguage, setHomeLanguage] = useState<HomeLanguage | null>(null);
  const [childGender, setChildGender] = useState<ChildGender | null>(null);
  const [childHeight, setChildHeight] = useState('');
  const [childWeight, setChildWeight] = useState('');

  const [extraChildren, setExtraChildren] = useState<ExtraChild[]>([]);

  const [parentRole, setParentRole] = useState<ParentRole | null>(null);
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentPasswordConfirm, setParentPasswordConfirm] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const hasOnboarded = await AsyncStorage.getItem('hasOnboarded');

        if (hasOnboarded === 'true') {
          const token = await AsyncStorage.getItem('accessToken');

          if (!token) {
            router.replace('/login');
            return;
          }

          try {
            const me = await getMe();

            await AsyncStorage.multiSet([
              ['isLoggedIn', 'true'],
              ['activeUserRole', me.role || 'admin'],
              ['currentSessionName', me.full_name || 'Пользователь'],
              ['currentSessionRole', me.role || 'admin'],
            ]);

            router.replace(MAIN_APP_ROUTE);
            return;
          } catch {
            await AsyncStorage.multiRemove([
              'accessToken',
              'refreshToken',
              'isLoggedIn',
              'activeUserRole',
              'currentSessionName',
              'currentSessionRole',
            ]);
            router.replace('/login');
            return;
          }
        }
      } catch (e) {
        console.warn('Error reading onboarding flag', e);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const group = calculateAgeGroup(birthDay, birthMonth, birthYear);
    setAgeGroup(group);
  }, [birthDay, birthMonth, birthYear]);

  const formatPhoneNumber = (text: string) => {
    let digits = text.replace(/\D/g, '');
    if (digits.startsWith('7')) digits = digits.substring(1);
    digits = digits.substring(0, 10);

    let formatted = '+7 ';
    if (digits.length > 0) formatted += digits.substring(0, 3);
    if (digits.length > 3) formatted += ' ' + digits.substring(3, 6);
    if (digits.length > 6) formatted += ' ' + digits.substring(6, 8);
    if (digits.length > 8) formatted += ' ' + digits.substring(8, 10);

    return formatted;
  };

  const registerAndSetupAccount = async () => {
    const normalizedEmail = parentEmail.trim().toLowerCase();
    const familyName = `Family ${parentName.trim() || 'ErteDamu'}`;

    await api.post(
      '/api/auth/register/',
      {
        email: normalizedEmail,
        phone: parentPhone.trim(),
        full_name: parentName.trim(),
        role: parentRole ? uiRoleToBackend(parentRole) : 'relative',
        password: parentPassword,
      },
      false
    );

    await loginRequest(normalizedEmail, parentPassword);

    const me = await getMe();

    await AsyncStorage.multiSet([
      ['isLoggedIn', 'true'],
      ['activeUserRole', me.role || 'admin'],
      ['currentSessionName', me.full_name || 'Пользователь'],
      ['currentSessionRole', me.role || 'admin'],
    ]);

    try {
      await api.post('/api/families/my/create/', {
        name: familyName,
      });
    } catch (e: any) {
      if (e?.detail !== 'У пользователя уже есть семья.') {
        throw e;
      }
    }

    await api.post('/api/families/children/', {
      first_name: childName.trim(),
      birth_date: toIsoDate(birthDay, birthMonth, birthYear),
      gender: uiGenderToBackend(childGender || 'boy'),
      is_primary: true,
      initial_height: childHeight ? Number(childHeight) : undefined,
      initial_weight: childWeight ? Number(childWeight) : undefined,
    });

    for (const child of extraChildren) {
      const childNameValue = child.name.trim();
      const hasDate =
        child.birthDay.trim() &&
        child.birthMonth.trim() &&
        child.birthYear.trim().length === 4;

      if (!childNameValue || !hasDate) continue;

      await api.post('/api/families/children/', {
        first_name: childNameValue,
        birth_date: toIsoDate(child.birthDay, child.birthMonth, child.birthYear),
        gender: uiGenderToBackend(child.gender || 'boy'),
        is_primary: false,
        initial_height: child.height ? Number(child.height) : undefined,
        initial_weight: child.weight ? Number(child.weight) : undefined,
      });
    }

    await AsyncStorage.multiSet([
      ['hasOnboarded', 'true'],
      ['parentName', parentName || ''],
      ['parentRole', parentRole ?? ''],
      ['parentEmail', parentEmail || ''],
      ['parentPhone', parentPhone || ''],
      ['childName', childName || ''],
      ['childBirthDay', birthDay || ''],
      ['childBirthMonth', birthMonth || ''],
      ['childBirthYear', birthYear || ''],
      ['childGender', childGender ?? ''],
      ['childHeight', childHeight || ''],
      ['childWeight', childWeight || ''],
      ['language', homeLanguage ?? ''],
      ['extraChildren', JSON.stringify(extraChildren)],
    ]);
  };

  const goToApp = async () => {
    try {
      setSubmitting(true);
      await registerAndSetupAccount();
      router.replace(MAIN_APP_ROUTE);
    } catch (e: any) {
      console.warn('Onboarding submit error', e);

      let message = 'Не удалось завершить регистрацию';

      if (typeof e?.detail === 'string') {
        message = e.detail;
      } else if (typeof e?.email?.[0] === 'string') {
        message = e.email[0];
      } else if (typeof e?.password?.[0] === 'string') {
        message = e.password[0];
      } else if (typeof e?.full_name?.[0] === 'string') {
        message = e.full_name[0];
      }

      Alert.alert('Ошибка', message);
    } finally {
      setSubmitting(false);
    }
  };

  const isChildValid =
    childName.trim().length >= 2 &&
    birthDay.trim().length >= 1 &&
    birthMonth.trim().length >= 1 &&
    birthYear.trim().length === 4 &&
    ageGroup !== null &&
    homeLanguage !== null &&
    childGender !== null;

  const isParentValid = (() => {
    if (!parentRole) return false;
    if (parentName.trim().length < 2) return false;
    if (!parentEmail.includes('@') || parentEmail.trim().length < 5) return false;
    const phoneDigits = parentPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith('7')) return false;
    if (parentPassword.trim().length < 6) return false;
    if (parentPassword !== parentPasswordConfirm) return false;
    return true;
  })();

  const currentSlideType = SLIDES[currentIndex]?.type;
  const slideNeedsValidation =
    currentSlideType === 'child' || currentSlideType === 'parent';

  const isCurrentSlideValid =
    currentSlideType === 'child'
      ? isChildValid
      : currentSlideType === 'parent'
      ? isParentValid
      : true;

  const handleNext = () => {
    if (submitting) return;
    if (currentSlideType === 'child' && !isChildValid) return;
    if (currentSlideType === 'parent' && !isParentValid) return;

    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      goToApp();
    }
  };

  const onMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleAddExtraChild = () => {
    if (extraChildren.length >= 3) return;
    setExtraChildren((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(16),
        name: '',
        birthDay: '',
        birthMonth: '',
        birthYear: '',
        gender: '',
        height: '',
        weight: '',
      },
    ]);
  };

  const updateExtraChild = (
    id: string,
    field: keyof Omit<ExtraChild, 'id'>,
    value: string
  ) => {
    setExtraChildren((prev) =>
      prev.map((child) =>
        child.id === id ? { ...child, [field]: value } : child
      )
    );
  };

  const removeExtraChild = (id: string) => {
    setExtraChildren((prev) => prev.filter((child) => child.id !== id));
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          <Text style={styles.headerLogo}>Erte</Text>
          <Text style={[styles.headerLogo, styles.headerLogoAccent]}>Damu</Text>
        </View>
        <View style={styles.headerIndicator}>
          <Text style={styles.headerStep}>
            Шаг {currentIndex + 1} из {SLIDES.length}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderWelcomeSlide = () => (
    <ScrollView
      style={styles.slideScroll}
      contentContainerStyle={styles.welcomeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.welcomeIllustration}>
          <LinearGradient
            colors={['#FEF3C7', '#FDE68A']}
            style={styles.welcomeCircle}
          >
            <Text style={styles.illustrationEmoji}>👨‍👩‍👧‍👦</Text>
          </LinearGradient>
        </View>

        <Text style={styles.mainTitle}>
          Добро пожаловать в{' '}
          <Text style={styles.gradientText}>ErteDamu</Text>
        </Text>
        <Text style={styles.mainSubtitle}>
          Ваш персональный помощник в развитии детей от 0 до 6 лет
        </Text>

        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <LinearGradient
              colors={['#ECFDF5', '#D1FAE5']}
              style={styles.featureIcon}
            >
              <Text style={styles.featureEmoji}>🧠</Text>
            </LinearGradient>
            <Text style={styles.featureTitle}>Персональные идеи</Text>
            <Text style={styles.featureText}>
              Подбираем занятия под возраст и интересы вашего ребёнка
            </Text>
          </View>

          <View style={styles.featureCard}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.featureIcon}
            >
              <Text style={styles.featureEmoji}>⏰</Text>
            </LinearGradient>
            <Text style={styles.featureTitle}>Без перегруза</Text>
            <Text style={styles.featureText}>
              Короткие, осмысленные активности на каждый день
            </Text>
          </View>

          <View style={styles.featureCard}>
            <LinearGradient
              colors={['#E0E7FF', '#C7D2FE']}
              style={styles.featureIcon}
            >
              <Text style={styles.featureEmoji}>🤝</Text>
            </LinearGradient>
            <Text style={styles.featureTitle}>Поддержка родителей</Text>
            <Text style={styles.featureText}>
              Советы и подсказки для лучшего взаимодействия
            </Text>
          </View>
        </View>

        <View style={styles.welcomeInfoCard}>
          <Text style={styles.welcomeInfoTitle}>Как это работает?</Text>
          <View style={styles.stepsContainer}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Заполните профиль</Text>
                <Text style={styles.stepText}>
                  Укажите возраст ребёнка, интересы и цели развития
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Получайте рекомендации</Text>
                <Text style={styles.stepText}>
                  Ежедневные идеи занятий, подобранные специально для вас
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Отслеживайте прогресс</Text>
                <Text style={styles.stepText}>
                  Наблюдайте за развитием навыков и достижениями ребёнка
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.welcomeBottomHint}>
          <Text style={styles.welcomeHintText}>
            Начните с заполнения профиля вашего ребёнка на следующем шаге
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderChildSlide = () => (
    <ScrollView
      style={styles.slideScroll}
      contentContainerStyle={styles.slideScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.slideHeader}>
        <LinearGradient
          colors={['#F0F9FF', '#E0F2FE']}
          style={styles.slideIcon}
        >
          <Text style={styles.slideEmoji}>👶</Text>
        </LinearGradient>
        <Text style={styles.mainTitle}>Расскажите о ребёнке</Text>
        <Text style={styles.mainSubtitle}>
          Настраиваем приложение под возраст и интересы вашего малыша
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Основная информация</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Имя ребёнка</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Например, Амина"
              placeholderTextColor="#94A3B8"
              value={childName}
              onChangeText={setChildName}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Дата рождения</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateInputContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="ДД"
                placeholderTextColor="#94A3B8"
                value={birthDay}
                onChangeText={setBirthDay}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.dateSeparator}>/</Text>
            <View style={styles.dateInputContainer}>
              <TextInput
                style={styles.dateInput}
                placeholder="MM"
                placeholderTextColor="#94A3B8"
                value={birthMonth}
                onChangeText={setBirthMonth}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.dateSeparator}>/</Text>
            <View style={[styles.dateInputContainer, styles.yearInput]}>
              <TextInput
                style={styles.dateInput}
                placeholder="YYYY"
                placeholderTextColor="#94A3B8"
                value={birthYear}
                onChangeText={setBirthYear}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Возрастная группа</Text>
          <View style={styles.ageGroupContainer}>
            {[
              { key: 'baby', label: '0-1 год', emoji: '👶', description: 'Младенчество' },
              { key: 'toddler', label: '1-3 года', emoji: '🧒', description: 'Ранний возраст' },
              { key: 'preschool', label: '3-6 лет', emoji: '👦', description: 'Дошкольный возраст' },
            ].map((item) => (
              <View
                key={item.key}
                style={[
                  styles.ageGroupItem,
                  ageGroup === item.key && styles.ageGroupItemActive,
                  !ageGroup && styles.ageGroupItemInactive,
                ]}
              >
                <View
                  style={[
                    styles.ageGroupIcon,
                    ageGroup === item.key && styles.ageGroupIconActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.ageGroupEmoji,
                      ageGroup === item.key && styles.ageGroupEmojiActive,
                    ]}
                  >
                    {item.emoji}
                  </Text>
                </View>
                <View style={styles.ageGroupTextContainer}>
                  <Text
                    style={[
                      styles.ageGroupLabel,
                      ageGroup === item.key && styles.ageGroupLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.ageGroupDescription,
                      ageGroup === item.key && styles.ageGroupDescriptionActive,
                    ]}
                  >
                    {item.description}
                  </Text>
                </View>
                {ageGroup === item.key && (
                  <View style={styles.ageGroupSelectedIndicator}>
                    <Text style={styles.ageGroupSelectedIcon}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          {!ageGroup ? (
            <Text style={styles.ageHint}>
              Введите дату рождения, чтобы определить возрастную группу
            </Text>
          ) : (
            <Text
              style={[
                styles.ageHint,
                ageGroup === 'baby' && styles.ageHintBaby,
                ageGroup === 'toddler' && styles.ageHintToddler,
                ageGroup === 'preschool' && styles.ageHintPreschool,
              ]}
            >
              {ageGroup === 'baby'
                ? 'Период младенчества - важное время для сенсорного развития'
                : ageGroup === 'toddler'
                ? 'Возраст активного познания мира и развития речи'
                : 'Время социального развития и подготовки к школе'}
            </Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Пол ребёнка</Text>
          <View style={styles.genderGrid}>
            <TouchableOpacity
              style={[
                styles.genderCard,
                childGender === 'boy' && styles.genderCardActive,
              ]}
              onPress={() => setChildGender('boy')}
            >
              <LinearGradient
                colors={
                  childGender === 'boy'
                    ? ['#3B82F6', '#1D4ED8']
                    : ['#F1F5F9', '#E2E8F0']
                }
                style={styles.genderIcon}
              >
                <Text
                  style={[
                    styles.genderEmoji,
                    childGender === 'boy' && styles.genderEmojiActive,
                  ]}
                >
                  👦
                </Text>
              </LinearGradient>
              <Text
                style={[
                  styles.genderLabel,
                  childGender === 'boy' && styles.genderLabelActive,
                ]}
              >
                Мальчик
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderCard,
                childGender === 'girl' && styles.genderCardActive,
              ]}
              onPress={() => setChildGender('girl')}
            >
              <LinearGradient
                colors={
                  childGender === 'girl'
                    ? ['#EC4899', '#DB2777']
                    : ['#F1F5F9', '#E2E8F0']
                }
                style={styles.genderIcon}
              >
                <Text
                  style={[
                    styles.genderEmoji,
                    childGender === 'girl' && styles.genderEmojiActive,
                  ]}
                >
                  👧
                </Text>
              </LinearGradient>
              <Text
                style={[
                  styles.genderLabel,
                  childGender === 'girl' && styles.genderLabelActive,
                ]}
              >
                Девочка
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Рост и вес (необязательно)</Text>
          <View style={styles.measurementRow}>
            <View style={styles.measurementContainer}>
              <TextInput
                style={styles.measurementInput}
                placeholder="Рост, см"
                placeholderTextColor="#94A3B8"
                value={childHeight}
                onChangeText={setChildHeight}
                keyboardType="numeric"
              />
              <Text style={styles.measurementUnit}>см</Text>
            </View>
            <View style={styles.measurementContainer}>
              <TextInput
                style={styles.measurementInput}
                placeholder="Вес, кг"
                placeholderTextColor="#94A3B8"
                value={childWeight}
                onChangeText={setChildWeight}
                keyboardType="numeric"
              />
              <Text style={styles.measurementUnit}>кг</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Язык дома</Text>
          <View style={styles.languageGrid}>
            {[
              { key: 'kk', title: 'Қазақ тілі', desc: 'Основной', emoji: '🇰🇿' },
              { key: 'ru', title: 'Русский', desc: 'Основной', emoji: '🇷🇺' },
              { key: 'both', title: 'Оба языка', desc: 'Каз / Рус', emoji: '🌐' },
              { key: 'other', title: 'Другое', desc: 'Добавить позже', emoji: '🗺️' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.key}
                style={[
                  styles.languageCard,
                  homeLanguage === lang.key && styles.languageCardActive,
                ]}
                onPress={() => setHomeLanguage(lang.key as HomeLanguage)}
              >
                <LinearGradient
                  colors={
                    homeLanguage === lang.key
                      ? ['#8B5CF6', '#7C3AED']
                      : ['#F8FAFC', '#F1F5F9']
                  }
                  style={styles.languageIcon}
                >
                  <Text style={styles.languageEmoji}>{lang.emoji}</Text>
                </LinearGradient>
                <Text
                  style={[
                    styles.languageTitle,
                    homeLanguage === lang.key && styles.languageTitleActive,
                  ]}
                >
                  {lang.title}
                </Text>
                <Text
                  style={[
                    styles.languageDesc,
                    homeLanguage === lang.key && styles.languageDescActive,
                  ]}
                >
                  {lang.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!isChildValid && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              Чтобы перейти дальше, заполните все обязательные поля
            </Text>
          </View>
        )}
      </View>

      <View style={styles.extraSection}>
        <View style={styles.extraHeader}>
          <View>
            <Text style={styles.extraTitle}>Ещё дети в семье</Text>
            <Text style={styles.extraSubtitle}>
              Можно добавить до 3 детей, чтобы получать идеи для всей семьи
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              extraChildren.length >= 3 && styles.addButtonDisabled,
            ]}
            onPress={handleAddExtraChild}
            disabled={extraChildren.length >= 3}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.addButtonGradient}
            >
              <Text style={styles.addButtonText}>+ Добавить</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {extraChildren.map((child) => {
          const group = calculateAgeGroup(
            child.birthDay,
            child.birthMonth,
            child.birthYear
          );

          return (
            <View key={child.id} style={styles.extraCard}>
              <View style={styles.extraCardHeader}>
                <View style={styles.extraCardTitleRow}>
                  <LinearGradient
                    colors={['#FEF3C7', '#FDE68A']}
                    style={styles.extraCardIcon}
                  >
                    <Text style={styles.extraCardEmoji}>👤</Text>
                  </LinearGradient>
                  <Text style={styles.extraCardTitle}>
                    {child.name || 'Новый ребёнок'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeExtraChild(child.id)}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.extraForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Имя</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Имя ребёнка"
                      placeholderTextColor="#94A3B8"
                      value={child.name}
                      onChangeText={(text) =>
                        updateExtraChild(child.id, 'name', text)
                      }
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Дата рождения</Text>
                  <View style={styles.dateRow}>
                    {['birthDay', 'birthMonth', 'birthYear'].map((field, idx) => (
                      <React.Fragment key={field}>
                        <View style={styles.dateInputContainer}>
                          <TextInput
                            style={styles.dateInput}
                            placeholder={['ДД', 'MM', 'YYYY'][idx]}
                            placeholderTextColor="#94A3B8"
                            value={child[field as keyof Omit<ExtraChild, 'id'>]}
                            onChangeText={(text) =>
                              updateExtraChild(child.id, field as any, text)
                            }
                            keyboardType="number-pad"
                            maxLength={idx === 2 ? 4 : 2}
                          />
                        </View>
                        {idx < 2 && <Text style={styles.dateSeparator}>/</Text>}
                      </React.Fragment>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Пол</Text>
                  <View style={styles.genderGrid}>
                    <TouchableOpacity
                      style={[
                        styles.genderCard,
                        child.gender === 'boy' && styles.genderCardActive,
                      ]}
                      onPress={() => updateExtraChild(child.id, 'gender', 'boy')}
                    >
                      <LinearGradient
                        colors={
                          child.gender === 'boy'
                            ? ['#3B82F6', '#1D4ED8']
                            : ['#F1F5F9', '#E2E8F0']
                        }
                        style={styles.genderIcon}
                      >
                        <Text
                          style={[
                            styles.genderEmoji,
                            child.gender === 'boy' && styles.genderEmojiActive,
                          ]}
                        >
                          👦
                        </Text>
                      </LinearGradient>
                      <Text
                        style={[
                          styles.genderLabel,
                          child.gender === 'boy' && styles.genderLabelActive,
                        ]}
                      >
                        Мальчик
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.genderCard,
                        child.gender === 'girl' && styles.genderCardActive,
                      ]}
                      onPress={() => updateExtraChild(child.id, 'gender', 'girl')}
                    >
                      <LinearGradient
                        colors={
                          child.gender === 'girl'
                            ? ['#EC4899', '#DB2777']
                            : ['#F1F5F9', '#E2E8F0']
                        }
                        style={styles.genderIcon}
                      >
                        <Text
                          style={[
                            styles.genderEmoji,
                            child.gender === 'girl' && styles.genderEmojiActive,
                          ]}
                        >
                          👧
                        </Text>
                      </LinearGradient>
                      <Text
                        style={[
                          styles.genderLabel,
                          child.gender === 'girl' && styles.genderLabelActive,
                        ]}
                      >
                        Девочка
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Рост и вес (необязательно)</Text>
                  <View style={styles.measurementRow}>
                    <View style={styles.measurementContainer}>
                      <TextInput
                        style={styles.measurementInput}
                        placeholder="Рост, см"
                        placeholderTextColor="#94A3B8"
                        value={child.height}
                        onChangeText={(text) =>
                          updateExtraChild(child.id, 'height', text)
                        }
                        keyboardType="numeric"
                      />
                      <Text style={styles.measurementUnit}>см</Text>
                    </View>
                    <View style={styles.measurementContainer}>
                      <TextInput
                        style={styles.measurementInput}
                        placeholder="Вес, кг"
                        placeholderTextColor="#94A3B8"
                        value={child.weight}
                        onChangeText={(text) =>
                          updateExtraChild(child.id, 'weight', text)
                        }
                        keyboardType="numeric"
                      />
                      <Text style={styles.measurementUnit}>кг</Text>
                    </View>
                  </View>
                </View>

                {group && (
                  <View
                    style={[
                      styles.ageGroupBadge,
                      group === 'baby' && styles.ageGroupBadgeBaby,
                      group === 'toddler' && styles.ageGroupBadgeToddler,
                      group === 'preschool' && styles.ageGroupBadgePreschool,
                    ]}
                  >
                    <Text style={styles.ageGroupBadgeText}>
                      {group === 'baby'
                        ? '👶 0-1 год'
                        : group === 'toddler'
                        ? '🧒 1-3 года'
                        : '👦 3-6 лет'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderParentSlide = () => {
    const passwordsMismatch =
      parentPassword.length > 0 &&
      parentPasswordConfirm.length > 0 &&
      parentPassword !== parentPasswordConfirm;

    const phoneDigits = parentPhone.replace(/\D/g, '');
    const isPhoneValid = phoneDigits.length === 11 && phoneDigits.startsWith('7');

    return (
      <ScrollView
        style={styles.slideScroll}
        contentContainerStyle={styles.slideScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.slideHeader}>
          <LinearGradient
            colors={['#F0F9FF', '#E0F2FE']}
            style={styles.slideIcon}
          >
            <Text style={styles.slideEmoji}>👨‍👩‍👧‍👦</Text>
          </LinearGradient>
          <Text style={styles.mainTitle}>Информация о взрослом</Text>
          <Text style={styles.mainSubtitle}>
            Создайте аккаунт для доступа ко всем возможностям приложения
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Ваши данные</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Кто вы для ребёнка?</Text>
            <View style={styles.roleGrid}>
              {[
                { key: 'mother', label: 'Мама', emoji: '👩' },
                { key: 'father', label: 'Папа', emoji: '👨' },
                { key: 'grandma', label: 'Бабушка', emoji: '👵' },
                { key: 'grandpa', label: 'Дедушка', emoji: '👴' },
                { key: 'relative', label: 'Родственник', emoji: '👨‍👩‍👧‍👦' },
                { key: 'other', label: 'Другое', emoji: '👤' },
              ].map((role) => (
                <TouchableOpacity
                  key={role.key}
                  style={[
                    styles.roleCard,
                    parentRole === role.key && styles.roleCardActive,
                  ]}
                  onPress={() => setParentRole(role.key as ParentRole)}
                >
                  <Text
                    style={[
                      styles.roleEmoji,
                      parentRole === role.key && styles.roleEmojiActive,
                    ]}
                  >
                    {role.emoji}
                  </Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      parentRole === role.key && styles.roleLabelActive,
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ваше имя</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Как вас зовут?"
                placeholderTextColor="#94A3B8"
                value={parentName}
                onChangeText={setParentName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>E-mail</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="your@email.com"
                placeholderTextColor="#94A3B8"
                value={parentEmail}
                onChangeText={setParentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Номер телефона</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                keyboardType="phone-pad"
                placeholder="+7 000 000 00 00"
                placeholderTextColor="#94A3B8"
                value={parentPhone}
                maxLength={16}
                onChangeText={(text) => {
                  const formatted = formatPhoneNumber(text);
                  setParentPhone(formatted);
                }}
              />
            </View>
            <View style={styles.phoneHintContainer}>
              {parentPhone.length > 0 && !isPhoneValid && (
                <Text style={styles.phoneErrorText}>
                  Введите полный номер телефона (10 цифр после +7)
                </Text>
              )}
              {isPhoneValid && (
                <Text style={styles.phoneSuccessText}>
                  ✓ Номер телефона указан верно
                </Text>
              )}
              {parentPhone.length === 0 && (
                <Text style={styles.phoneHintText}>
                  Формат: +7 777 123 45 67
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Пароль</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Минимум 6 символов"
                placeholderTextColor="#94A3B8"
                value={parentPassword}
                onChangeText={setParentPassword}
                secureTextEntry
              />
            </View>
            <View style={styles.passwordHintContainer}>
              {parentPassword.length > 0 && parentPassword.length < 6 && (
                <Text style={styles.passwordErrorText}>
                  Пароль должен содержать минимум 6 символов
                </Text>
              )}
              {parentPassword.length >= 6 && (
                <Text style={styles.passwordSuccessText}>
                  ✓ Пароль достаточно длинный
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Повторите пароль</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Повторите пароль"
                placeholderTextColor="#94A3B8"
                value={parentPasswordConfirm}
                onChangeText={setParentPasswordConfirm}
                secureTextEntry
              />
            </View>
            {passwordsMismatch && (
              <Text style={styles.passwordErrorText}>
                Пароли не совпадают
              </Text>
            )}
            {parentPasswordConfirm.length > 0 && !passwordsMismatch && (
              <Text style={styles.passwordSuccessText}>
                ✓ Пароли совпадают
              </Text>
            )}
          </View>

          {!isParentValid && !passwordsMismatch && (
            <View style={styles.hintCard}>
              <Text style={styles.hintText}>
                Заполните все обязательные поля для продолжения
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  const renderOverviewSlide = () => (
    <ScrollView
      style={styles.slideScroll}
      contentContainerStyle={styles.welcomeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.overviewHeader}>
        <LinearGradient
          colors={['#A78BFA', '#8B5CF6']}
          style={styles.overviewCircle}
        >
          <Text style={styles.overviewEmoji}>🎉</Text>
        </LinearGradient>
        <Text style={styles.mainTitle}>Готово к началу!</Text>
        <Text style={styles.mainSubtitle}>
          Вы создали персональный профиль для развития вашего ребёнка
        </Text>
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Ваш профиль</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Ребёнок</Text>
              <Text style={styles.summaryValue}>
                {childName || 'Не указано'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Возраст</Text>
              <Text style={styles.summaryValue}>
                {ageGroup === 'baby'
                  ? '0-1 год'
                  : ageGroup === 'toddler'
                  ? '1-3 года'
                  : ageGroup === 'preschool'
                  ? '3-6 лет'
                  : 'Не указано'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Родитель</Text>
              <Text style={styles.summaryValue}>
                {parentName || 'Не указано'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Язык</Text>
              <Text style={styles.summaryValue}>
                {homeLanguage === 'kk'
                  ? 'Қазақ тілі'
                  : homeLanguage === 'ru'
                  ? 'Русский'
                  : homeLanguage === 'both'
                  ? 'Оба языка'
                  : homeLanguage === 'other'
                  ? 'Другое'
                  : 'Не указано'}
              </Text>
            </View>
          </View>
        </View>

        {extraChildren.length > 0 && (
          <View style={styles.extraSummary}>
            <Text style={styles.summaryTitle}>Дополнительные дети</Text>
            {extraChildren.map((child, index) => (
              <View key={child.id} style={styles.extraSummaryItem}>
                <View style={styles.extraSummaryIcon}>
                  <Text style={styles.extraSummaryEmoji}>
                    {index === 0 ? '👶' : index === 1 ? '🧒' : '👦'}
                  </Text>
                </View>
                <View style={styles.extraSummaryText}>
                  <Text style={styles.extraSummaryName}>
                    {child.name || 'Ребёнок ' + (index + 1)}
                  </Text>
                  <Text style={styles.extraSummaryAge}>
                    {calculateAgeGroup(child.birthDay, child.birthMonth, child.birthYear)
                      ? (() => {
                          const group = calculateAgeGroup(
                            child.birthDay,
                            child.birthMonth,
                            child.birthYear
                          );
                          return group === 'baby'
                            ? '0-1 год'
                            : group === 'toddler'
                            ? '1-3 года'
                            : '3-6 лет';
                        })()
                      : 'Возраст не указан'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>✨</Text>
          <Text style={styles.successTitle}>Отличная работа!</Text>
          <Text style={styles.successText}>
            Теперь вы готовы получать персональные рекомендации для развития вашего ребёнка
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderSlideContent = (type: SlideType) => {
    switch (type) {
      case 'welcome':
        return renderWelcomeSlide();
      case 'child':
        return renderChildSlide();
      case 'parent':
        return renderParentSlide();
      case 'overview':
        return renderOverviewSlide();
      default:
        return null;
    }
  };

  const renderItem: ListRenderItem<Slide> = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      {renderHeader()}
      {renderSlideContent(item.type)}
    </View>
  );

  if (checkingOnboarding) {
    return (
      <SafeAreaView style={styles.screen}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {SLIDES.map((_, index) => (
              <View
                key={index.toString()}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              slideNeedsValidation &&
                !isCurrentSlideValid &&
                styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
            disabled={submitting || (slideNeedsValidation && !isCurrentSlideValid)}
          >
            <LinearGradient
              colors={
                slideNeedsValidation && !isCurrentSlideValid
                  ? ['#CBD5E1', '#94A3B8']
                  : ['#8B5CF6', '#7C3AED']
              }
              style={styles.nextButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {currentIndex === SLIDES.length - 1 ? 'НАЧАТЬ' : 'ДАЛЕЕ'}
                  </Text>
                  <Text style={styles.nextButtonArrow}>→</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Уже есть аккаунт?</Text>
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.bottomLogin}> Войти</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    flex: 1,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerLogoAccent: {
    fontWeight: '900',
  },
  headerIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerStep: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  slideContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  welcomeScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  slideHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  slideIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  slideEmoji: {
    fontSize: 40,
  },

  welcomeIllustration: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  illustrationEmoji: {
    fontSize: 50,
  },
  gradientText: {
    color: '#8B5CF6',
    fontWeight: '800',
  },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 32,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  welcomeInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  welcomeInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepsContainer: {
    marginBottom: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  welcomeBottomHint: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  welcomeHintText: {
    fontSize: 14,
    color: '#065F46',
    textAlign: 'center',
    fontWeight: '500',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 24,
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  inputIcon: {
    fontSize: 20,
    marginLeft: 16,
    color: '#64748B',
  },
  inputWithIcon: {
    marginLeft: 8,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInputContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateInput: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    textAlign: 'center',
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  dateSeparator: {
    fontSize: 20,
    color: '#CBD5E1',
    marginHorizontal: 8,
  },
  yearInput: {
    flex: 1.5,
  },

  ageGroupContainer: {
    marginBottom: 8,
  },
  ageGroupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.7,
  },
  ageGroupItemActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#8B5CF6',
    opacity: 1,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  ageGroupItemInactive: {
    opacity: 0.5,
  },
  ageGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ageGroupIconActive: {
    backgroundColor: '#8B5CF6',
  },
  ageGroupEmoji: {
    fontSize: 24,
    color: '#64748B',
  },
  ageGroupEmojiActive: {
    color: '#FFFFFF',
  },
  ageGroupTextContainer: {
    flex: 1,
  },
  ageGroupLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  ageGroupLabelActive: {
    color: '#1E293B',
  },
  ageGroupDescription: {
    fontSize: 13,
    color: '#94A3B8',
  },
  ageGroupDescriptionActive: {
    color: '#8B5CF6',
  },
  ageGroupSelectedIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  ageGroupSelectedIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ageHint: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  ageHintBaby: {
    color: '#3B82F6',
  },
  ageHintToddler: {
    color: '#10B981',
  },
  ageHintPreschool: {
    color: '#8B5CF6',
  },

  genderGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  genderIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  genderEmoji: {
    fontSize: 28,
  },
  genderEmojiActive: {
    fontSize: 32,
  },
  genderLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  genderLabelActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementContainer: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  measurementInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
  },
  measurementUnit: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  languageIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageEmoji: {
    fontSize: 24,
  },
  languageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  languageTitleActive: {
    color: '#8B5CF6',
  },
  languageDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  languageDescActive: {
    color: '#8B5CF6',
  },

  phoneHintContainer: {
    marginTop: 8,
  },
  phoneHintText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  phoneErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  phoneSuccessText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  passwordHintContainer: {
    marginTop: 8,
  },
  passwordErrorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  passwordSuccessText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },

  errorCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  hintCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  hintText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  extraSection: {
    marginBottom: 32,
  },
  extraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  extraTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  extraSubtitle: {
    fontSize: 13,
    color: '#64748B',
    maxWidth: '70%',
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  extraCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  extraCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  extraCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extraCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  extraCardEmoji: {
    fontSize: 20,
  },
  extraCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 24,
    color: '#DC2626',
    fontWeight: '300',
    lineHeight: 24,
  },
  extraForm: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  ageGroupBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  ageGroupBadgeBaby: {
    backgroundColor: '#DBEAFE',
  },
  ageGroupBadgeToddler: {
    backgroundColor: '#D1FAE5',
  },
  ageGroupBadgePreschool: {
    backgroundColor: '#E0E7FF',
  },
  ageGroupBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roleCard: {
    width: '31%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleCardActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  roleEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  roleEmojiActive: {
    fontSize: 28,
  },
  roleLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  roleLabelActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },

  overviewHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  overviewCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  overviewEmoji: {
    fontSize: 48,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    width: '48%',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  extraSummary: {
    marginBottom: 24,
  },
  extraSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  extraSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  extraSummaryEmoji: {
    fontSize: 20,
  },
  extraSummaryText: {
    flex: 1,
  },
  extraSummaryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  extraSummaryAge: {
    fontSize: 12,
    color: '#64748B',
  },
  successCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  successEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 20,
  },

  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#8B5CF6',
  },
  nextButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 20,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nextButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    marginLeft: 8,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: '#64748B',
  },
  bottomLogin: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
});