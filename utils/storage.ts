// utils/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- ACTIVITES (старое) ---
const STORAGE_KEY_ACTIVITIES = 'completed_activities_v1';
export type CompletedActivity = {
  activityId: string;
  date: string;
  difficulty: 'easy' | 'ok' | 'hard';
};
export type ActivityProgress = Record<string, CompletedActivity[]>;

// --- MILESTONES (новое) ---
const STORAGE_KEY_MILESTONES = 'completed_milestones_v1';
// Структура: { "childId": ["id1", "id2", "id5"] }
export type MilestoneProgress = Record<string, string[]>; 

// === ФУНКЦИИ АКТИВНОСТЕЙ ===
export const markActivityAsCompleted = async (childId: string, activityId: string, difficulty: 'easy'|'ok'|'hard') => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ACTIVITIES);
    const data: ActivityProgress = raw ? JSON.parse(raw) : {};
    const childProgress = data[childId] || [];
    
    // Удаляем старую запись если есть, добавляем новую
    const filtered = childProgress.filter(a => a.activityId !== activityId);
    filtered.push({ activityId, date: new Date().toISOString(), difficulty });
    
    data[childId] = filtered;
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(data));
    return true;
  } catch (e) { console.error(e); return false; }
};

export const getChildProgress = async (childId: string): Promise<CompletedActivity[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_ACTIVITIES);
    const data: ActivityProgress = raw ? JSON.parse(raw) : {};
    return data[childId] || [];
  } catch (e) { return []; }
};

// === ФУНКЦИИ ЭТАПОВ (MILESTONES) ===

/** Переключить статус этапа (выполнено/нет) */
export const toggleMilestone = async (childId: string, milestoneId: string) => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_MILESTONES);
        const data: MilestoneProgress = raw ? JSON.parse(raw) : {};
        let list = data[childId] || [];

        if (list.includes(milestoneId)) {
            list = list.filter(id => id !== milestoneId); // Удалить (uncheck)
        } else {
            list.push(milestoneId); // Добавить (check)
        }

        data[childId] = list;
        await AsyncStorage.setItem(STORAGE_KEY_MILESTONES, JSON.stringify(data));
        return list; // возвращаем обновленный список
    } catch (e) { console.error(e); return []; }
};

/** Получить выполненные этапы (список ID) */
export const getMilestonesProgress = async (childId: string): Promise<string[]> => {
    try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_MILESTONES);
        const data: MilestoneProgress = raw ? JSON.parse(raw) : {};
        return data[childId] || [];
    } catch (e) { return []; }
};