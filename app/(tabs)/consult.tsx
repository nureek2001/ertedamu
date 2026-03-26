import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, logoutRequest } from '@/lib/api';
import AppHeader, { ChildChip } from '../../components/common/AppHeader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const formatAgeLabel = (months: number): string => {
  if (months <= 0) return 'Малыш';
  if (months < 12) return `${months} мес.`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} лет`;
  return `${years} г. ${remainingMonths} мес.`;
};

const getAgeGroupFromMonths = (m: number): any => {
  if (m < 12) return 'baby';
  if (m < 36) return 'toddler';
  return 'preschooler';
};

// --- ДАННЫЕ КАТЕГОРИЙ ---
const CATEGORIES = [
  { id: 'all', title: 'Все', icon: 'apps-outline', color: '#64748B' },
  { id: 'pediatric', title: 'Педиатрия', icon: 'medical-outline', color: '#3B82F6' },
  { id: 'neuro', title: 'Невролог', icon: 'brain-outline', color: '#6366F1' },
  { id: 'speech', title: 'Логопед', icon: 'chatbubbles-outline', color: '#F59E0B' },
  { id: 'psych', title: 'Психолог', icon: 'heart-outline', color: '#10B981' },
  { id: 'ortho', title: 'Ортопед', icon: 'body-outline', color: '#EC4899' },
];

// --- BACKEND TYPES ---
type Child = {
  id: number;
  family: number;
  first_name: string;
  birth_date: string;
  gender: 'male' | 'female';
  is_primary: boolean;
  created_at: string;
  age_months: number;
  latest_measurement: {
    id: number;
    height: string | null;
    weight: string | null;
    measured_at: string;
    note: string | null;
  } | null;
};

type ActiveChildResponse = {
  id: number;
  user: number;
  family: number;
  active_child: Child | null;
  updated_at: string;
};

type Doctor = {
  id: number;
  name: string;
  specialty: string;
  category: string;
  rating: string | number;
  image: string;
  color: string;
  min_age: number;
  max_age: number;
  online: boolean;
};

type ConsultArticle = {
  id: number;
  title: string;
  icon: string;
  color: string;
  content: string;
};

type UpcomingAppointment = {
  id: number;
  doctor: Doctor;
  appointment_date: string;
  appointment_time: string;
  consult_type: string;
  note: string | null;
};

const ConsultScreen = () => {
  const [childrenList, setChildrenList] = useState<ChildChip[]>([]);
  const [activeChildIndex, setActiveChildIndex] = useState(0);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<UpcomingAppointment[]>([]);
  const [articles, setArticles] = useState<ConsultArticle[]>([]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      router.replace('/login');
    }
  };

  const applyFilters = (allDoctors: Doctor[], age: number, catId: string) => {
    let result = allDoctors.filter(d => age >= d.min_age && age <= d.max_age);
    if (catId !== 'all') {
      result = result.filter(doc => doc.category === catId);
    }
    setFilteredDoctors(result);
  };

  const handleCategoryPress = async (id: string) => {
    setSelectedCatId(id);

    const activeChild = childrenList[activeChildIndex];
    if (!activeChild) return;

    try {
      const doctors = await api.get<Doctor[]>(
        `/api/consults/doctors/?child_id=${activeChild.id}&category=${id}`
      );
      setFilteredDoctors(doctors || []);
    } catch (e: any) {
      console.error(e);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [childrenRes, activeRes, articlesRes] = await Promise.all([
        api.get<Child[]>('/api/families/children/'),
        api.get<ActiveChildResponse>('/api/families/active-child/'),
        api.get<ConsultArticle[]>('/api/consults/articles/'),
      ]);

      setArticles(articlesRes || []);

      if (!childrenRes || childrenRes.length === 0) {
        setChildrenList([]);
        setFilteredDoctors([]);
        setAppointments([]);
        return;
      }

      const list: ChildChip[] = childrenRes.map((child) => ({
        id: String(child.id),
        name: child.first_name,
        tag: formatAgeLabel(child.age_months || 1),
        // @ts-ignore
        ageGroup: getAgeGroupFromMonths(child.age_months || 1),
        color: child.is_primary ? '#3B82F6' : '#10B981',
        // @ts-ignore
        ageMonths: child.age_months || 1,
      }));

      setChildrenList(list);

      const activeBackendId = activeRes?.active_child?.id
        ? String(activeRes.active_child.id)
        : String(childrenRes[0].id);

      const foundIndex = list.findIndex((c) => c.id === activeBackendId);
      const resolvedIndex = foundIndex >= 0 ? foundIndex : 0;
      setActiveChildIndex(resolvedIndex);

      const activeChild = list[resolvedIndex] || list[0];
      const age = activeChild.ageMonths || 0;

      const [doctorsRes, appointmentsRes] = await Promise.all([
        api.get<Doctor[]>(`/api/consults/doctors/?child_id=${activeChild.id}&category=${selectedCatId}`),
        api.get<UpcomingAppointment[]>(`/api/consults/appointments/upcoming/?child_id=${activeChild.id}`),
      ]);

      setAppointments(appointmentsRes || []);
      applyFilters(doctorsRes || [], age, selectedCatId);
    } catch (e: any) {
      console.error(e);

      if (e?.detail === 'Учетные данные не были предоставлены.') {
        router.replace('/login');
        return;
      }

      if (e?.detail === 'Семья не найдена.') {
        setChildrenList([]);
        setFilteredDoctors([]);
        setAppointments([]);
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCatId]);

  const handleChildChange = async (index: number) => {
    const child = childrenList[index];
    if (!child) return;

    try {
      setActiveChildIndex(index);

      await api.post('/api/families/active-child/set/', {
        child_id: Number(child.id),
      });

      await loadData();
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleEmergency = async () => {
    try {
      const res = await api.post('/api/consults/emergency/', {});
      Alert.alert('Срочный вызов', res?.message || 'Соединяем с дежурным педиатром...');
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось отправить срочный вызов');
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader childrenList={childrenList} activeChildIndex={activeChildIndex} onChangeChild={handleChildChange} onLogout={handleLogout} />

      {loading ? (
        <View style={styles.loaderBox}><ActivityIndicator size="large" color="#6366F1" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ближайшие записи</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.appointmentScroll}>
              {appointments.length > 0 ? (
                appointments.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.appointmentCard}>
                    <View style={styles.appDate}>
                      <Text style={styles.appMonth}>
                        {new Date(item.appointment_date).toLocaleDateString('ru-RU', { month: 'short' }).toUpperCase()}
                      </Text>
                      <Text style={styles.appDay}>
                        {new Date(item.appointment_date).getDate()}
                      </Text>
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appTime}>
                        {item.appointment_time.slice(0, 5)} — {item.consult_type === 'video' ? 'Видеочат' : item.consult_type === 'chat' ? 'Чат' : 'Офлайн'}
                      </Text>
                      <Text style={styles.appDoc}>{item.doctor.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity style={styles.appointmentEmpty}>
                  <Ionicons name="add" size={24} color="#6366F1" />
                  <Text style={styles.appAddText}>Новая запись</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Направления</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.catCard}
                    onPress={() => handleCategoryPress(cat.id)}
                  >
                    <View style={[styles.catIconBox, { backgroundColor: isSelected ? cat.color : cat.color + '15' }]}>
                      <Ionicons name={cat.icon as any} size={26} color={isSelected ? '#FFF' : cat.color} />
                    </View>
                    <Text style={[styles.catText, isSelected && { color: cat.color, fontWeight: '900' }]}>{cat.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <TouchableOpacity style={styles.urgentCard} activeOpacity={0.9} onPress={handleEmergency}>
            <LinearGradient colors={['#FF4D4D', '#F43F5E']} style={styles.urgentGradient}>
              <View style={{ flex: 1 }}>
                <Text style={styles.urgentTitle}>Срочный вопрос?</Text>
                <Text style={styles.urgentSub}>Дежурный педиатр ответит в течение 10-15 минут</Text>
              </View>
              <View style={styles.urgentIconCircle}>
                <Ionicons name="flash" size={24} color="#F43F5E" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Рекомендуемые врачи</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{filteredDoctors.length}</Text></View>
            </View>

            {filteredDoctors.length > 0 ? (
              filteredDoctors.map(doc => (
                <TouchableOpacity key={doc.id} style={styles.doctorCard}>
                  <View>
                    <Image source={{ uri: doc.image }} style={styles.docImg} />
                    {doc.online && <View style={styles.onlineBadge} />}
                  </View>
                  <View style={styles.docMain}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docSpec}>{doc.specialty}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingLabel}>{doc.rating}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.chatAction, { backgroundColor: doc.color }]}>
                    <Ionicons name="chatbubble-ellipses" size={22} color="#FFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={50} color="#CBD5E1" />
                <Text style={styles.emptyText}>В данной категории врачи не найдены для этого возраста</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Советы и статьи</Text>
            {articles.map(art => (
              <TouchableOpacity key={art.id} style={styles.articleItem}>
                <View style={[styles.artIcon, { backgroundColor: art.color + '10' }]}>
                  <Ionicons name={art.icon as any} size={20} color={art.color} />
                </View>
                <Text style={styles.artTitle}>{art.title}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.howItWorks}>
            <Text style={styles.howTitle}>Помощь для {childrenList[activeChildIndex]?.name}</Text>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
              <Text style={styles.stepText}>Выберите врача из списка или категорию</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
              <Text style={styles.stepText}>Опишите проблему и симптомы в чате</Text>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 40 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', paddingHorizontal: 24, marginBottom: 12 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: -10, marginBottom: 12 },
  badgeText: { color: '#6366F1', fontSize: 12, fontWeight: '700' },

  appointmentScroll: { paddingLeft: 24, paddingRight: 10 },
  appointmentCard: { width: SCREEN_WIDTH * 0.7, backgroundColor: '#6366F1', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', marginRight: 15 },
  appDate: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 50 },
  appMonth: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  appDay: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  appInfo: { marginLeft: 15 },
  appTime: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  appDoc: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
  appointmentEmpty: { width: 120, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 24, paddingVertical: 20 },
  appAddText: { color: '#6366F1', fontSize: 12, fontWeight: '700', marginTop: 5 },

  catScroll: { paddingLeft: 24, paddingRight: 10 },
  catCard: { alignItems: 'center', marginRight: 20 },
  catIconBox: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  urgentCard: { paddingHorizontal: 24, marginTop: 25 },
  urgentGradient: { padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
  urgentTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  urgentSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  urgentIconCircle: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  doctorCard: { backgroundColor: '#FFF', marginHorizontal: 24, padding: 15, borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  docImg: { width: 70, height: 70, borderRadius: 20 },
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFF' },
  docMain: { flex: 1, marginLeft: 15 },
  docName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  docSpec: { fontSize: 13, color: '#64748B', marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingLabel: { fontSize: 12, fontWeight: '800', color: '#1E293B', marginLeft: 4 },
  chatAction: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  articleItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, padding: 12, borderRadius: 16, marginBottom: 10 },
  artIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  artTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },

  howItWorks: { margin: 24, padding: 24, backgroundColor: '#F1F5F9', borderRadius: 28 },
  howTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 15 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stepNumText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  stepText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 10 }
});

export default ConsultScreen;