export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  email: string; // Used as login
  password?: string; // Stored plainly for demo purposes only
  role: UserRole;
  studentId?: string;
  department?: string;
  yearSection?: string;
  mobile?: string;
  isBlocked: boolean;
}

export enum SeatType {
  STANDARD = 'Standard',
  QUIET = 'Quiet Zone',
  PC = 'PC Station'
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  BOOKED = 'BOOKED',
  MAINTENANCE = 'MAINTENANCE'
}

export interface Seat {
  id: string;
  label: string; // e.g., A1, B2
  type: SeatType;
  isMaintenance: boolean;
  x: number; // Grid coordinates for visual map
  y: number;
  rotation: number; // 0, 90, 180, 270
}

export interface Booking {
  id: string;
  seatId: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:00
  endTime: string; // HH:00
  timestamp: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

export const LIBRARY_RULES = `
1. Library hours are 08:00 AM to 08:00 PM.
2. Students can book a maximum of 4 hours per day.
3. Keep silence in the Quiet Zone.
4. Check-in is required within 15 minutes of the slot start time.
5. No food or drinks allowed near PC Stations.
`;
