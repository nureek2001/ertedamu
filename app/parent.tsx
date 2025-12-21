import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ParentRole = 'mother' | 'father' | 'grandma' | 'grandpa' | 'relative' | 'other';

const ROLE_DETAILS: Record<ParentRole, { label: string, icon: any }> = {
    mother: { label: 'Мама', icon: 'woman' },
    father: { label: 'Папа', icon: 'man' },
    grandma: { label: 'Бабушка', icon: 'person' },
    grandpa: { label: 'Дедушка', icon: 'person' },
    relative: { label: 'Родственник', icon: 'people' },
    other: { label: 'Другое', icon: 'help-circle' }
};

export default function ParentProfileScreen() {
    const [data, setData] = useState<any>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false); // Состояние для проверки прав

    const [isModalVisible, setModalVisible] = useState(false);
    const [isFamilyModalVisible, setFamilyModalVisible] = useState(false);

    const [fRole, setFRole] = useState<ParentRole | null>(null);
    const [fName, setFName] = useState('');
    const [fPhone, setFPhone] = useState('+7 ');
    const [fPassword, setFPassword] = useState('');

    const fetchData = async () => {
        try {
            const keys = [
                'parentName', 'parentRole', 'parentPhone', 
                'currentSessionName', 'currentSessionRole', 'activeUserRole',
                'childName', 'childBirthDay', 'childBirthMonth', 'childBirthYear',
                'extraChildren', 'familyMembers'
            ];
            const result = await AsyncStorage.multiGet(keys);
            const mappedData = Object.fromEntries(result);

            const adminStatus = mappedData.activeUserRole === 'admin';
            setIsAdmin(adminStatus);
            
            const displayName = adminStatus ? mappedData.parentName : mappedData.currentSessionName;
            const displayRole = adminStatus ? mappedData.parentRole : mappedData.currentSessionRole;

            setData({
                ...mappedData,
                displayName,
                displayRole
            });

            const kids = [];
            if (mappedData.childName) kids.push({ name: mappedData.childName, birthday: `${mappedData.childBirthDay}.${mappedData.childBirthMonth}.${mappedData.childBirthYear}`, isMain: true });
            if (mappedData.extraChildren) {
                const extra = JSON.parse(mappedData.extraChildren);
                extra.forEach((c: any) => kids.push({ ...c, birthday: `${c.birthDay}.${c.birthMonth}.${c.birthYear}`, isMain: false }));
            }
            setChildren(kids);
            if (mappedData.familyMembers) setFamilyMembers(JSON.parse(mappedData.familyMembers));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handlePhoneInput = (text: string) => {
        let digits = text.replace(/\D/g, '');
        if (digits.startsWith('7')) digits = digits.substring(1);
        digits = digits.substring(0, 10);
        let formatted = '+7 ';
        if (digits.length > 0) formatted += digits.substring(0, 3);
        if (digits.length > 3) formatted += ' ' + digits.substring(3, 6);
        if (digits.length > 6) formatted += ' ' + digits.substring(6, 8);
        if (digits.length > 8) formatted += ' ' + digits.substring(8, 10);
        setFPhone(formatted);
    };

    const handleDeleteFamilyMember = (id: string, name: string) => {
        if (!isAdmin) return; // Дополнительная защита на уровне функции

        Alert.alert(
            "Удаление доступа",
            `Вы уверены, что хотите закрыть доступ для ${name}?`,
            [
                { text: "Отмена", style: "cancel" },
                { 
                    text: "Удалить", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            const updatedFamily = familyMembers.filter(m => m.id !== id);
                            await AsyncStorage.setItem('familyMembers', JSON.stringify(updatedFamily));
                            setFamilyMembers(updatedFamily);
                        } catch (e) { console.error(e); }
                    } 
                }
            ]
        );
    };

    const handleAddFamilyMember = async () => {
        if (!isAdmin) return;
        if (!fRole || fName.length < 2 || fPhone.length < 16 || fPassword.length < 4) {
            Alert.alert("Ошибка", "Пожалуйста, заполните все поля корректно");
            return;
        }
        try {
            const currentFamilyRaw = await AsyncStorage.getItem('familyMembers');
            const currentFamily = currentFamilyRaw ? JSON.parse(currentFamilyRaw) : [];
            const newMember = { id: Date.now().toString(), role: fRole, name: fName, phone: fPhone, password: fPassword };
            await AsyncStorage.setItem('familyMembers', JSON.stringify([...currentFamily, newMember]));
            setFamilyModalVisible(false);
            setFRole(null); setFName(''); setFPhone('+7 '); setFPassword('');
            fetchData();
            Alert.alert("Успешно","Родственник добавлен!");
        } catch (e) { console.error(e); }
    };

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366F1" /></View>;

    const availableRoles = (Object.keys(ROLE_DETAILS) as ParentRole[]).filter(role => role !== data?.parentRole);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Настройки профиля</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.profileCardWrapper}>
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.mainCard}>
                        <View style={styles.parentAvatarContainer}>
                            <Text style={styles.parentAvatarLetter}>{data?.displayName?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                        <Text style={styles.parentNameText}>{data?.displayName || 'Пользователь'}</Text>
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>{ROLE_DETAILS[data?.displayRole as ParentRole]?.label.toUpperCase() || 'АККАУНТ'}</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Section: Family */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeader}>Доступ для семьи</Text>
                    {/* КНОПКА ДОБАВЛЕНИЯ: ТОЛЬКО ДЛЯ АДМИНА */}
                    {isAdmin && (
                        <TouchableOpacity style={styles.addBtnCircle} onPress={() => setFamilyModalVisible(true)}>
                            <Ionicons name="person-add" size={18} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.cardContainerWhite}>
                    {familyMembers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Добавьте супруга или родственников, чтобы они тоже видели прогресс детей</Text>
                        </View>
                    ) : (
                        familyMembers.map((member, index) => (
                            <View key={member.id}>
                                <View style={styles.listItem}>
                                    <View style={[styles.iconCircle, { backgroundColor: '#F1F5F9' }]}>
                                        <Ionicons name={ROLE_DETAILS[member.role as ParentRole]?.icon} size={20} color="#6366F1" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.itemTitle}>{member.name}</Text>
                                        <Text style={styles.itemSub}>{ROLE_DETAILS[member.role as ParentRole]?.label} • {member.phone}</Text>
                                    </View>
                                    
                                    {/* КНОПКА УДАЛЕНИЯ: ТОЛЬКО ДЛЯ АДМИНА */}
                                    {isAdmin && (
                                        <TouchableOpacity 
                                            onPress={() => handleDeleteFamilyMember(member.id, member.name)}
                                            style={styles.deleteActionBtn}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {index < familyMembers.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))
                    )}
                </View>

                {/* Children Profiles */}
                <Text style={styles.sectionHeader}>Профили детей</Text>
                <View style={styles.cardContainerWhite}>
                    {children.map((child, index) => (
                        <View key={index}>
                            <View style={styles.listItem}>
                                <View style={[styles.iconCircle, { backgroundColor: child.isMain ? '#8B5CF6' : '#F1F5F9' }]}>
                                    <Text style={{ color: child.isMain ? '#FFF' : '#64748B', fontWeight: '800' }}>{child.name.charAt(0)}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.itemTitle}>{child.name}</Text>
                                    <Text style={styles.itemSub}>{child.birthday} {child.isMain && '• Основной'}</Text>
                                </View>
                            </View>
                            {index < children.length - 1 && <View style={styles.divider} />}
                        </View>
                    ))}
                </View>
                
                <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                    <Text style={styles.logoutText}>Выйти из системы</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>ErteDamu v1.0.4</Text>
            </ScrollView>

            <Modal visible={isFamilyModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContentEnhanced}>
                            <View style={styles.modalIndicator} />
                            <View style={styles.modalHeaderRow}>
                                <Text style={styles.modalTitleLarge}>Добавить близкого</Text>
                                <TouchableOpacity onPress={() => setFamilyModalVisible(false)}>
                                    <Ionicons name="close-circle" size={30} color="#CBD5E1" />
                                </TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.inputLabelSmall}>Кем приходится ребенку?</Text>
                                <View style={styles.roleGridEnhanced}>
                                    {availableRoles.map((role) => (
                                        <TouchableOpacity 
                                            key={role} 
                                            style={[styles.roleCardMini, fRole === role && styles.roleCardActive]} 
                                            onPress={() => setFRole(role)}
                                        >
                                            <Ionicons name={ROLE_DETAILS[role].icon} size={18} color={fRole === role ? '#FFF' : '#6366F1'} />
                                            <Text style={[styles.roleCardText, fRole === role && { color: '#FFF' }]}>{ROLE_DETAILS[role].label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                {/* Имя родственника */}
<View style={styles.inputWrapper}>
    <Text style={styles.inputLabelSmall}>Имя родственника</Text>
    <TextInput 
        style={styles.enhancedInput} 
        placeholder="Например: Алия" 
        placeholderTextColor="#94A3B8" // Явно задаем цвет плейсхолдера
        value={fName} 
        onChangeText={setFName} 
    />
</View>

{/* Номер телефона */}
<View style={styles.inputWrapper}>
    <Text style={styles.inputLabelSmall}>Номер телефона (для входа)</Text>
    <View style={styles.phoneInputRow}>
        <Ionicons name="call" size={20} color="#6366F1" style={{ marginLeft: 12 }} />
        <TextInput 
            style={styles.enhancedInputPhone} 
            keyboardType="phone-pad" 
            placeholder="+7 000 000 00 00" // Добавим плейсхолдер и сюда
            placeholderTextColor="#94A3B8"
            value={fPhone} 
            onChangeText={handlePhoneInput}
        />
    </View>
</View>

{/* Пароль */}
<View style={styles.inputWrapper}>
    <Text style={styles.inputLabelSmall}>Придумайте пароль</Text>
    <View style={styles.phoneInputRow}>
        <Ionicons name="lock-closed" size={20} color="#6366F1" style={{ marginLeft: 12 }} />
        <TextInput 
            style={styles.enhancedInputPhone} 
            secureTextEntry 
            placeholder="Минимум 4 символа" 
            placeholderTextColor="#94A3B8"
            value={fPassword} 
            onChangeText={setFPassword} 
        />
    </View>
</View>
                                <View style={styles.infoAlert}>
                                    <Ionicons name="information-circle" size={18} color="#3B82F6" />
                                    <Text style={styles.infoAlertText}>Родственник сможет зайти в приложение, используя этот телефон и пароль.</Text>
                                </View>
                                <TouchableOpacity style={styles.mainActionBtn} onPress={handleAddFamilyMember}>
                                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.gradientBtn}>
                                        <Text style={styles.btnTextWhite}>Предоставить доступ</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F8FAFC' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    profileCardWrapper: { padding: 20 },
    mainCard: { borderRadius: 30, padding: 25, alignItems: 'center', elevation: 5 },
    parentAvatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)', marginBottom: 10 },
    parentAvatarLetter: { fontSize: 32, fontWeight: '900', color: '#FFF' },
    parentNameText: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    badgeContainer: { marginTop: 8, backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
    sectionHeader: { fontSize: 14, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 20, marginTop: 20, marginBottom: 10 },
    addBtnCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    cardContainerWhite: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 24, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
    iconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    itemTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    itemSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 70 },
    emptyState: { padding: 30, alignItems: 'center' },
    emptyText: { textAlign: 'center', color: '#94A3B8', fontSize: 13, marginTop: 10, lineHeight: 18 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, gap: 8 },
    logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
    footer: { textAlign: 'center', color: '#CBD5E1', fontSize: 12, marginTop: 40, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
    modalContentEnhanced: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
    modalIndicator: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitleLarge: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
    inputLabelSmall: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10, marginLeft: 4 },
    roleGridEnhanced: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
    roleCardMini: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    roleCardActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    roleCardText: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginLeft: 8 },
    inputWrapper: { marginBottom: 20 },
    enhancedInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: '#E2E8F0' },
    phoneInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    enhancedInputPhone: { flex: 1, padding: 16, fontSize: 16, fontWeight: '700', color: '#1E293B' },
    infoAlert: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 12, alignItems: 'center', gap: 10, marginBottom: 25 },
    infoAlertText: { flex: 1, fontSize: 12, color: '#3B82F6', fontWeight: '500' },
    mainActionBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 10 },
    gradientBtn: { paddingVertical: 18, alignItems: 'center' },
    btnTextWhite: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    deleteActionBtn: { padding: 10, marginLeft: 5 },
});