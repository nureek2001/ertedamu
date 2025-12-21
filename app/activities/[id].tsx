import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av'; // Импорт плеера
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getChildProgress, markActivityAsCompleted } from '../../utils/storage';
import {
  CATEGORY_META,
  findActivityById
} from './data';

const ActivityDetailsScreen: React.FC = () => {
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const videoRef = useRef<Video>(null); // Реф для управления плеером
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  const activity = useMemo(
    () => findActivityById(rawId ?? ''),
    [rawId]
  );

  const [difficultyMark, setDifficultyMark] = useState<'easy' | 'ok' | 'hard' | null>(null);
  const [targetChildId, setTargetChildId] = useState<string>('main');

  useEffect(() => {
    if (!activity) return;
    const loadInitialState = async () => {
      try {
        const activeIdxStr = await AsyncStorage.getItem('activeChildIndex');
        const extraStr = await AsyncStorage.getItem('extraChildren');
        let resolvedId = 'main';
        if (activeIdxStr && activeIdxStr !== '0') {
             const idx = parseInt(activeIdxStr);
             if (extraStr) {
                 const extras = JSON.parse(extraStr);
                 if (extras[idx - 1]) resolvedId = extras[idx - 1].id;
             }
        }
        setTargetChildId(resolvedId);
        const progress = await getChildProgress(resolvedId);
        const existingEntry = progress.find(p => p.activityId === activity.id);
        if (existingEntry) {
          setDifficultyMark(existingEntry.difficulty);
        }
      } catch (e) {
        console.warn('Error loading activity state:', e);
      }
    };
    loadInitialState();
  }, [activity]);

  const handleComplete = async (difficulty: 'easy' | 'ok' | 'hard') => {
    if (!activity) return;
    setDifficultyMark(difficulty);
    try {
        await markActivityAsCompleted(targetChildId, activity.id, difficulty);
        setTimeout(() => { router.back(); }, 300);
    } catch (e) { console.warn(e); }
  };

  if (!activity) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#CBD5E1" />
          <Text style={styles.notFoundTitle}>Активность не найдена</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.notFoundButton}>
            <Text style={styles.notFoundButtonText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const meta = CATEGORY_META[activity.category];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* === ВЕРХНИЙ БЛОК (HERO) === */}
        <LinearGradient
          colors={meta.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.heroMetaRight}>
              <View style={styles.categoryBadge}>
                 <Text style={styles.heroCategory}>{meta.label}</Text>
              </View>
              <Text style={styles.heroTime}>
                ⏱ {activity.minutes} мин · {activity.difficulty}
              </Text>
            </View>
          </View>

          <View style={styles.heroTitleRow}>
            <View style={styles.emojiContainer}>
                <Text style={styles.heroEmoji}>{meta.emoji}</Text>
            </View>
            <Text style={styles.heroTitle}>{activity.title}</Text>
          </View>

          <Text style={styles.heroSubtitle}>{activity.subtitle}</Text>
        </LinearGradient>

        {/* === ВИДЕО ПЛЕЕР === */}
        <View style={styles.videoCard}>
          {isVideoLoading && (
            <View style={styles.videoLoader}>
              <ActivityIndicator size="large" color={meta.gradient[0]} />
            </View>
          )}
          <Video
            ref={videoRef}
            style={styles.video}
            // Здесь используйте activity.videoUrl, когда добавите его в базу данных
            source={{ uri: activity.videoUrl || '' }}

            useNativeControls
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
            onLoad={() => setIsVideoLoading(false)}
            onError={(error) => console.log('Ошибка видео:', error)}
          />
        </View>

        {/* Оценка сложности */}
        <View style={styles.segmentCard}>
          <Text style={styles.segmentTitle}>
             {difficultyMark ? 'Задание выполнено!' : 'Как прошло занятие?'}
          </Text>
          <View style={styles.segmentRow}>
            {[
              { key: 'easy' as const, label: 'Легко', emoji: '😎' },
              { key: 'ok' as const, label: 'Норм', emoji: '👍' },
              { key: 'hard' as const, label: 'Сложно', emoji: '🤯' },
            ].map((opt) => {
              const selected = difficultyMark === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => handleComplete(opt.key)}
                  activeOpacity={0.85}
                  style={[
                    styles.segmentChip,
                    selected && styles.segmentChipActive,
                  ]}
                >
                  <Text style={[styles.segmentEmoji, selected && {opacity: 1}]}>{opt.emoji}</Text>
                  <Text
                    style={[
                      styles.segmentChipText,
                      selected && styles.segmentChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Остальные блоки контента (Цель, Материалы, Ход занятия...) */}
        {/* ... (ваш оригинальный код блоков) ... */}
        
        <View style={styles.block}>
          <View style={styles.blockHeaderRow}>
            <Ionicons name="flag-outline" size={20} color={meta.gradient[0]} />
            <Text style={styles.blockTitle}>Цель</Text>
          </View>
          <Text style={styles.blockText}>{activity.objective}</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.blockHeaderRow}>
             <Ionicons name="footsteps-outline" size={20} color={meta.gradient[0]} />
             <Text style={styles.blockTitle}>Ход занятия</Text>
          </View>
          <View style={styles.stepsContainer}>
            {activity.steps.map((step, index) => (
                <View key={index.toString()} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                    <Text style={[styles.stepBadgeText, { color: meta.gradient[1] }]}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
                </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ОБНОВЛЕННЫЕ СТИЛИ
const styles = StyleSheet.create({
  // ... (ваши оригинальные стили) ...
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 24 },
  hero: { paddingTop: 12, paddingHorizontal: 24, paddingBottom: 48, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  heroMetaRight: { alignItems: 'flex-end' },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  heroCategory: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  heroTime: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  heroTitleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  emojiContainer: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  heroEmoji: { fontSize: 28 },
  heroTitle: { flex: 1, fontSize: 24, fontWeight: '900', color: '#FFFFFF', lineHeight: 30, paddingTop: 4 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 22, marginTop: 4 },

  // НОВЫЕ СТИЛИ ДЛЯ ВИДЕО
  videoCard: {
    marginTop: -28, // Наплыв на Hero блок
    marginHorizontal: 20,
    height: 220,
    backgroundColor: '#000',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  video: {
    flex: 1,
  },
  videoLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  segmentCard: { marginTop: 24, marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, shadowColor: '#64748B', shadowOpacity: 0.1, shadowRadius: 24, elevation: 8, marginBottom: 24 },
  segmentTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentChip: { flex: 1, borderRadius: 12, paddingVertical: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  segmentChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  segmentEmoji: { fontSize: 18, marginBottom: 4, opacity: 0.5 },
  segmentChipText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  segmentChipTextActive: { color: '#FFFFFF' },
  block: { marginTop: 24, paddingHorizontal: 24 },
  blockHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  blockTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  blockText: { fontSize: 15, color: '#334155', lineHeight: 24 },
  stepsContainer: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: -2 },
  stepBadgeText: { fontSize: 14, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 15, color: '#1E293B', lineHeight: 24 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  notFoundTitle: { fontSize: 18, fontWeight: '700', marginVertical: 16, color: '#0F172A' },
  notFoundButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  notFoundButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default ActivityDetailsScreen;