import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { ScheduleTemplate, RoomSchedule, SchedulePeriodEntry, Building } from '@/types/domain'
import { PERIODS, type SchoolType } from '@/lib/school-periods'

export async function getTemplates(): Promise<ScheduleTemplate[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schedule_templates')
    .select('*')
    .order('school_type')
    .order('name')
  if (error) throw error
  return (data ?? []) as ScheduleTemplate[]
}

export async function createTemplate(
  name: string,
  school_type: 'יסודי' | 'תיכון',
  periods: SchedulePeriodEntry[],
  created_by: string
): Promise<ScheduleTemplate> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('schedule_templates')
    .insert({ name, school_type, periods, created_by })
    .select()
    .single()
  if (error) throw error
  return data as ScheduleTemplate
}

export async function updateTemplatePeriods(
  id: string,
  periods: SchedulePeriodEntry[]
): Promise<ScheduleTemplate> {
  const supabase = createServiceClient()

  const { data: oldTemplate } = await supabase
    .from('schedule_templates')
    .select('periods, school_type, name')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('schedule_templates')
    .update({ periods })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (oldTemplate) {
    const oldSet = new Set((oldTemplate.periods as SchedulePeriodEntry[]).map(p => `${p.day}-${p.period}`))
    const newlyOccupied = periods.filter(p => !oldSet.has(`${p.day}-${p.period}`))

    if (newlyOccupied.length > 0) {
      const { data: affected } = await supabase
        .from('room_schedules')
        .select('room_id')
        .eq('template_id', id)
        .is('custom_periods', null)

      if (affected && affected.length > 0) {
        await cancelBookingsForPeriods(
          affected.map(r => r.room_id),
          newlyOccupied,
          data as ScheduleTemplate
        )
      }
    }
  }

  return data as ScheduleTemplate
}

async function cancelBookingsForPeriods(
  roomIds: string[],
  newlyOccupied: SchedulePeriodEntry[],
  template: ScheduleTemplate
): Promise<void> {
  const { sendScheduleConflict } = await import('@/services/notifications.service')
  const supabase = createServiceClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, profile:profiles(*), room:rooms(*)')
    .in('room_id', roomIds)
    .eq('status', 'active')
    .gte('start_time', new Date().toISOString())

  if (!bookings || bookings.length === 0) return

  const schoolType = template.school_type as SchoolType
  const periodDefs = PERIODS[schoolType]
  const toCancel: string[] = []
  const toNotify: typeof bookings = []

  for (const booking of bookings) {
    const start = new Date(booking.start_time)
    const dayOfWeek = start.getDay()
    const startHHMM = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
    const endHHMM = new Date(booking.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })

    const relevant = newlyOccupied.filter(p => p.day === dayOfWeek)
    for (const entry of relevant) {
      const periodDef = periodDefs.find(p => p.number === entry.period)
      if (!periodDef) continue
      if (periodDef.start < endHHMM && periodDef.end > startHHMM) {
        toCancel.push(booking.id)
        toNotify.push(booking)
        break
      }
    }
  }

  if (toCancel.length === 0) return
  await supabase.from('bookings').update({ status: 'canceled' }).in('id', toCancel)
  await Promise.all(toNotify.map(b => sendScheduleConflict(b, template.name).catch(() => {})))
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('schedule_templates').delete().eq('id', id)
  if (error) throw error
}

export async function getAllRoomSchedules(): Promise<(RoomSchedule & { template: ScheduleTemplate | null })[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('room_schedules')
    .select('*, template:schedule_templates(*)')
  if (error) throw error
  return (data ?? []) as (RoomSchedule & { template: ScheduleTemplate | null })[]
}

export async function setRoomTemplate(roomId: string, templateId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('room_schedules').upsert({
    room_id: roomId,
    template_id: templateId,
    custom_periods: null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function setRoomCustomPeriods(
  roomId: string,
  templateId: string | null,
  periods: SchedulePeriodEntry[]
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('room_schedules').upsert({
    room_id: roomId,
    template_id: templateId,
    custom_periods: periods,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function clearRoomSchedule(roomId: string): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.from('room_schedules').delete().eq('room_id', roomId)
  if (error) throw error
}

export function getEffectivePeriods(
  schedule: RoomSchedule | null,
  templates: ScheduleTemplate[]
): SchedulePeriodEntry[] {
  if (!schedule) return []
  if (schedule.custom_periods) return schedule.custom_periods
  if (schedule.template_id) {
    const template = templates.find(t => t.id === schedule.template_id)
    return template?.periods ?? []
  }
  return []
}

export function isOccupiedBySchedule(
  schedule: RoomSchedule | null,
  templates: ScheduleTemplate[],
  building: Building,
  startTime: string,
  endTime: string
): boolean {
  const periods = getEffectivePeriods(schedule, templates)
  if (periods.length === 0) return false

  const start = new Date(startTime)
  const dayOfWeek = start.getDay()
  if (dayOfWeek === 6) return false // Saturday

  const schoolType: SchoolType = building === 'תיכון' ? 'תיכון' : 'יסודי'
  const periodDefs = PERIODS[schoolType]

  const startHHMM = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })
  const endHHMM = new Date(endTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })

  return periods.some(entry => {
    if (entry.day !== dayOfWeek) return false
    const periodDef = periodDefs.find(p => p.number === entry.period)
    if (!periodDef) return false
    return periodDef.start < endHHMM && periodDef.end > startHHMM
  })
}
