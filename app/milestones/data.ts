// app/milestones/data.ts

export type MilestoneCategory =
  | 'gross_motor'
  | 'fine_motor'
  | 'cognitive'
  | 'speech'
  | 'self_care'
  | 'social_emotional';

export type MilestoneItem = {
  id: string;
  category: MilestoneCategory;
  month: number; // Конкретный месяц (или год*12)
  title: string;
  description: string;
  icon: string;
};

export const MILESTONE_META: Record<MilestoneCategory, { 
    label: string; emoji: string; gradient: readonly [string, string]; color: string 
}> = {
  gross_motor: { label: 'Движение', emoji: '🏃', gradient: ['#A3E635', '#65A30D'], color: '#65A30D' },
  fine_motor: { label: 'Моторика', emoji: '✋', gradient: ['#06B6D4', '#0EA5E9'], color: '#0EA5E9' },
  cognitive: { label: 'Мышление', emoji: '🧠', gradient: ['#8B5CF6', '#6366F1'], color: '#6366F1' },
  speech: { label: 'Речь', emoji: '🗣️', gradient: ['#F97316', '#F59E0B'], color: '#F59E0B' },
  self_care: { label: 'Навыки', emoji: '✨', gradient: ['#22C55E', '#16A34A'], color: '#16A34A' },
  social_emotional: { label: 'Эмоции', emoji: '😊', gradient: ['#EC4899', '#DB2777'], color: '#DB2777' },
};

// ГЕНЕРАТОР БАЗЫ ДАННЫХ
const generateMilestones = (): MilestoneItem[] => {
  const library: MilestoneItem[] = [];
  const categories: MilestoneCategory[] = [
    'gross_motor', 'fine_motor', 'cognitive', 'speech', 'self_care', 'social_emotional'
  ];

  // 1. Месяцы 1-36
  for (let m = 1; m <= 36; m++) {
    categories.forEach(cat => {
      const meta = MILESTONE_META[cat];
      // 3 уникальных навыка на каждый месяц
      for (let i = 1; i <= 3; i++) {
        library.push({
          id: `m${m}-${cat}-${i}`,
          category: cat,
          month: m,
          title: `${meta.label}: Уровень ${m}.${i}`,
          description: `Ребенок должен уметь выполнять навык №${i} из категории "${meta.label}" к ${m} месяцу.`,
          icon: meta.emoji,
        });
      }
    });
  }

  // 2. Года (4, 5, 6 лет -> 48, 60, 72 мес)
  [48, 60, 72].forEach(m => {
     categories.forEach(cat => {
      const meta = MILESTONE_META[cat];
      for (let i = 1; i <= 3; i++) {
        library.push({
          id: `m${m}-${cat}-${i}`,
          category: cat,
          month: m,
          title: `${meta.label} (${m/12} лет): Навык ${i}`,
          description: `Сложный навык для возраста ${m/12} лет.`,
          icon: meta.emoji,
        });
      }
    });
  });

  return library;
};

export const MILESTONE_LIBRARY = generateMilestones();