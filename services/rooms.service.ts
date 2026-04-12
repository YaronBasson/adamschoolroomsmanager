import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Room, CreateRoomInput, ScheduleTemplate, RoomSchedule } from '@/types/domain'
import { isOccupiedBySchedule } from '@/services/schedules.service'

export async function getRooms(): Promise<Room[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)
    .order('floor', { ascending: true })
    .order('room_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getRoomById(id: string): Promise<Room | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

/**
 * Returns rooms that are available (no active booking) for the given time slot.
 */
export async function getAvailableRooms(
  startTime: string,
  endTime: string
): Promise<Room[]> {
  const supabase = await createClient()

  // Get IDs of rooms booked during this slot
  const { data: bookedRooms } = await supabase
    .from('bookings')
    .select('room_id')
    .eq('status', 'active')
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  const bookedRoomIds = bookedRooms?.map((b) => b.room_id) ?? []

  let query = supabase
    .from('rooms')
    .select('*')
    .eq('is_active', true)

  if (bookedRoomIds.length > 0) {
    query = query.not('id', 'in', `(${bookedRoomIds.join(',')})`)
  }

  const { data, error } = await query
    .order('floor', { ascending: true })
    .order('room_number', { ascending: true })

  if (error) throw error
  let rooms: Room[] = data ?? []

  // Filter rooms occupied by class schedule
  if (rooms.length > 0) {
    const { data: schedules } = await supabase
      .from('room_schedules')
      .select('*')
      .in('room_id', rooms.map(r => r.id))

    if (schedules && schedules.length > 0) {
      const templateIds = [...new Set(
        (schedules as RoomSchedule[]).filter(s => s.template_id && !s.custom_periods).map(s => s.template_id!)
      )]
      let templates: ScheduleTemplate[] = []
      if (templateIds.length > 0) {
        const { data: tpls } = await supabase
          .from('schedule_templates')
          .select('*')
          .in('id', templateIds)
        templates = (tpls ?? []) as ScheduleTemplate[]
      }
      const scheduleMap = Object.fromEntries((schedules as RoomSchedule[]).map(s => [s.room_id, s]))
      rooms = rooms.filter(room => {
        const sched = scheduleMap[room.id] ?? null
        return !isOccupiedBySchedule(sched, templates, room.building, startTime, endTime)
      })
    }
  }

  return rooms
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('rooms')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRoom(
  id: string,
  updates: Partial<CreateRoomInput & { is_active: boolean }>
): Promise<Room> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllRoomsAdmin(): Promise<Room[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('floor', { ascending: true })
    .order('room_number', { ascending: true })
  if (error) throw error
  return data ?? []
}
