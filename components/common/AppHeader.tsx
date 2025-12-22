import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AgeGroup } from '../../app/activities/data';

export type ChildChip = {
  id: string;
  name: string;
  tag: string;
  ageGroup: AgeGroup;
  ageMonths?: number;
  color?: string;
};

export const getAgeGroupStyle = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'baby': return { color: '#00F2FE', label: 'INFANT' };
    case 'toddler': return { color: '#00FFD1', label: 'TODDLER' };
    case 'preschool': return { color: '#A5FECB', label: 'PRESCHOOL' };
    case 'school': return { color: '#FFD700', label: 'SCHOLAR' };
    default: return { color: '#FFFFFF', label: 'CHILD' };
  }
};

type AppHeaderProps = {
  childrenList: ChildChip[];
  activeChildIndex: number;
  onChangeChild: (index: number) => void;
  onLogout?: () => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({ childrenList, activeChildIndex, onChangeChild, onLogout }) => {
  const activeChild = childrenList[activeChildIndex];
  const groupStyle = getAgeGroupStyle(activeChild?.ageGroup || 'unknown');
  const [pName, setPName] = useState('РОДИТЕЛЬ');

  // Умное получение имени пользователя (админ или родственник)
  useFocusEffect(
    useCallback(() => {
      const getName = async () => {
        try {
          const role = await AsyncStorage.getItem('activeUserRole');
          const adminName = await AsyncStorage.getItem('parentName');
          const sessionName = await AsyncStorage.getItem('currentSessionName');

          // Если залогинен админ — приоритет parentName
          // Если родственник — приоритет currentSessionName
          if (role === 'admin' && adminName) {
            setPName(adminName.toUpperCase());
          } else if (sessionName) {
            setPName(sessionName.toUpperCase());
          } else if (adminName) {
            setPName(adminName.toUpperCase());
          }
        } catch (e) {
          console.error('Error fetching header name', e);
        }
      };
      getName();
    }, [])
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.backgroundGradient}
      />
      
      <View style={styles.content}>
        {/* Компактная верхняя панель */}
        <View style={styles.topBar}>
          <View style={styles.brandGroup}>
            <View style={styles.logoBox}><Text style={styles.logoText}>ED</Text></View>
            <View>
              <Text style={styles.activeChildName}>
                {activeChild?.name?.toUpperCase() || 'РЕБЕНОК'} 
                <Text style={[styles.activeChildTag, { color: '#57d8ffff' }]}>
                  {activeChild ? ` • ${activeChild.tag.toUpperCase()}` : ''}
                </Text>
              </Text>
              <Text style={styles.brandSubtitle}>ERTE DAMU ASSISTANT</Text>
            </View>
          </View>

          <View style={styles.rightButtons}>
            {/* ВЫДЕЛЕННАЯ КНОПКА ДЛЯ РОДИТЕЛЕЙ */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/parent' as any)} 
              style={styles.parentBadgeBtn}
            >
              <LinearGradient
                colors={['#FFD700', '#F59E0B']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.parentBtnGradient}
              >
                <Ionicons name="person" size={11} color="#000" />
                <Text style={styles.parentBtnText} numberOfLines={1}>
                  {pName}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {onLogout && (
              <TouchableOpacity onPress={onLogout} style={styles.logoutBtnSmall}>
                <Ionicons name="log-out-outline" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Горизонтальный выбор детей */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {childrenList.map((child, index) => {
            const isActive = index === activeChildIndex;
            return (
              <TouchableOpacity
                key={child.id}
                onPress={() => onChangeChild(index)}
                style={[styles.miniTab, isActive && styles.miniTabActive]}
              >
                <View style={[styles.letterCircle, isActive && styles.letterCircleActive]}>
                  <Text style={[styles.letter, { color: isActive ? '#6366F1' : '#FFF' }]}>
                    {child.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.tabName, { color: isActive ? '#6366F1' : '#FFF' }]}>
                  {child.name.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 50, // Увеличил отступ сверху для SafeArea
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  backgroundGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  content: { zIndex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
  },
  logoText: { fontSize: 12, fontWeight: '900', color: '#6366F1' },
  activeChildName: { fontSize: 15, fontWeight: '900', color: '#FFF', letterSpacing: 0.3 },
  activeChildTag: { fontSize: 10, fontWeight: '800' },
  brandSubtitle: { fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: '700', marginTop: -2 },
  scrollContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  miniTab: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingRight: 10, paddingLeft: 4, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  miniTabActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  letterCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  letterCircleActive: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  letter: { fontSize: 11, fontWeight: '900' },
  tabName: { fontSize: 10, fontWeight: '800', marginLeft: 6 },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  parentBadgeBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  parentBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    maxWidth: 120, // Ограничение ширины для длинных имен
  },
  parentBtnText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoutBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppHeader;