export type User = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
};

export type Family = {
  id: number;
  name: string | null;
  created_by: number;
  created_at: string;
};

export type FamilyMember = {
  id: number;
  user: User;
  family: number;
  role: string;
  can_edit_children: boolean;
  can_view_screenings: boolean;
  can_manage_family: boolean;
  joined_at: string;
};

export type Child = {
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

export type ActiveChildResponse = {
  id: number;
  user: number;
  family: number;
  active_child: Child | null;
  updated_at: string;
};

export type DashboardResponse = {
  active_child: Child | null;
  latest_measurement: {
    id: number;
    height: string | null;
    weight: string | null;
    measured_at: string;
    note: string | null;
  } | null;
  total_children: number;
  family_members_count: number;
  active_child_age_months: number | null;
};

export type ScreeningSession = {
  id: number;
  status: string;
  result_level: 'low' | 'medium' | 'high' | 'done' | 'unknown';
  score: number;
  completed_at: string | null;
  started_at: string;
  target_age_months: number | null;
  notes: string | null;
};