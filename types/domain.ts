export type UserRole = 'user' | 'admin';
export type BookingStatus = 'active' | 'canceled';
export type SwitchStatus = 'pending' | 'approved' | 'canceled';
export type Building = 'יסודי' | 'תיכון' | 'אלוט';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  approved: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  floor: number;
  room_number: string;
  name: string;
  building: Building;
  capacity: number;
  equipment: string[];
  is_active: boolean;
  created_at: string;
}

export interface BookingReason {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  reason_id: string | null;
  reason_text: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  created_at: string;
  // joined fields
  profile?: Profile;
  room?: Room;
  reason?: BookingReason;
}

export interface SwitchRequest {
  id: string;
  requester_booking_id: string;
  target_booking_id: string;
  status: SwitchStatus;
  created_at: string;
  // joined fields
  requester_booking?: Booking;
  target_booking?: Booking;
}

export interface CreateBookingInput {
  room_id: string;
  reason_id?: string;
  reason_text?: string;
  start_time: string;
  end_time: string;
}

export interface CreateRoomInput {
  floor: number;
  room_number: string;
  name: string;
  building: Building;
  capacity: number;
  equipment: string[];
}

export interface SchedulePeriodEntry {
  day: number;    // 0=Sun, 1=Mon, ..., 5=Fri
  period: number; // 1-10
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  school_type: 'יסודי' | 'תיכון';
  periods: SchedulePeriodEntry[];
  created_by: string | null;
  created_at: string;
}

export interface RoomSchedule {
  room_id: string;
  template_id: string | null;
  custom_periods: SchedulePeriodEntry[] | null;
  updated_at: string;
}

export type RecurringStatus = 'pending' | 'approved' | 'rejected';

export interface SchoolEvent {
  id: string;
  title: string;
  event_date: string | null;
  school_type: 'יסודי' | 'תיכון' | 'שניהם' | null;
  description: string | null;
  responsible_user_id: string | null;
  classes: string[];
  booking_ids: string[];
  reminder_sent: boolean;
  created_by: string | null;
  created_at: string;
}
