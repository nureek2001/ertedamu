// app/(tabs)/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// !!! путь поправь под свою структуру
import AppHeader, {
  type AgeGroup,
  type ChildChip,
  getAgeGroupStyle,
} from '../../components/common/AppHeader';
import AskAvaFab from '../../components/common/AskAvaFab';

const { width } = Dimensions.get('window');

// =====================
// ТИПЫ
// =====================

type ExtraChild = {
  id: string;
  name: string;
  birthMonth: string;
  birthYear: string;
};

type RoutineState = {
  morning: boolean;
  day: boolean;
  evening: boolean;
};

type RoutineMap = Record<string, RoutineState>;

type Mood = 'happy' | 'excited' | 'tired' | 'worried' | null;

type ChildPlan = {
  morningTitle: string;
  morningText: string;
  dayTitle: string;
  dayText: string;
  eveningTitle: string;
  eveningText: string;
  todayHint: string;
  parentPause: string;
  observation: string;
};

// =====================
// МАТЕРИАЛЫ
// =====================

type ContentKind = 'mini_game' | 'video' | 'activity';
type ContentItem = {
  id: string;
  kind: ContentKind;
  title: string;
  desc: string;
  ageGroups: AgeGroup[];
  emoji: string;
  gradient: readonly [string, string];
  route?: string;
  videoUrl?: string;
  minutes?: number;
  difficulty?: 'легко' | 'средне' | 'сложно';
  tag?: string;
};

const CONTENT_LIBRARY: ContentItem[] = [
  {
    id: 'game-color-match',
    kind: 'mini_game',
    title: 'Найди цвет',
    desc: 'Выбери нужный цвет по подсказке.',
    ageGroups: ['toddler', 'preschool'],
    emoji: '🎨',
    gradient: ['#34D399', '#10B981'],
    route: '/games/color-match',
    minutes: 2,
    difficulty: 'легко',
    tag: 'Внимание',
  },
  {
    id: 'game-shapes',
    kind: 'mini_game',
    title: 'Фигуры',
    desc: 'Круг/квадрат/треугольник — угадай.',
    ageGroups: ['preschool'],
    emoji: '🔺',
    gradient: ['#A78BFA', '#8B5CF6'],
    route: '/games/shapes',
    minutes: 3,
    difficulty: 'средне',
    tag: 'Логика',
  },
  {
    id: 'video-speech-1',
    kind: 'video',
    title: 'Развитие речи',
    desc: 'Короткие упражнения на звуки и слова.',
    ageGroups: ['toddler', 'preschool'],
    emoji: '📺',
    gradient: ['#60A5FA', '#3B82F6'],
    route: '/videos/player',
    videoUrl: 'https://www.youtube.com/watch?v=tkkpOEqGFC0&list=RDtkkpOEqGFC0&start_radio=1',
    minutes: 6,
    difficulty: 'легко',
    tag: 'Речь',
  },
  {
    id: 'video-baby-contact',
    kind: 'video',
    title: 'Контакт и внимание',
    desc: 'Мягкие ритуалы для малышей до года.',
    ageGroups: ['baby'],
    emoji: '👶',
    gradient: ['#93C5FD', '#60A5FA'],
    route: '/videos/player',
    videoUrl: 'https://www.youtube.com/watch?v=YYYYYYYY',
    minutes: 5,
    difficulty: 'легко',
    tag: 'Привязанность',
  },
  {
    id: 'act-story',
    kind: 'activity',
    title: 'История на 3 предмета',
    desc: 'Соберите мини-сюжет из вещей вокруг.',
    ageGroups: ['preschool'],
    emoji: '📚',
    gradient: ['#F472B6', '#EC4899'],
    route: '/activities/story-3',
    minutes: 7,
    difficulty: 'средне',
    tag: 'Воображение',
  },
  {
    id: 'act-sensory',
    kind: 'activity',
    title: 'Сенсорная коробка',
    desc: 'Крупа + ложка: ищем и называем предметы.',
    ageGroups: ['toddler', 'preschool'],
    emoji: '🧺',
    gradient: ['#FDE68A', '#F59E0B'],
    route: '/activities/sensory-box',
    minutes: 8,
    difficulty: 'легко',
    tag: 'Сенсорика',
  },
];

// =====================
// ВСПОМОГАТЕЛЬНОЕ
// =====================

const calculateAgeGroup = (
  monthStr?: string | null,
  yearStr?: string | null
): AgeGroup => {
  const month = monthStr ? parseInt(monthStr, 10) : NaN;
  const year = yearStr ? parseInt(yearStr, 10) : NaN;

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return 'unknown';

  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const ageMonths = (nowYear - year) * 12 + (nowMonth - month);
  if (ageMonths < 0) return 'unknown';
  if (ageMonths < 12) return 'baby';
  if (ageMonths < 36) return 'toddler';
  return 'preschool';
};

const getPlanForChild = (name: string, ageGroup: AgeGroup): ChildPlan => {
  const shortName = (name || 'ребёнок').split(' ')[0];

  if (ageGroup === 'baby') {
    return {
      morningTitle: 'Утро: контакт и голос',
      morningText: `5 минут спокойного контакта с ${shortName}: объятия, поглаживания и мягкий голос.`,
      dayTitle: 'День: мир вокруг',
      dayText: `Покажите ${shortName} 2–3 предмета дома и назовите их простыми словами.`,
      eveningTitle: 'Вечер: сигнал ко сну',
      eveningText: `Один короткий ритуал: свет потише, спокойная фраза и одно повторяющееся действие.`,
      todayHint:
        'Для малышей до года важнее всего предсказуемость и ощущение, что взрослый рядом и откликается.',
      parentPause: `Сегодня достаточно того, что вы несколько раз осознанно посмотрели на ${shortName}, улыбнулись и откликнулись на сигнал.`,
      observation: `Обратите внимание, на что ${shortName} смотрит дольше всего: лица, свет, движение.`,
    };
  }

  if (ageGroup === 'toddler') {
    return {
      morningTitle: 'Утро: маленький выбор',
      morningText: `Предложите ${shortName} выбрать: какая кружка или какая игрушка пойдёт с вами в день.`,
      dayTitle: 'День: движение и игра',
      dayText: `Короткая активность на 5–10 минут: пробежать до двери, перепрыгнуть через «линии» на полу.`,
      eveningTitle: 'Вечер: рассказ про день',
      eveningText: `Перед сном спросите ${shortName}: «Что сегодня было самым смешным?»`,
      todayHint:
        'Детям 1–3 лет важно ощущать, что их мнение учитывают, но границы остаются у взрослого.',
      parentPause: `Сегодня можно отметить вслух одну штуку, которая у ${shortName} получилась: «Мне понравилось, как ты ...».`,
      observation: `Посмотрите, в какие моменты ${shortName} оживляется: движение, истории, конструктор.`,
    };
  }

  if (ageGroup === 'preschool') {
    return {
      morningTitle: 'Утро: мини-план дня',
      morningText: `Спросите ${shortName}: «Что ты сегодня хочешь сделать?» и добавьте одну свою идею.`,
      dayTitle: 'День: самостоятельное дело',
      dayText: `Маленькое задание: разложить вещи, полить цветы или собрать конструктор по «задаче».`,
      eveningTitle: 'Вечер: эмоции и итоги',
      eveningText: `Обсудите с ${shortName}, когда было радостно, а когда — немного сложно, без оценок.`,
      todayHint:
        'В 3–6 лет ребёнку важно участвовать в решениях и пробовать ответственность в безопасных задачах.',
      parentPause: `Один разговор с ${shortName} без телефона и спешки — даже 5–7 минут уже важны.`,
      observation: `Наблюдайте, какие темы ${shortName} поднимает сам(а): друзья, игра, страхи.`,
    };
  }

  return {
    morningTitle: 'Утро: короткий контакт',
    morningText: `Несколько минут спокойного внимания к ${shortName}: обнимите и спросите, как он/она.`,
    dayTitle: 'День: одна активность',
    dayText: `Одна небольшая активность: игра, прогулка, разговор — главное, чтобы вы были включены.`,
    eveningTitle: 'Вечер: повторяющийся ритуал',
    eveningText: `История/песня/«три хороших момента» — каждый день одинаково.`,
    todayHint:
      'Главная цель — не идеальный список дел, а ощущение связи между ребёнком и взрослым.',
    parentPause: `Если сегодня был хотя бы один живой момент с ${shortName} без телефонов — это уже вклад.`,
    observation: `Отметьте, в какие моменты дня с ${shortName} вам легче, а в какие — сложнее.`,
  };
};

// =====================
// SCREEN
// =====================

type MaterialsTab = 'all' | 'mini_game' | 'video' | 'activity';

const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  const [parentName, setParentName] = useState<string | null>(null);
  const [parentRole, setParentRole] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [extraChildren, setExtraChildren] = useState<ExtraChild[]>([]);
  const [mainBirthMonth, setMainBirthMonth] = useState<string | null>(null);
  const [mainBirthYear, setMainBirthYear] = useState<string | null>(null);

  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const [routineMap, setRoutineMap] = useState<RoutineMap>({});
  const [moodMap, setMoodMap] = useState<Record<string, Mood>>({});
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const [materialsTab, setMaterialsTab] = useState<MaterialsTab>('all');
  const [materialsQuery, setMaterialsQuery] = useState('');
  const [lastContentTitle, setLastContentTitle] = useState<string | null>(null);

  const [streakDays, setStreakDays] = useState<number>(0);
  const [streakDoneToday, setStreakDoneToday] = useState<boolean>(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // загрузка данных профиля
  useEffect(() => {
    const loadData = async () => {
      try {
        const entries = await AsyncStorage.multiGet([
          'parentName',
          'parentRole',
          'childName',
          'extraChildren',
          'childBirthMonth',
          'childBirthYear',
        ]);

        const map: Record<string, string | null> = Object.fromEntries(
          entries.map(([k, v]) => [k, v ?? null])
        );

        setParentName(map.parentName);
        setParentRole(map.parentRole);
        setChildName(map.childName);
        setMainBirthMonth(map.childBirthMonth);
        setMainBirthYear(map.childBirthYear);

        if (map.extraChildren) {
          try {
            const parsed = JSON.parse(map.extraChildren);
            if (Array.isArray(parsed)) setExtraChildren(parsed);
          } catch (e) {
            console.warn('Error parsing extraChildren', e);
          }
        }
      } catch (e) {
        console.warn('Error loading home data', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const childrenList: ChildChip[] = useMemo(() => {
    const name = childName && childName.trim().length > 0 ? childName : 'Ребёнок';

    const mainAgeGroup = calculateAgeGroup(mainBirthMonth, mainBirthYear);
    const mainStyle = getAgeGroupStyle(mainAgeGroup);

    const base: ChildChip = {
      id: 'main',
      name,
      tag: 'Основной профиль',
      ageGroup: mainAgeGroup,
      emoji: mainStyle.emoji,
    };

    const extras: ChildChip[] = extraChildren.map((c, index) => {
      const ageGroup = calculateAgeGroup(c.birthMonth, c.birthYear);
      const style = getAgeGroupStyle(ageGroup);
      return {
        id: c.id,
        name: c.name && c.name.trim().length > 0 ? c.name : `Ребёнок ${index + 2}`,
        tag: 'Дополнительно',
        ageGroup,
        emoji: style.emoji,
      };
    });

    return [base, ...extras];
  }, [childName, extraChildren, mainBirthMonth, mainBirthYear]);

  // init maps (routine, mood, notes)
  useEffect(() => {
    setRoutineMap(prev => {
      const updated: RoutineMap = { ...prev };
      childrenList.forEach(child => {
        if (!updated[child.id]) updated[child.id] = { morning: false, day: false, evening: false };
      });
      Object.keys(updated).forEach(id => {
        if (!childrenList.some(c => c.id === id)) delete updated[id];
      });
      return updated;
    });

    setMoodMap(prev => {
      const updated: Record<string, Mood> = { ...prev };
      childrenList.forEach(child => {
        if (!(child.id in updated)) updated[child.id] = null;
      });
      Object.keys(updated).forEach(id => {
        if (!childrenList.some(c => c.id === id)) delete updated[id];
      });
      return updated;
    });

    setNoteMap(prev => {
      const updated: Record<string, string> = { ...prev };
      childrenList.forEach(child => {
        if (!(child.id in updated)) updated[child.id] = '';
      });
      Object.keys(updated).forEach(id => {
        if (!childrenList.some(c => c.id === id)) delete updated[id];
      });
      return updated;
    });
  }, [childrenList]);

  const activeChild = childrenList[activeChildIndex] ?? childrenList[0];
  const activeChildId = activeChild?.id;

  const activeRoutine: RoutineState =
    (activeChildId && routineMap[activeChildId]) || { morning: false, day: false, evening: false };

  const activeMood: Mood =
    activeChildId && moodMap[activeChildId] ? moodMap[activeChildId] : null;

  const activeNote: string =
    activeChildId && typeof noteMap[activeChildId] === 'string' ? noteMap[activeChildId] : '';

  const completedCount = Object.values(activeRoutine).filter(Boolean).length;
  const totalCount = Object.keys(activeRoutine).length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const plan = getPlanForChild(activeChild?.name ?? 'Ребёнок', activeChild?.ageGroup ?? 'unknown');

  const roleLabel = (() => {
    switch (parentRole) {
      case 'mother':
        return 'Мама';
      case 'father':
        return 'Папа';
      case 'grandma':
        return 'Бабушка';
      case 'grandpa':
        return 'Дедушка';
      case 'relative':
        return 'Родственник';
      case 'other':
        return 'Взрослый';
      default:
        return 'Родитель';
    }
  })();

  const greetingName =
    parentName && parentName.trim().length > 0 ? parentName.split(' ')[0] : 'Семья';

  const toggleRoutineForActive = (key: keyof RoutineState) => {
    if (!activeChildId) return;

    setRoutineMap(prev => {
      const current = prev[activeChildId] || { morning: false, day: false, evening: false };
      const next = { ...current, [key]: !current[key] };

      // streak
      const prevCount = Object.values(current).filter(Boolean).length;
      const nextCount = Object.values(next).filter(Boolean).length;
      if (prevCount === 0 && nextCount > 0) {
        setStreakDoneToday(true);
        bumpStreak(activeChildId);
      }

      return { ...prev, [activeChildId]: next };
    });
  };

  const setMoodForActive = (newMood: Mood) => {
    if (!activeChildId) return;
    setMoodMap(prev => {
      const current = prev[activeChildId] ?? null;
      return { ...prev, [activeChildId]: current === newMood ? null : newMood };
    });
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'hasOnboarded',
        'isLoggedIn',
        'parentName',
        'parentRole',
        'parentEmail',
        'parentPhone',
        'parentPassword',
        'childName',
        'childBirthMonth',
        'childBirthYear',
        'language',
        'extraChildren',
      ]);
      router.replace('/login');
    } catch (error) {
      console.warn('Error clearing storage:', error);
      router.replace('/login');
    }
  };

  const handleQuickAction = (type: 'routine' | 'ideas' | 'question') => {
    if (type === 'routine') {
      Alert.alert('Режим дня', 'Скоро здесь появится отдельный экран режима 😊');
    }
    if (type === 'ideas') {
      Alert.alert('Идеи игр', `Скоро появится подборка для ${activeChild?.name}.`);
    }
    if (type === 'question') {
      router.push('/chat' as any);
    }
  };

  const todayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const loadStreak = async (childId: string) => {
    try {
      const raw = await AsyncStorage.getItem(`streak_${childId}`);
      if (!raw) {
        setStreakDays(0);
        setStreakDoneToday(false);
        return;
      }
      const parsed = JSON.parse(raw) as { days?: number; lastDate?: string; doneDate?: string };
      const days = typeof parsed?.days === 'number' ? parsed.days : 0;

      const doneToday = parsed?.doneDate === todayKey();
      setStreakDays(days);
      setStreakDoneToday(doneToday);
    } catch {
      setStreakDays(0);
      setStreakDoneToday(false);
    }
  };

  const bumpStreak = async (childId: string) => {
    try {
      const raw = await AsyncStorage.getItem(`streak_${childId}`);
      const now = todayKey();

      if (!raw) {
        await AsyncStorage.setItem(
          `streak_${childId}`,
          JSON.stringify({ days: 1, doneDate: now })
        );
        setStreakDays(1);
        return;
      }

      const parsed = JSON.parse(raw) as { days?: number; doneDate?: string };
      const prevDays = typeof parsed?.days === 'number' ? parsed.days : 0;
      const prevDone = parsed?.doneDate;

      if (prevDone === now) return;

      await AsyncStorage.setItem(
        `streak_${childId}`,
        JSON.stringify({ days: prevDays + 1, doneDate: now })
      );
      setStreakDays(prevDays + 1);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStreak(activeChildId ?? 'main');
  }, [activeChildId]);

  // материалы: последнее
  useEffect(() => {
    const readLast = async () => {
      try {
        const raw = await AsyncStorage.getItem(`lastContent_${activeChildId ?? 'main'}`);
        if (!raw) {
          setLastContentTitle(null);
          return;
        }
        const parsed = JSON.parse(raw) as { id?: string };
        const found = CONTENT_LIBRARY.find(x => x.id === parsed?.id);
        setLastContentTitle(found?.title ?? null);
      } catch {
        setLastContentTitle(null);
      }
    };
    readLast();
  }, [activeChildId]);

  const openContent = async (item: ContentItem) => {
    try {
      await AsyncStorage.setItem(
        `lastContent_${activeChildId ?? 'main'}`,
        JSON.stringify({ id: item.id, at: Date.now() })
      );
      setLastContentTitle(item.title);
    } catch {}

    if (item.route) {
      if (item.kind === 'video' && item.videoUrl) {
        router.push({ pathname: item.route as any, params: { url: item.videoUrl } } as any);
        return;
      }
      router.push(item.route as any);
      return;
    }

    Alert.alert(item.title, 'Скоро откроем этот материал 😊');
  };

  const materialsForActive = useMemo(() => {
    const group = activeChild?.ageGroup ?? 'unknown';
    const q = materialsQuery.trim().toLowerCase();

    return CONTENT_LIBRARY.filter(item => {
      if (!item.ageGroups.includes(group)) return false;
      if (materialsTab !== 'all' && item.kind !== materialsTab) return false;

      if (q.length > 0) {
        const hay = `${item.title} ${item.desc} ${item.tag ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeChild?.ageGroup, materialsTab, materialsQuery]);

  const featured = useMemo(() => materialsForActive[0] ?? null, [materialsForActive]);
  const games = useMemo(
    () => materialsForActive.filter(x => x.kind === 'mini_game').slice(0, 10),
    [materialsForActive]
  );
  const videos = useMemo(
    () => materialsForActive.filter(x => x.kind === 'video').slice(0, 10),
    [materialsForActive]
  );
  const activities = useMemo(
    () => materialsForActive.filter(x => x.kind === 'activity').slice(0, 10),
    [materialsForActive]
  );

  const tabLabel = (t: MaterialsTab) => {
    if (t === 'all') return 'Все';
    if (t === 'mini_game') return 'Игры';
    if (t === 'video') return 'Видео';
    return 'Упражнения';
  };

  const tabIcon = (t: MaterialsTab) => {
    if (t === 'all') return '✨';
    if (t === 'mini_game') return '🎮';
    if (t === 'video') return '📺';
    return '🧩';
  };

  const kindLabel = (k: ContentKind) => {
    if (k === 'mini_game') return 'Игра';
    if (k === 'video') return 'Видео';
    return 'Упражнение';
  };

  const openChat = () => router.push('/chat' as any);

  if (loading) {
    return (
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* общий header */}
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={setActiveChildIndex}
        onLogout={handleLogout}
      />

      {/* BODY */}
      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            {/* hero */}
            <View style={styles.heroCard}>
              <View style={styles.heroRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>
                    {roleLabel},{' '}
                    <Text style={styles.heroTitleAccent}>{greetingName}</Text>
                  </Text>
                  <Text style={styles.heroSub}>
                    Сегодня фокус:{' '}
                    <Text style={styles.heroSubBold}>{activeChild?.name}</Text>
                  </Text>
                </View>

                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.heroAvatar}
                >
                  <Text style={styles.heroAvatarText}>
                    {greetingName !== 'Семья' ? greetingName[0]?.toUpperCase() : '👪'}
                  </Text>
                </LinearGradient>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Прогресс</Text>
                  <Text style={styles.heroStatValue}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Выполнено</Text>
                  <Text style={styles.heroStatValue}>
                    {completedCount}/{totalCount}
                  </Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <Text style={styles.heroStatLabel}>Серия</Text>
                  <Text style={styles.heroStatValue}>{streakDays} 🔥</Text>
                </View>
              </View>

              <View style={styles.microPlan}>
                <Text style={styles.microTitle}>⚡ План на 10 минут</Text>
                <Text style={styles.microText}>
                  Сделайте 1 пункт из «Сегодня» + 1 мини-материал. Этого достаточно,
                  чтобы день считался продуктивным.
                </Text>
                <View style={styles.microActions}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      if (featured) openContent(featured);
                      else Alert.alert('Материалы', 'Пока нет подборки под фильтры.');
                    }}
                    style={styles.microBtn}
                  >
                    <Text style={styles.microBtnText}>Открыть подборку</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => setMaterialsTab('mini_game')}
                    style={[styles.microBtn, styles.microBtnGhost]}
                  >
                    <Text
                      style={[styles.microBtnText, styles.microBtnTextGhost]}
                    >
                      Игры
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* СЕГОДНЯ */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Сегодня</Text>
                <View style={styles.pillCounter}>
                  <Text style={styles.pillCounterText}>
                    {Math.round(progress * 100)}%
                  </Text>
                </View>
              </View>

              <View style={styles.todayGrid}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => toggleRoutineForActive('morning')}
                  style={[
                    styles.todayCard,
                    activeRoutine.morning && styles.todayCardActive,
                  ]}
                >
                  <View style={styles.todayTop}>
                    <Text style={styles.todayEmoji}>🌅</Text>
                    <View
                      style={[
                        styles.checkDot,
                        activeRoutine.morning
                          ? styles.checkDotOn
                          : styles.checkDotOff,
                      ]}
                    />
                  </View>
                  <Text style={styles.todayTitle}>{plan.morningTitle}</Text>
                  <Text style={styles.todayText} numberOfLines={3}>
                    {plan.morningText}
                  </Text>
                  <Text style={styles.todayCTA}>
                    {activeRoutine.morning ? 'Сделано ✓' : 'Отметить'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => toggleRoutineForActive('day')}
                  style={[
                    styles.todayCard,
                    activeRoutine.day && styles.todayCardActive,
                  ]}
                >
                  <View style={styles.todayTop}>
                    <Text style={styles.todayEmoji}>🌤️</Text>
                    <View
                      style={[
                        styles.checkDot,
                        activeRoutine.day
                          ? styles.checkDotOn
                          : styles.checkDotOff,
                      ]}
                    />
                  </View>
                  <Text style={styles.todayTitle}>{plan.dayTitle}</Text>
                  <Text style={styles.todayText} numberOfLines={3}>
                    {plan.dayText}
                  </Text>
                  <Text style={styles.todayCTA}>
                    {activeRoutine.day ? 'Сделано ✓' : 'Отметить'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => toggleRoutineForActive('evening')}
                  style={[
                    styles.todayCard,
                    activeRoutine.evening && styles.todayCardActive,
                  ]}
                >
                  <View style={styles.todayTop}>
                    <Text style={styles.todayEmoji}>🌙</Text>
                    <View
                      style={[
                        styles.checkDot,
                        activeRoutine.evening
                          ? styles.checkDotOn
                          : styles.checkDotOff,
                      ]}
                    />
                  </View>
                  <Text style={styles.todayTitle}>{plan.eveningTitle}</Text>
                  <Text style={styles.todayText} numberOfLines={3}>
                    {plan.eveningText}
                  </Text>
                  <Text style={styles.todayCTA}>
                    {activeRoutine.evening ? 'Сделано ✓' : 'Отметить'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>💡 Подсказка дня</Text>
                <Text style={styles.tipText}>{plan.todayHint}</Text>
              </View>
            </View>

            {/* МАТЕРИАЛЫ */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Материалы</Text>
                  <Text style={styles.sectionSub}>
                    Для{' '}
                    <Text style={styles.sectionSubBold}>
                      {activeChild?.name}
                    </Text>
                  </Text>
                </View>

                {lastContentTitle ? (
                  <View style={styles.lastBadge}>
                    <Text
                      style={styles.lastBadgeText}
                      numberOfLines={1}
                    >
                      Продолжить: {lastContentTitle}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.searchWrap}>
                <Text style={styles.searchIcon}>🔎</Text>
                <TextInput
                  value={materialsQuery}
                  onChangeText={setMaterialsQuery}
                  placeholder="Поиск: речь, логика, внимание..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                />
                {materialsQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setMaterialsQuery('')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.searchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsScroll}
              >
                {(['all', 'mini_game', 'video', 'activity'] as MaterialsTab[]).map(
                  t => {
                    const active = materialsTab === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setMaterialsTab(t)}
                        activeOpacity={0.9}
                        style={[
                          styles.tabPill,
                          active && styles.tabPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabPillText,
                            active && styles.tabPillTextActive,
                          ]}
                        >
                          {tabIcon(t)} {tabLabel(t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </ScrollView>

              {featured ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => openContent(featured)}
                  style={styles.featuredWrap}
                >
                  <LinearGradient
                    colors={featured.gradient as any}
                    style={styles.featuredCard}
                  >
                    <View style={styles.featuredTop}>
                      <Text style={styles.featuredEmoji}>{featured.emoji}</Text>
                      <View style={styles.featuredMeta}>
                        <Text style={styles.featuredMetaText}>
                          {kindLabel(featured.kind)}
                        </Text>
                        {typeof featured.minutes === 'number' && (
                          <Text style={styles.featuredMetaText}>
                            {' '}
                            • {featured.minutes} мин
                          </Text>
                        )}
                        {featured.difficulty && (
                          <Text style={styles.featuredMetaText}>
                            {' '}
                            • {featured.difficulty}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Text style={styles.featuredTitle}>{featured.title}</Text>
                    <Text
                      style={styles.featuredDesc}
                      numberOfLines={2}
                    >
                      {featured.desc}
                    </Text>

                    <View style={styles.featuredBottom}>
                      <View style={styles.featuredTag}>
                        <Text style={styles.featuredTagText}>
                          {featured.tag ?? 'Подборка дня'}
                        </Text>
                      </View>
                      <View style={styles.featuredCta}>
                        <Text style={styles.featuredCtaText}>
                          {featured.kind === 'video'
                            ? 'Смотреть'
                            : featured.kind === 'mini_game'
                            ? 'Играть'
                            : 'Открыть'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Пока нет материалов</Text>
                  <Text style={styles.emptyText}>
                    Для этого возраста сейчас нет совпадений по фильтрам.
                    Попробуйте «Все» или очистите поиск.
                  </Text>
                </View>
              )}

              {materialsTab === 'all' ? (
                <>
                  {!!games.length && (
                    <View style={styles.rowSection}>
                      <View style={styles.rowHeader}>
                        <Text style={styles.rowTitle}>Игры</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {games.map(item => (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.9}
                            onPress={() => openContent(item)}
                            style={styles.smallCardWrap}
                          >
                            <LinearGradient
                              colors={item.gradient as any}
                              style={styles.smallCard}
                            >
                              <Text style={styles.smallEmoji}>
                                {item.emoji}
                              </Text>
                              <Text
                                style={styles.smallTitle}
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={styles.smallMeta}
                                numberOfLines={1}
                              >
                                {item.minutes
                                  ? `${item.minutes} мин`
                                  : 'коротко'}{' '}
                                • {item.difficulty ?? 'легко'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {!!videos.length && (
                    <View style={styles.rowSection}>
                      <View style={styles.rowHeader}>
                        <Text style={styles.rowTitle}>Видео</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {videos.map(item => (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.9}
                            onPress={() => openContent(item)}
                            style={styles.smallCardWrap}
                          >
                            <LinearGradient
                              colors={item.gradient as any}
                              style={styles.smallCard}
                            >
                              <Text style={styles.smallEmoji}>
                                {item.emoji}
                              </Text>
                              <Text
                                style={styles.smallTitle}
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={styles.smallMeta}
                                numberOfLines={1}
                              >
                                {item.minutes
                                  ? `${item.minutes} мин`
                                  : 'коротко'}{' '}
                                • {item.tag ?? 'видео'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {!!activities.length && (
                    <View style={styles.rowSection}>
                      <View style={styles.rowHeader}>
                        <Text style={styles.rowTitle}>Упражнения</Text>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                      >
                        {activities.map(item => (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.9}
                            onPress={() => openContent(item)}
                            style={styles.smallCardWrap}
                          >
                            <LinearGradient
                              colors={item.gradient as any}
                              style={styles.smallCard}
                            >
                              <Text style={styles.smallEmoji}>
                                {item.emoji}
                              </Text>
                              <Text
                                style={styles.smallTitle}
                                numberOfLines={1}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={styles.smallMeta}
                                numberOfLines={1}
                              >
                                {item.minutes
                                  ? `${item.minutes} мин`
                                  : 'коротко'}{' '}
                                • {item.tag ?? 'активность'}
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.grid}>
                  {materialsForActive.slice(0, 12).map(item => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.9}
                      onPress={() => openContent(item)}
                      style={styles.gridItemWrap}
                    >
                      <LinearGradient
                        colors={item.gradient as any}
                        style={styles.gridItem}
                      >
                        <View style={styles.gridTop}>
                          <Text style={styles.gridEmoji}>{item.emoji}</Text>
                          <View style={styles.gridBadge}>
                            <Text style={styles.gridBadgeText}>
                              {kindLabel(item.kind)}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={styles.gridTitle}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={styles.gridDesc}
                          numberOfLines={2}
                        >
                          {item.desc}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Настроение и заметка */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Настроение и заметка</Text>
              </View>

              <View style={styles.softCard}>
                <Text style={styles.softLabel}>
                  Как сейчас {activeChild?.name}?
                </Text>

                <View style={styles.moodRow}>
                  {[
                    { key: 'happy' as Mood, label: 'Радость', emoji: '😊' },
                    { key: 'excited' as Mood, label: 'Вдохн.', emoji: '🤩' },
                    { key: 'tired' as Mood, label: 'Устал', emoji: '😴' },
                    { key: 'worried' as Mood, label: 'Тревога', emoji: '😕' },
                  ].map(item => {
                    const selected = activeMood === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key || 'none'}
                        onPress={() => setMoodForActive(item.key)}
                        activeOpacity={0.85}
                        style={[
                          styles.moodChip,
                          selected && styles.moodChipActive,
                        ]}
                      >
                        <Text style={styles.moodChipEmoji}>
                          {item.emoji}
                        </Text>
                        <Text
                          style={[
                            styles.moodChipText,
                            selected && styles.moodChipTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.noteHeaderRow}>
                  <Text style={styles.noteTitle}>Заметка дня</Text>
                  <Text style={styles.noteHint}>для вас</Text>
                </View>

                <View style={styles.noteInputWrapper}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Например: сегодня сам подошёл к ребёнку на площадке..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={activeNote}
                    onChangeText={text => {
                      if (!activeChildId) return;
                      setNoteMap(prev => ({ ...prev, [activeChildId]: text }));
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Для вас */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Для вас</Text>
              </View>

              <View style={styles.twoCards}>
                <LinearGradient
                  colors={['#ECFDF5', '#D1FAE5']}
                  style={styles.infoCard}
                >
                  <Text style={styles.infoCardTitle}>🧘‍♀️ Пауза</Text>
                  <Text style={styles.infoCardText}>{plan.parentPause}</Text>
                </LinearGradient>

                <LinearGradient
                  colors={['#FEF3C7', '#FDE68A']}
                  style={styles.infoCard}
                >
                  <Text style={styles.infoCardTitle}>🔍 Наблюдение</Text>
                  <Text style={styles.infoCardText}>{plan.observation}</Text>
                </LinearGradient>
              </View>
            </View>

            <View style={styles.bottomSpacing} />
          </Animated.View>
        </ScrollView>

        {/* плавающая AI-кнопка — приподнята над таб-баром */}
        <AskAvaFab
          onPress={openChat}
          bottomInset={15}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

// =====================
// STYLES
// =====================

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 16, marginTop: 12, fontWeight: '500' },

  body: { flex: 1, position: 'relative' },

  scrollContent: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 100 },

  section: { marginBottom: 18 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sectionSub: { marginTop: 4, fontSize: 12, color: '#64748B' },
  sectionSubBold: { color: '#0F172A', fontWeight: '700' },

  // hero
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  heroTitleAccent: { color: '#7C3AED' },
  heroSub: { fontSize: 13, color: '#64748B' },
  heroSubBold: { color: '#0F172A', fontWeight: '700' },
  heroAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  heroAvatarText: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },

  heroStatsRow: {
    marginTop: 12,
    flexDirection: 'row',
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  heroStat: { flex: 1 },
  heroStatLabel: { fontSize: 11, color: '#64748B', marginBottom: 6, fontWeight: '600' },
  heroStatValue: { fontSize: 16, color: '#0F172A', fontWeight: '900' },
  heroStatDivider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 10 },

  microPlan: {
    marginTop: 12,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 14,
  },
  microTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, marginBottom: 6 },
  microText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  microActions: { marginTop: 10, flexDirection: 'row', gap: 10 },
  microBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  microBtnText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
  microBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  microBtnTextGhost: { color: '#FFFFFF' },

  // today
  pillCounter: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillCounterText: { color: '#4338CA', fontWeight: '900', fontSize: 12 },

  todayGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  todayCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  todayCardActive: { borderColor: '#A78BFA', backgroundColor: '#FBFAFF' },
  todayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayEmoji: { fontSize: 20 },
  checkDot: { width: 10, height: 10, borderRadius: 5 },
  checkDotOn: { backgroundColor: '#10B981' },
  checkDotOff: { backgroundColor: '#CBD5E1' },
  todayTitle: { marginTop: 10, fontSize: 12, fontWeight: '900', color: '#0F172A' },
  todayText: { marginTop: 6, fontSize: 11, color: '#64748B', lineHeight: 15 },
  todayCTA: { marginTop: 10, fontSize: 11, color: '#4338CA', fontWeight: '900' },

  tipCard: {
    marginTop: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  tipTitle: { fontSize: 13, fontWeight: '900', color: '#3730A3', marginBottom: 6 },
  tipText: { fontSize: 12, color: '#475569', lineHeight: 17 },

  // materials
  lastBadge: {
    maxWidth: 170,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  lastBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { marginRight: 8, fontSize: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '600' },
  searchClear: { fontSize: 14, color: '#64748B', paddingLeft: 10, paddingVertical: 2 },

  tabsScroll: { marginTop: 10 },

  tabPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 10,
  },
  tabPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  tabPillText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },
  tabPillTextActive: { color: '#FFFFFF' },

  featuredWrap: { marginTop: 12 },
  featuredCard: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredEmoji: { fontSize: 26 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center' },
  featuredMetaText: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '800' },
  featuredTitle: { marginTop: 12, fontSize: 18, color: '#FFFFFF', fontWeight: '900' },
  featuredDesc: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 17 },
  featuredBottom: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  featuredTagText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  featuredCta: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  featuredCtaText: { color: '#0F172A', fontWeight: '900', fontSize: 12 },

  emptyCard: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#64748B', lineHeight: 17 },

  rowSection: { marginTop: 14 },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },

  smallCardWrap: { marginRight: 10 },
  smallCard: { width: 170, borderRadius: 18, padding: 14 },
  smallEmoji: { fontSize: 22, marginBottom: 10 },
  smallTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  smallMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '800',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  gridItemWrap: { width: (width - 40 - 10) / 2, marginBottom: 10 },
  gridItem: { borderRadius: 18, padding: 14, minHeight: 130 },
  gridTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridEmoji: { fontSize: 22 },
  gridBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  gridBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  gridTitle: { marginTop: 10, color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  gridDesc: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    lineHeight: 15,
  },

  softCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  softLabel: { fontSize: 13, color: '#0F172A', fontWeight: '800', marginBottom: 10 },

  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  moodChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moodChipActive: { backgroundColor: '#EEF2FF', borderColor: '#A78BFA' },
  moodChipEmoji: { fontSize: 18, marginBottom: 4 },
  moodChipText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '800',
  },
  moodChipTextActive: { color: '#4338CA' },

  noteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  noteTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  noteHint: { fontSize: 11, color: '#94A3B8', fontWeight: '800' },

  noteInputWrapper: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteInput: {
    minHeight: 70,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    fontWeight: '600',
  },

  twoCards: { gap: 10 },
  infoCard: {
    borderRadius: 22,
    padding: 16,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  infoCardTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  infoCardText: { fontSize: 13, color: '#334155', lineHeight: 18, fontWeight: '600' },

  bottomSpacing: { height: 26 },
});
