export type UserRole = 'user' | 'admin';
export type BookingStatus = 'active' | 'canceled';
export type SwitchStatus = 'pending' | 'approved' | 'canceled';

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
  capacity: number;
  equipment: string[];
}
