import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, logoutRequest } from '@/lib/api';

type ParentRole =
  | 'admin'
  | 'mother'
  | 'father'
  | 'grandmother'
  | 'grandfather'
  | 'relative';

type MembershipUser = {
  id: number;
  email: string;
  full_name: string;
  phone?: string | null;
  role?: string | null;
};

type FamilyInfo = {
  id: number;
  name: string | null;
  created_by: number;
  created_at: string;
};

type FamilyMembership = {
  id: number;
  user: MembershipUser;
  family: number;
  role: ParentRole;
  can_edit_children: boolean;
  can_view_screenings: boolean;
  can_manage_family: boolean;
  joined_at: string;
};

type MyFamilyResponse = {
  family: FamilyInfo;
  my_membership: FamilyMembership;
  members: FamilyMembership[];
};

type ChildMeasurement = {
  id: number;
  height: string | null;
  weight: string | null;
  measured_at: string;
  note: string | null;
};

type Child = {
  id: number;
  family: number;
  first_name: string;
  birth_date: string;
  gender: 'male' | 'female';
  is_primary: boolean;
  created_at: string;
  age_months: number;
  latest_measurement?: ChildMeasurement | null;
};

const ROLE_DETAILS: Record<
  ParentRole,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  admin: { label: 'Админ', icon: 'shield-checkmark', color: '#F59E0B' },
  mother: { label: 'Мама', icon: 'woman', color: '#EC4899' },
  father: { label: 'Папа', icon: 'man', color: '#3B82F6' },
  grandmother: { label: 'Бабушка', icon: 'flower', color: '#8B5CF6' },
  grandfather: { label: 'Дедушка', icon: 'leaf', color: '#14B8A6' },
  relative: { label: 'Родственник', icon: 'people', color: '#10B981' },
};

const formatDate = (date: string) => {
  try {
    return new Date(date).toLocaleDateString('ru-RU');
  } catch {
    return date;
  }
};

const getInitial = (name?: string | null) =>
  name?.trim()?.charAt(0)?.toUpperCase() || 'U';

const normalizePhone = (text: string) => {
  let digits = text.replace(/\D/g, '');

  if (!digits.startsWith('7') && digits.length > 0) {
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    else digits = '7' + digits;
  }

  digits = digits.slice(0, 11);

  const local = digits.slice(1);
  let result = '+7';

  if (local.length > 0) result += ' ' + local.slice(0, 3);
  if (local.length > 3) result += ' ' + local.slice(3, 6);
  if (local.length > 6) result += ' ' + local.slice(6, 8);
  if (local.length > 8) result += ' ' + local.slice(8, 10);

  return result;
};

export default function ParentScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [familyData, setFamilyData] = useState<MyFamilyResponse | null>(null);
  const [children, setChildren] = useState<Child[]>([]);

  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [childModalVisible, setChildModalVisible] = useState(false);

  const [savingMember, setSavingMember] = useState(false);
  const [savingChild, setSavingChild] = useState(false);

  const [editingChild, setEditingChild] = useState<Child | null>(null);

  const [memberFullName, setMemberFullName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('+7 ');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState<ParentRole>('relative');
  const [memberCanEditChildren, setMemberCanEditChildren] = useState(false);
  const [memberCanViewScreenings, setMemberCanViewScreenings] = useState(true);
  const [memberCanManageFamily, setMemberCanManageFamily] = useState(false);

  const [childName, setChildName] = useState('');
  const [childBirthDate, setChildBirthDate] = useState('');
  const [childGender, setChildGender] = useState<'male' | 'female'>('male');
  const [childIsPrimary, setChildIsPrimary] = useState(false);
  const [childHeight, setChildHeight] = useState('');
  const [childWeight, setChildWeight] = useState('');

  const myMembership = familyData?.my_membership || null;
  const canManageFamily = !!myMembership?.can_manage_family;
  const canEditChildren = !!myMembership?.can_edit_children;

  const ownerMembership = useMemo(() => {
    if (!familyData?.members?.length) return null;
    return (
      familyData.members.find((m) => m.role === 'admin') ||
      familyData.members[0]
    );
  }, [familyData]);

  const nonAdminMembers = useMemo(() => {
    return (familyData?.members || []).filter((m) => m.role !== 'admin');
  }, [familyData]);

  const loadAll = useCallback(async () => {
    try {
      const [familyRes, childrenRes] = await Promise.all([
        api.get<MyFamilyResponse>('/api/families/my/'),
        api.get<Child[]>('/api/families/children/'),
      ]);

      setFamilyData(familyRes);
      setChildren(childrenRes || []);
    } catch (e: any) {
      console.error('PARENT LOAD ERROR:', e);
      Alert.alert('Ошибка', e?.detail || 'Не удалось загрузить данные семьи');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const resetMemberForm = () => {
    setMemberFullName('');
    setMemberEmail('');
    setMemberPhone('+7 ');
    setMemberPassword('');
    setMemberRole('relative');
    setMemberCanEditChildren(false);
    setMemberCanViewScreenings(true);
    setMemberCanManageFamily(false);
    setMemberModalVisible(false);
  };

  const resetChildForm = () => {
    setEditingChild(null);
    setChildName('');
    setChildBirthDate('');
    setChildGender('male');
    setChildIsPrimary(false);
    setChildHeight('');
    setChildWeight('');
    setChildModalVisible(false);
  };

  const openCreateChildModal = () => {
    setEditingChild(null);
    setChildName('');
    setChildBirthDate('');
    setChildGender('male');
    setChildIsPrimary(false);
    setChildHeight('');
    setChildWeight('');
    setChildModalVisible(true);
  };

  const openEditChildModal = (child: Child) => {
    setEditingChild(child);
    setChildName(child.first_name);
    setChildBirthDate(child.birth_date);
    setChildGender(child.gender);
    setChildIsPrimary(child.is_primary);
    setChildHeight(child.latest_measurement?.height || '');
    setChildWeight(child.latest_measurement?.weight || '');
    setChildModalVisible(true);
  };

  const handleAddFamilyMember = async () => {
    if (!memberFullName.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }
    if (!memberEmail.trim()) {
      Alert.alert('Ошибка', 'Введите email');
      return;
    }
    if (!memberPassword.trim()) {
      Alert.alert('Ошибка', 'Введите пароль');
      return;
    }

    try {
      setSavingMember(true);

      await api.post('/api/families/my/members/', {
        full_name: memberFullName.trim(),
        email: memberEmail.trim().toLowerCase(),
        phone: memberPhone.trim(),
        password: memberPassword,
        role: memberRole,
        can_edit_children: memberCanEditChildren,
        can_view_screenings: memberCanViewScreenings,
        can_manage_family: memberCanManageFamily,
      });

      resetMemberForm();
      await loadAll();
      Alert.alert('Готово', 'Член семьи добавлен');
    } catch (e: any) {
      console.error('ADD MEMBER ERROR:', e);
      Alert.alert('Ошибка', e?.detail || 'Не удалось добавить члена семьи');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = (member: FamilyMembership) => {
    Alert.alert(
      'Удалить члена семьи',
      `Удалить "${member.user.full_name}" из семьи?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/families/my/members/${member.id}/`);
              await loadAll();
            } catch (e: any) {
              console.error('DELETE MEMBER ERROR:', e);
              Alert.alert(
                'Ошибка',
                e?.detail || 'Не удалось удалить члена семьи'
              );
            }
          },
        },
      ]
    );
  };

  const handleSaveChild = async () => {
    if (!childName.trim()) {
      Alert.alert('Ошибка', 'Введите имя ребёнка');
      return;
    }

    if (!childBirthDate.trim()) {
      Alert.alert('Ошибка', 'Введите дату рождения в формате YYYY-MM-DD');
      return;
    }

    try {
      setSavingChild(true);

      if (editingChild) {
        await api.patch(`/api/families/children/${editingChild.id}/`, {
          first_name: childName.trim(),
          birth_date: childBirthDate.trim(),
          gender: childGender,
          is_primary: childIsPrimary,
        });
      } else {
        await api.post('/api/families/children/', {
          first_name: childName.trim(),
          birth_date: childBirthDate.trim(),
          gender: childGender,
          is_primary: childIsPrimary,
          initial_height: childHeight ? Number(childHeight) : undefined,
          initial_weight: childWeight ? Number(childWeight) : undefined,
        });
      }

      resetChildForm();
      await loadAll();
      Alert.alert(
        'Готово',
        editingChild ? 'Профиль ребёнка обновлён' : 'Ребёнок добавлен'
      );
    } catch (e: any) {
      console.error('SAVE CHILD ERROR:', e);
      Alert.alert(
        'Ошибка',
        e?.detail || 'Не удалось сохранить профиль ребёнка'
      );
    } finally {
      setSavingChild(false);
    }
  };

  const handleDeleteChild = (child: Child) => {
    Alert.alert(
      'Удалить профиль ребёнка',
      `Удалить профиль "${child.first_name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/families/children/${child.id}/`);
              await loadAll();
            } catch (e: any) {
              console.error('DELETE CHILD ERROR:', e);
              Alert.alert(
                'Ошибка',
                e?.detail || 'Не удалось удалить профиль ребёнка'
              );
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      router.replace('/login');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Семейный профиль</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitial(ownerMembership?.user?.full_name)}
            </Text>
          </View>

          <Text style={styles.ownerName}>
            {ownerMembership?.user?.full_name || 'Семья'}
          </Text>

          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {ROLE_DETAILS[ownerMembership?.role || 'admin'].label.toUpperCase()}
              </Text>
            </View>

            {canManageFamily && (
              <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.22)' }]}>
                <Text style={styles.badgeText}>УПРАВЛЕНИЕ СЕМЬЁЙ</Text>
              </View>
            )}
          </View>

          {!!familyData?.family?.name && (
            <Text style={styles.familyName}>{familyData.family.name}</Text>
          )}

          {!!myMembership && (
            <Text style={styles.sessionText}>
              Вы вошли как: {myMembership.user.full_name} •{' '}
              {ROLE_DETAILS[myMembership.role].label}
            </Text>
          )}
        </LinearGradient>

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>Члены семьи</Text>
            <Text style={styles.sectionSubTitle}>
              Доступ к семье и ролям
            </Text>
          </View>

          {canManageFamily && (
            <TouchableOpacity
              style={styles.plusBtn}
              onPress={() => setMemberModalVisible(true)}
            >
              <Ionicons name="person-add" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          {ownerMembership && (
            <View style={styles.itemRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: `${ROLE_DETAILS.admin.color}20` },
                ]}
              >
                <Ionicons
                  name={ROLE_DETAILS.admin.icon}
                  size={20}
                  color={ROLE_DETAILS.admin.color}
                />
              </View>

              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>{ownerMembership.user.full_name}</Text>
                <Text style={styles.itemSub}>
                  Администратор • {ownerMembership.user.email}
                </Text>
              </View>
            </View>
          )}

          {!!nonAdminMembers.length && <View style={styles.divider} />}

          {nonAdminMembers.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Дополнительные члены семьи не добавлены</Text>
            </View>
          ) : (
            nonAdminMembers.map((member, index) => (
              <View key={member.id}>
                <View style={styles.itemRow}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: `${ROLE_DETAILS[member.role].color}20` },
                    ]}
                  >
                    <Ionicons
                      name={ROLE_DETAILS[member.role].icon}
                      size={20}
                      color={ROLE_DETAILS[member.role].color}
                    />
                  </View>

                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemTitle}>{member.user.full_name}</Text>
                    <Text style={styles.itemSub}>
                      {ROLE_DETAILS[member.role].label} • {member.user.email}
                    </Text>
                    <Text style={styles.itemSubSmall}>
                      {member.can_edit_children ? 'Редактирует детей' : 'Без редактирования детей'} •{' '}
                      {member.can_view_screenings ? 'Видит скрининги' : 'Не видит скрининги'} •{' '}
                      {member.can_manage_family ? 'Управляет семьёй' : 'Без управления'}
                    </Text>
                  </View>

                  {canManageFamily && (
                    <TouchableOpacity
                      onPress={() => handleDeleteMember(member)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {index < nonAdminMembers.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>Профили детей</Text>
            <Text style={styles.sectionSubTitle}>
              Добавление, изменение и удаление
            </Text>
          </View>

          {canEditChildren && (
            <TouchableOpacity
              style={[styles.plusBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={openCreateChildModal}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          {children.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Профили детей пока не созданы</Text>
            </View>
          ) : (
            children.map((child, index) => (
              <View key={child.id}>
                <View style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.childPressWrap}
                    disabled={!canEditChildren}
                    onPress={() => openEditChildModal(child)}
                  >
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: child.is_primary ? '#8B5CF6' : '#EEF2FF' },
                      ]}
                    >
                      <Text
                        style={{
                          color: child.is_primary ? '#FFF' : '#6366F1',
                          fontWeight: '900',
                          fontSize: 16,
                        }}
                      >
                        {getInitial(child.first_name)}
                      </Text>
                    </View>

                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemTitle}>{child.first_name}</Text>
                      <Text style={styles.itemSub}>
                        {formatDate(child.birth_date)} • {child.gender === 'male' ? 'Мальчик' : 'Девочка'}
                        {child.is_primary ? ' • Основной профиль' : ''}
                      </Text>
                      <Text style={styles.itemSubSmall}>
                        Возраст: {child.age_months} мес.
                        {child.latest_measurement?.height
                          ? ` • Рост: ${child.latest_measurement.height}`
                          : ''}
                        {child.latest_measurement?.weight
                          ? ` • Вес: ${child.latest_measurement.weight}`
                          : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {canEditChildren && (
                    <TouchableOpacity
                      onPress={() => handleDeleteChild(child)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color="#CBD5E1"
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {index < children.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={memberModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeadRow}>
                <Text style={styles.modalTitle}>Добавить члена семьи</Text>
                <TouchableOpacity onPress={resetMemberForm}>
                  <Ionicons name="close-circle" size={28} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Роль</Text>
                <View style={styles.roleGrid}>
                  {(Object.keys(ROLE_DETAILS) as ParentRole[])
                    .filter((role) => role !== 'admin')
                    .map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleCard,
                          memberRole === role && styles.roleCardActive,
                        ]}
                        onPress={() => setMemberRole(role)}
                      >
                        <Ionicons
                          name={ROLE_DETAILS[role].icon}
                          size={18}
                          color={memberRole === role ? '#FFF' : ROLE_DETAILS[role].color}
                        />
                        <Text
                          style={[
                            styles.roleText,
                            memberRole === role && { color: '#FFF' },
                          ]}
                        >
                          {ROLE_DETAILS[role].label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Имя</Text>
                <TextInput
                  value={memberFullName}
                  onChangeText={setMemberFullName}
                  placeholder="Введите имя"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  placeholder="example@mail.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />

                <Text style={styles.label}>Телефон</Text>
                <TextInput
                  value={memberPhone}
                  onChangeText={(text) => setMemberPhone(normalizePhone(text))}
                  placeholder="+7 777 123 45 67"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  style={styles.input}
                />

                <Text style={styles.label}>Пароль</Text>
                <TextInput
                  value={memberPassword}
                  onChangeText={setMemberPassword}
                  placeholder="Минимум 6 символов"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  style={styles.input}
                />

                <Text style={styles.label}>Права</Text>

                <TouchableOpacity
                  style={styles.permissionRow}
                  onPress={() => setMemberCanEditChildren((v) => !v)}
                >
                  <Ionicons
                    name={memberCanEditChildren ? 'checkbox' : 'square-outline'}
                    size={22}
                    color="#6366F1"
                  />
                  <Text style={styles.permissionText}>Может редактировать детей</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.permissionRow}
                  onPress={() => setMemberCanViewScreenings((v) => !v)}
                >
                  <Ionicons
                    name={memberCanViewScreenings ? 'checkbox' : 'square-outline'}
                    size={22}
                    color="#6366F1"
                  />
                  <Text style={styles.permissionText}>Может смотреть скрининги</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.permissionRow}
                  onPress={() => setMemberCanManageFamily((v) => !v)}
                >
                  <Ionicons
                    name={memberCanManageFamily ? 'checkbox' : 'square-outline'}
                    size={22}
                    color="#6366F1"
                  />
                  <Text style={styles.permissionText}>Может управлять семьёй</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, savingMember && styles.saveBtnDisabled]}
                  disabled={savingMember}
                  onPress={handleAddFamilyMember}
                >
                  <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.saveGradient}>
                    {savingMember ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Добавить</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={childModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeadRow}>
                <Text style={styles.modalTitle}>
                  {editingChild ? 'Редактировать ребёнка' : 'Добавить ребёнка'}
                </Text>
                <TouchableOpacity onPress={resetChildForm}>
                  <Ionicons name="close-circle" size={28} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>Имя ребёнка</Text>
                <TextInput
                  value={childName}
                  onChangeText={setChildName}
                  placeholder="Введите имя"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <Text style={styles.label}>Дата рождения</Text>
                <TextInput
                  value={childBirthDate}
                  onChangeText={setChildBirthDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />

                <Text style={styles.label}>Пол</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[
                      styles.genderBtn,
                      childGender === 'male' && styles.genderBtnActiveBlue,
                    ]}
                    onPress={() => setChildGender('male')}
                  >
                    <Text
                      style={[
                        styles.genderBtnText,
                        childGender === 'male' && styles.genderBtnTextActive,
                      ]}
                    >
                      Мальчик
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderBtn,
                      childGender === 'female' && styles.genderBtnActivePink,
                    ]}
                    onPress={() => setChildGender('female')}
                  >
                    <Text
                      style={[
                        styles.genderBtnText,
                        childGender === 'female' && styles.genderBtnTextActive,
                      ]}
                    >
                      Девочка
                    </Text>
                  </TouchableOpacity>
                </View>

                {!editingChild && (
                  <>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Рост</Text>
                        <TextInput
                          value={childHeight}
                          onChangeText={setChildHeight}
                          placeholder="см"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>

                      <View style={{ width: 12 }} />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.label}>Вес</Text>
                        <TextInput
                          value={childWeight}
                          onChangeText={setChildWeight}
                          placeholder="кг"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          style={styles.input}
                        />
                      </View>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={styles.permissionRow}
                  onPress={() => setChildIsPrimary((v) => !v)}
                >
                  <Ionicons
                    name={childIsPrimary ? 'checkbox' : 'square-outline'}
                    size={22}
                    color="#8B5CF6"
                  />
                  <Text style={styles.permissionText}>Сделать основным профилем</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, savingChild && styles.saveBtnDisabled]}
                  disabled={savingChild}
                  onPress={handleSaveChild}
                >
                  <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.saveGradient}>
                    {savingChild ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {editingChild ? 'Сохранить изменения' : 'Добавить ребёнка'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '900',
  },
  ownerName: {
    marginTop: 14,
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  familyName: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '700',
  },
  sessionText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionRow: {
    marginTop: 26,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  sectionSubTitle: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  plusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingVertical: 6,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  childPressWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  itemSubSmall: {
    marginTop: 3,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
  },
  divider: {
    marginLeft: 74,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  emptyWrap: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 42,
    height: 5,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalHeadRow: {
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleCardActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  permissionText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 22,
    borderRadius: 18,
    overflow: 'hidden',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveGradient: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  genderBtnActiveBlue: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  genderBtnActivePink: {
    backgroundColor: '#EC4899',
    borderColor: '#EC4899',
  },
  genderBtnText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  genderBtnTextActive: {
    color: '#FFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});