import { createServiceClient } from '@/lib/supabase/server'

export interface SchoolSettings {
  school_year_start: string         // 'YYYY-MM-DD'
  school_year_end_primary: string
  school_year_end_secondary: string
}

const DEFAULTS: SchoolSettings = {
  school_year_start: '2025-09-01',
  school_year_end_primary: '2026-06-30',
  school_year_end_secondary: '2026-06-20',
}

export async function getSchoolSettings(): Promise<SchoolSettings> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('school_settings').select('key, value')
  if (!data) return DEFAULTS

  const map: Record<string, string> = {}
  for (const row of data) {
    map[row.key] = typeof row.value === 'string' ? row.value : JSON.parse(row.value)
  }

  return {
    school_year_start:         map['school_year_start']         ?? DEFAULTS.school_year_start,
    school_year_end_primary:   map['school_year_end_primary']   ?? DEFAULTS.school_year_end_primary,
    school_year_end_secondary: map['school_year_end_secondary'] ?? DEFAULTS.school_year_end_secondary,
  }
}

export async function updateSchoolSetting(key: string, value: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('school_settings')
    .upsert({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() })
  if (error) throw error
}
