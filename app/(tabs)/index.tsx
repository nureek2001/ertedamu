// app/(tabs)/index.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AgeGroup, CATEGORY_META, } from '../activities/data';

import AppHeader, { ChildChip } from '../../components/common/AppHeader';
import AskAvaFab from '../../components/common/AskAvaFab';

// Импорт функций хранилища и данных
import { getChildProgress, getMilestonesProgress } from '../../utils/storage';
import { ACTIVITY_LIBRARY } from '../activities/data';

// --- ДАННЫЕ ДЛЯ БЛОКОВ ---
const MOODS = [
    { id: 'happy', emoji: '😊', label: 'Радость', color: '#BBF7D0' },
    { id: 'calm', emoji: '😌', label: 'Спокойствие', color: '#E9D5FF' },
    { id: 'active', emoji: '⚡', label: 'Активность', color: '#FEF3C7' },
    { id: 'cranky', emoji: '😫', label: 'Капризы', color: '#FECACA' },
];

const ROUTINE_ITEMS = [
    { id: 'walk', label: 'Прогулка на свежем воздухе', icon: 'leaf' },
    { id: 'sleep', label: 'Дневной сон', icon: 'moon' },
    { id: 'read', label: 'Чтение книги', icon: 'book' },
    { id: 'water', label: 'Водные процедуры', icon: 'water' },
];

const WORD_OF_DAY = {
    word: 'Листопад',
    desc: 'Покажите ребенку падающие листья. Объясните, как деревья готовятся к зиме.',
    emoji: '🍂'
};

const PARENT_TIP = {
    title: 'Мамины 5 минут',
    text: 'Пока ребенок занят игрушкой, выпейте стакан воды и сделайте 3 глубоких вдоха. Вы молодец! ☕',
};

const PHOTO_CHALLENGE = {
    title: 'Фото дня: Улыбка',
    desc: 'Поймайте момент, когда ваш ребенок искренне смеется.',
    color: '#F472B6'
};

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

const calculateAgeInMonths = (mStr?: string | null, yStr?: string | null): number => {
    const m = mStr ? parseInt(mStr, 10) : 0;
    const y = yStr ? parseInt(yStr, 10) : 0;
    if (!m || !y) return 0;
    const now = new Date();
    let age = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
    return age < 0 ? 0 : age;
};

const formatAgeLabel = (months: number): string => {
    if (months <= 0) return 'Малыш';
    if (months < 12) return `${months} мес.`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} лет`;
    return `${years} г. ${remainingMonths} мес.`;
};

const getAgeGroupFromMonths = (m: number): AgeGroup => {
  if(m < 12) return 'baby'; 
  if(m < 36) return 'toddler'; 
  if(m < 84) return 'preschool'; 
  return 'school' as any;
};

const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
};

const HomeScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [parentName, setParentName] = useState<string>('Родитель');
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  const [stats, setStats] = useState({ activities: 0, milestones: 0 });

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [routineState, setRoutineState] = useState<Record<string, boolean>>({});
  
  const [dailyActivity, setDailyActivity] = useState<any>(null);
  const [isDailyDone, setIsDailyDone] = useState(false);

  const handleLogout = async () => {
    router.replace('/login');
  };

  const getStorageKey = (childId: string, type: 'mood' | 'routine') => {
    const today = new Date().toISOString().split('T')[0];
    return `daily_${childId}_${today}_${type}`;
  };

  const toggleRoutine = async (id: string) => {
      const childId = childrenList[activeChildIndex]?.id || 'main';
      const newState = {...routineState, [id]: !routineState[id]};
      setRoutineState(newState);
      await AsyncStorage.setItem(getStorageKey(childId, 'routine'), JSON.stringify(newState));
  };

  const handleMoodSelect = async (moodId: string) => {
    const childId = childrenList[activeChildIndex]?.id || 'main';
    setSelectedMood(moodId);
    await AsyncStorage.setItem(getStorageKey(childId, 'mood'), moodId);
  };

  const loadData = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet([
        'parentName', 'childName', 'childBirthMonth', 'childBirthYear', 
        'extraChildren', 'activeChildIndex'
      ]);
      const map = Object.fromEntries(entries.map(([k, v]) => [k, v]));

      setParentName(map.parentName || 'Родитель');

      let activeIdx = 0;
      if (map.activeChildIndex) {
          activeIdx = parseInt(map.activeChildIndex, 10);
          setActiveChildIndex(activeIdx);
      }

      // Создаем массив для хранения полных данных (для расчетов)
      const fullChildrenData: any[] = [];

      // 1. Добавляем основного ребенка
      const mainMonths = calculateAgeInMonths(map.childBirthMonth, map.childBirthYear);
      fullChildrenData.push({
        id: 'main',
        name: map.childName || 'Ребёнок',
        tag: formatAgeLabel(mainMonths),
        ageGroup: getAgeGroupFromMonths(mainMonths),
        color: '#3B82F6',
        birthMonth: map.childBirthMonth,
        birthYear: map.childBirthYear,
      });

      // 2. Добавляем экстра-детей
      if (map.extraChildren) {
         try {
            const extra = JSON.parse(map.extraChildren);
            if(Array.isArray(extra)) {
                extra.forEach(c => {
                    const exMonths = calculateAgeInMonths(c.birthMonth, c.birthYear);
                    fullChildrenData.push({
                        ...c, 
                        tag: formatAgeLabel(exMonths),
                        color: '#10B981', 
                        emoji: '🧒', 
                        ageGroup: getAgeGroupFromMonths(exMonths),
                        birthMonth: c.birthMonth,
                        birthYear: c.birthYear,
                    });
                });
            }
         } catch(e) {}
      }

      // Фильтруем данные для ChildrenList (убираем birthMonth/birthYear, чтобы TS не ругался)
      const filteredList: ChildChip[] = fullChildrenData.map(({ birthMonth, birthYear, ...rest }) => rest as ChildChip);
      setChildrenList(filteredList);

      const currentChildFull = fullChildrenData[activeIdx] || fullChildrenData[0];
      const currentChildId = currentChildFull.id;

      // Загружаем состояние чек-листа
      const [savedMood, savedRoutine] = await AsyncStorage.multiGet([
        getStorageKey(currentChildId, 'mood'),
        getStorageKey(currentChildId, 'routine')
      ]);

      setSelectedMood(savedMood[1]);
      setRoutineState(savedRoutine[1] ? JSON.parse(savedRoutine[1]) : {});
      
      let currentAgeMonths = calculateAgeInMonths(currentChildFull.birthMonth, currentChildFull.birthYear);

      const actProgress = await getChildProgress(currentChildId);
      const milProgress = await getMilestonesProgress(currentChildId);
      setStats({ activities: actProgress.length, milestones: milProgress.length });

      const suitableActivities = ACTIVITY_LIBRARY.filter(a => (a as any).minMonths <= currentAgeMonths);
      
      if (suitableActivities.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0]; 
          const seed = todayStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const index = seed % suitableActivities.length;
          const selected = suitableActivities[index];
          
          setDailyActivity(selected);
          const isDone = actProgress.some(a => a.activityId === (selected as any).id);
          setIsDailyDone(isDone);
      }

    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeChildIndex]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleChildChange = async (index: number) => {
      setActiveChildIndex(index);
      await AsyncStorage.setItem('activeChildIndex', index.toString());
  };

  const openActivity = (id: string) => {
      router.push(`/activities/${id}`);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4F46E5" /></View>;

  const activeChild = childrenList[activeChildIndex];
  const activityGradient = isDailyDone 
      ? (['#10B981', '#059669'] as const) 
      : (['#4F46E5', '#7C3AED'] as const);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        childrenList={childrenList}
        activeChildIndex={activeChildIndex}
        onChangeChild={handleChildChange}
        onLogout={handleLogout}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
            <Text style={styles.greeting}>{getGreeting()}, {parentName}!</Text>
            <Text style={styles.subGreeting}>
                Как дела у <Text style={styles.highlightName}>{activeChild?.name}</Text> сегодня?
            </Text>
        </View>

        <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statWidget} activeOpacity={0.9} onPress={() => router.push('/(tabs)/my-child')}>
                <LinearGradient colors={['#EEF2FF', '#C7D2FE']} style={styles.statGradient}>
                    <View style={styles.statTop}>
                        <View style={[styles.statIcon, {backgroundColor: '#6366F1'}]}>
                            <Ionicons name="game-controller" size={18} color="#FFF" />
                        </View>
                    </View>
                    <Text style={styles.statValue}>{stats.activities}</Text>
                    <Text style={styles.statLabel}>Заданий выполнено</Text>
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statWidget} activeOpacity={0.9} onPress={() => router.push('/(tabs)/my-child')}>
                <LinearGradient colors={['#F0FDF4', '#BBF7D0']} style={styles.statGradient}>
                    <View style={styles.statTop}>
                        <View style={[styles.statIcon, {backgroundColor: '#10B981'}]}>
                            <Ionicons name="ribbon" size={18} color="#FFF" />
                        </View>
                    </View>
                    <Text style={styles.statValue}>{stats.milestones}</Text>
                    <Text style={styles.statLabel}>Навыков освоено</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Настроение сейчас</Text>
            <View style={styles.moodContainer}>
                {MOODS.map((mood) => {
                    const isSelected = selectedMood === mood.id;
                    return (
                        <TouchableOpacity 
                            key={mood.id} 
                            style={[
                                styles.moodButton, 
                                isSelected && { backgroundColor: mood.color, borderColor: mood.color }
                            ]}
                            onPress={() => handleMoodSelect(mood.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                            <Text style={[styles.moodLabel, isSelected && { fontWeight: '700', color: '#1F2937' }]}>
                                {mood.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>

        {dailyActivity && (
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>
                        {isDailyDone ? 'Отличная работа! 🎉' : 'Рекомендуем сегодня'}
                    </Text>
                </View>
                <TouchableOpacity activeOpacity={0.95} onPress={() => openActivity(dailyActivity.id)}>
                    <LinearGradient colors={activityGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.featuredCard}>
                        <View style={styles.featuredHeader}>
                            <View style={[styles.featuredTag, isDailyDone && {backgroundColor: 'rgba(255,255,255,0.3)'}]}>
                                <Text style={styles.featuredTagText}>
                                    {isDailyDone 
                                      ? 'ВЫПОЛНЕНО' 
                                      : (dailyActivity?.category ? CATEGORY_META[dailyActivity.category as keyof typeof CATEGORY_META]?.label : 'Активность')
                                    }
                                </Text>
                            </View>
                            <View style={styles.featuredTime}>
                                <Ionicons name="time-outline" size={16} color="#FFF" />
                                <Text style={styles.featuredTimeText}>{dailyActivity.minutes} мин</Text>
                            </View>
                        </View>
                        <Text style={styles.featuredTitle}>{dailyActivity.title}</Text>
                        <Text style={styles.featuredDesc} numberOfLines={2}>{(dailyActivity as any).subtitle}</Text>
                        <View style={[styles.featuredButton, isDailyDone && {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                            <Text style={[styles.featuredButtonText, isDailyDone && {color: '#FFF'}]}>
                                {isDailyDone ? 'Сделано!' : 'Начать занятие'}
                            </Text>
                            <Ionicons name={isDailyDone ? "checkmark-circle" : "play"} size={18} color={isDailyDone ? "#FFF" : "#4F46E5"} />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        )}

        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Чек-лист дня</Text>
            <View style={styles.routineCard}>
                {ROUTINE_ITEMS.map((item, index) => {
                    const isDone = routineState[item.id];
                    return (
                        <View key={item.id}>
                            <TouchableOpacity style={styles.routineItem} onPress={() => toggleRoutine(item.id)} activeOpacity={0.7}>
                                <View style={[styles.routineIconBox, isDone ? {backgroundColor: '#DCFCE7'} : {backgroundColor: '#F1F5F9'}]}>
                                    <Ionicons name={item.icon as any} size={20} color={isDone ? '#10B981' : '#64748B'} />
                                </View>
                                <View style={styles.routineContent}>
                                    <Text style={[styles.routineLabel, isDone && {textDecorationLine: 'line-through', color: '#94A3B8'}]}>{item.label}</Text>
                                </View>
                                <View style={[styles.checkbox, isDone ? {backgroundColor: '#4F46E5', borderColor: '#4F46E5'} : {borderColor: '#CBD5E1'}]}>
                                    {isDone && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                </View>
                            </TouchableOpacity>
                            {index < ROUTINE_ITEMS.length - 1 && <View style={styles.divider} />}
                        </View>
                    );
                })}
            </View>
        </View>


        <View style={styles.sectionContainer}>
             <LinearGradient colors={['#ECFEFF', '#CFFAFE']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.parentCard}>
                 <View style={styles.parentHeader}>
                     <View style={{flex: 1}}>
                        <Text style={styles.parentTitle}>{PARENT_TIP.title}</Text>
                        <Text style={styles.parentText}>{PARENT_TIP.text}</Text>
                     </View>
                     <View style={styles.parentIcon}><Ionicons name="cafe-outline" size={32} color="#0891B2" /></View>
                 </View>
             </LinearGradient>
        </View>

        <View style={styles.sectionContainer}>
             <Text style={styles.sectionTitle}>Фото-челлендж</Text>
             <TouchableOpacity style={styles.photoCard} activeOpacity={0.8}>
                 <View style={styles.photoDashedBorder}>
                     <View style={styles.photoContent}>
                         <View style={[styles.photoIconCircle, {backgroundColor: '#FCE7F3'}]}><Ionicons name="camera" size={24} color="#DB2777" /></View>
                         <View style={{flex: 1}}>
                            <Text style={styles.photoTitle}>{PHOTO_CHALLENGE.title}</Text>
                            <Text style={styles.photoDesc}>{PHOTO_CHALLENGE.desc}</Text>
                         </View>
                         <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                     </View>
                 </View>
             </TouchableOpacity>
        </View>

        <View style={[styles.sectionContainer, {marginTop: 8}]}>
            <LinearGradient colors={['#1E293B', '#334155']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.factCard}>
                <View style={styles.factHeader}>
                    <Text style={styles.factLabel}>А ВЫ ЗНАЛИ?</Text>
                    <Ionicons name="planet-outline" size={20} color="#94A3B8" />
                </View>
                <Text style={styles.factText}>Прикосновения и объятия помогают ребенку не только чувствовать себя любимым, но и быстрее расти физически.</Text>
            </LinearGradient>
        </View>

        <View style={{height: 100}} />
      </ScrollView>

      <AskAvaFab onPress={() => router.push('/chat' as any)} bottomInset={20} />
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 100 },
  heroSection: { paddingHorizontal: 24, paddingTop: 20, marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  subGreeting: { fontSize: 15, color: '#64748B', marginTop: 4 },
  highlightName: { fontWeight: '700', color: '#4F46E5' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 30 },
  statWidget: { flex: 1, borderRadius: 20, shadowColor: '#4F46E5', shadowOffset: {width:0, height: 4}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3, backgroundColor: '#FFF' },
  statGradient: { padding: 16, borderRadius: 20, minHeight: 110, justifyContent: 'space-between' },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: '#1E293B', marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  sectionContainer: { marginBottom: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A', paddingHorizontal: 24, marginBottom: 12 },
  moodContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 },
  moodButton: { flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 4, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  moodEmoji: { fontSize: 28, marginBottom: 4 },
  moodLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  featuredCard: { marginHorizontal: 24, borderRadius: 24, padding: 24, shadowColor: '#4F46E5', shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  featuredHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  featuredTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  featuredTagText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  featuredTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredTimeText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  featuredTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  featuredDesc: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginBottom: 20 },
  featuredButton: { backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  featuredButtonText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  routineCard: { marginHorizontal: 24, backgroundColor: '#FFF', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  routineItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  routineIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  routineContent: { flex: 1 },
  routineLabel: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 68 },
  wordCard: { marginHorizontal: 24, backgroundColor: '#FFF', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  wordIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  wordTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  wordDesc: { fontSize: 12, color: '#64748B', lineHeight: 16 },
  wordPlayBtn: { padding: 10 },
  parentCard: { marginHorizontal: 24, borderRadius: 20, padding: 20 },
  parentHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  parentTitle: { fontSize: 16, fontWeight: '800', color: '#164E63', marginBottom: 6 },
  parentText: { fontSize: 13, color: '#155E75', lineHeight: 19 },
  parentIcon: { marginLeft: 16, opacity: 0.8 },
  photoCard: { marginHorizontal: 24, backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  photoDashedBorder: { borderWidth: 1.5, borderColor: '#F9A8D4', borderStyle: 'dashed', borderRadius: 20, padding: 4 },
  photoContent: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#FFF0F7', borderRadius: 16 },
  photoIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  photoTitle: { fontSize: 15, fontWeight: '700', color: '#9D174D', marginBottom: 2 },
  photoDesc: { fontSize: 12, color: '#BE185D' },
  factCard: { marginHorizontal: 24, borderRadius: 24, padding: 24 },
  factHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  factLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  factText: { color: '#F8FAFC', fontSize: 15, lineHeight: 24, fontWeight: '500' },
});