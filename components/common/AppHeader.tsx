// components/common/AppHeader.tsx
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/** Общий тип возраста, можно использовать в других файлах */
export type AgeGroup = 'baby' | 'toddler' | 'preschool' | 'unknown';

/** Тип ребёнка для header */
export type ChildChip = {
  id: string;
  name: string;
  tag: string;
  ageGroup?: AgeGroup;
  color?: string;
  emoji?: string;
};

/** Вспомогательная функция – если нужно посчитать стиль по возрасту */
export const getAgeGroupStyle = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'baby':
      return { color: '#3B82F6', emoji: '👶' as const };
    case 'toddler':
      return { color: '#10B981', emoji: '🧒' as const };
    case 'preschool':
      return { color: '#8B5CF6', emoji: '👦' as const };
    default:
      return { color: '#6B7280', emoji: '👤' as const };
  }
};

type AppHeaderProps = {
  childrenList: ChildChip[];
  activeChildIndex: number;
  onChangeChild: (index: number) => void;
  onLogout?: () => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  childrenList,
  activeChildIndex,
  onChangeChild,
  onLogout,
}) => {
  return (
    <View style={styles.container}>
      {/* Градиентный фон */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />
      
      {/* Блюр эффект */}
      <BlurView intensity={80} tint="light" style={styles.blurView} />
      
      <View style={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>ED</Text>
            </View>
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoMain}>Erte</Text>
              <Text style={styles.logoAccent}>Damu</Text>
            </View>
          </View>

          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              activeOpacity={0.7}
              style={styles.logoutButton}
            >
              <View style={styles.logoutIcon}>
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.logoutText}>Выйти</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.childrenSection}>
          <Text style={styles.sectionTitle}>Выберите профиль</Text>
          
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.childrenScrollContent}
          >
            {childrenList.map((child, index) => {
              const isActive = index === activeChildIndex;

              // если цвет/эмодзи не передали – считаем из возраста
              const { color, emoji } = child.color && child.emoji
                ? { color: child.color, emoji: child.emoji }
                : getAgeGroupStyle(child.ageGroup ?? 'unknown');

              return (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => onChangeChild(index)}
                  activeOpacity={0.9}
                  style={[
                    styles.childCardWrapper,
                    isActive && styles.childCardWrapperActive
                  ]}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={['#FFFFFF', '#F8FAFC']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.childCardActive}
                    >
                      <View style={styles.childCardContent}>
                        <View style={[
                          styles.childIconContainer,
                          { backgroundColor: color + '20' }
                        ]}>
                          <Text style={styles.childIcon}>{emoji}</Text>
                        </View>
                        
                        <View style={styles.childTextContainer}>
                          <Text style={[
                            styles.childName,
                            { color }
                          ]}>
                            {child.name}
                          </Text>
                          <Text style={styles.childTag}>
                            {child.tag}
                          </Text>
                        </View>
                        
                        <View style={[
                          styles.activeIndicator,
                          { backgroundColor: color }
                        ]} />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.childCardInactive}>
                      <View style={[
                        styles.childIconContainer,
                        { backgroundColor: 'rgba(255,255,255,0.15)' }
                      ]}>
                        <Text style={[
                          styles.childIcon,
                          { color: '#FFFFFF' }
                        ]}>
                          {emoji}
                        </Text>
                      </View>
                      
                      <View style={styles.childTextContainer}>
                        <Text style={styles.childNameInactive}>
                          {child.name}
                        </Text>
                        <Text style={styles.childTagInactive}>
                          {child.tag}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    position: 'relative',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  logoMain: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoAccent: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoutIcon: {
    opacity: 0.9,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 1,
  },
  childrenSection: {
    paddingHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  childrenScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  childCardWrapper: {
    marginRight: 10,
  },
  childCardWrapperActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  childCardActive: {
    borderRadius: 20,
    padding: 2,
    minWidth: 150,
  },
  childCardInactive: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
  },
  childCardContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  childIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childIcon: {
    fontSize: 24,
  },
  childTextContainer: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  childNameInactive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  childTag: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  childTagInactive: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
});