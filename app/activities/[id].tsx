// app/activities/[id].tsx
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    CATEGORY_META,
    findActivityById
} from './data';

const ActivityDetailsScreen: React.FC = () => {
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const activity = useMemo(
    () => findActivityById(rawId ?? ''),
    [rawId]
  );

  const [difficultyMark, setDifficultyMark] = useState<
    'easy' | 'ok' | 'hard' | null
  >(null);

  if (!activity) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Активность не найдена</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.notFoundButton}
          >
            <Text style={styles.notFoundButtonText}>Назад</Text>
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
        {/* Верхний блок */}
        <LinearGradient
          colors={meta.gradient}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.8}
              style={styles.backButton}
            >
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            <View style={styles.heroMetaRight}>
              <Text style={styles.heroCategory}>{meta.label}</Text>
              <Text style={styles.heroTime}>
                ⏱ {activity.minutes} мин · {activity.difficulty}
              </Text>
            </View>
          </View>

          <View style={styles.heroTitleRow}>
            <Text style={styles.heroEmoji}>{meta.emoji}</Text>
            <Text style={styles.heroTitle}>{activity.title}</Text>
          </View>

          <Text style={styles.heroSubtitle}>{activity.subtitle}</Text>
        </LinearGradient>

        {/* Оценка сложности */}
        <View style={styles.segmentCard}>
          <Text style={styles.segmentTitle}>Как зашла активность?</Text>
          <View style={styles.segmentRow}>
            {[
              { key: 'easy' as const, label: 'Слишком легко' },
              { key: 'ok' as const, label: 'В самый раз' },
              { key: 'hard' as const, label: 'Пока сложно' },
            ].map((opt) => {
              const selected = difficultyMark === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() =>
                    setDifficultyMark(selected ? null : opt.key)
                  }
                  activeOpacity={0.85}
                  style={[
                    styles.segmentChip,
                    selected && styles.segmentChipActive,
                  ]}
                >
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

        {/* Цель */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Цель</Text>
          <Text style={styles.blockText}>{activity.objective}</Text>
        </View>

        {/* Материалы */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Что подготовить</Text>
          {activity.materials.map((item, index) => (
            <View key={index.toString()} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Ход занятия */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Ход занятия</Text>
          {activity.steps.map((step, index) => (
            <View key={index.toString()} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Навыки */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Что развивает</Text>
          <View style={styles.skillsRow}>
            {activity.skills.map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Связанное достижение */}
        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneTitle}>Связанное достижение</Text>
          <Text style={styles.milestoneText}>{activity.milestone}</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default ActivityDetailsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.2)',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  heroMetaRight: {
    alignItems: 'flex-end',
  },
  heroCategory: {
    color: '#EFF6FF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTime: {
    color: '#E0F2FE',
    fontSize: 11,
    marginTop: 2,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  heroEmoji: {
    fontSize: 30,
    marginRight: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },

  segmentCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmentChip: {
    flex: 1,
    marginRight: 6,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  segmentChipText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#475569',
    fontWeight: '600',
  },
  segmentChipTextActive: {
    color: '#FFFFFF',
  },

  block: {
    marginTop: 16,
    marginHorizontal: 20,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  blockText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
    marginTop: 6,
    marginRight: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2933',
    lineHeight: 18,
  },

  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  skillChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    marginRight: 6,
    marginTop: 6,
  },
  skillChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },

  milestoneCard: {
    marginTop: 18,
    marginHorizontal: 20,
    backgroundColor: '#DCFCE7',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 6,
  },
  milestoneText: {
    fontSize: 13,
    color: '#14532D',
    lineHeight: 18,
  },

  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0F172A',
  },
  notFoundButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0F172A',
  },
  notFoundButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
