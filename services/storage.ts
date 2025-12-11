import { User, Seat, Booking, UserRole, SeatType } from '../types';

// Use environment variable VITE_API_URL for production (Netlify), fallback to localhost for development
// In Netlify: Site Settings > Build & Deploy > Environment > Add variable: VITE_API_URL = https://your-backend.onrender.com/api
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const KEYS = {
  USERS: 'libbook_users',
  SEATS: 'libbook_seats',
  BOOKINGS: 'libbook_bookings',
  CURRENT_USER: 'libbook_current_user'
};

// --- FALLBACK MOCK DATA ---
const INITIAL_SEATS: Seat[] = [
  // Lounge
  { id: 's-l1', label: 'L1', type: SeatType.STANDARD, isMaintenance: false, x: 1, y: 1, rotation: 180 },
  { id: 's-l2', label: 'L2', type: SeatType.STANDARD, isMaintenance: false, x: 2, y: 1, rotation: 180 },
  { id: 's-l3', label: 'L3', type: SeatType.STANDARD, isMaintenance: false, x: 3, y: 1, rotation: 180 },
  // PC
  { id: 's-pc1', label: 'PC1', type: SeatType.PC, isMaintenance: false, x: 9, y: 0, rotation: 180 },
  { id: 's-pc2', label: 'PC2', type: SeatType.PC, isMaintenance: false, x: 10, y: 0, rotation: 180 },
  { id: 's-pc3', label: 'PC3', type: SeatType.PC, isMaintenance: false, x: 11, y: 0, rotation: 180 },
  { id: 's-pc4', label: 'PC4', type: SeatType.PC, isMaintenance: false, x: 13, y: 1, rotation: 225 },
  // Group 1
  { id: 's-t1-1', label: 'T1-A', type: SeatType.QUIET, isMaintenance: false, x: 11, y: 3, rotation: 180 },
  { id: 's-t1-2', label: 'T1-B', type: SeatType.QUIET, isMaintenance: false, x: 11, y: 5, rotation: 0 },
  { id: 's-t1-3', label: 'T1-C', type: SeatType.QUIET, isMaintenance: false, x: 10, y: 4, rotation: 90 },
  { id: 's-t1-4', label: 'T1-D', type: SeatType.QUIET, isMaintenance: false, x: 12, y: 4, rotation: 270 },
  // Group 2
  { id: 's-t2-1', label: 'T2-A', type: SeatType.QUIET, isMaintenance: false, x: 11, y: 7, rotation: 180 },
  { id: 's-t2-2', label: 'T2-B', type: SeatType.QUIET, isMaintenance: false, x: 11, y: 9, rotation: 0 },
  { id: 's-t2-3', label: 'T2-C', type: SeatType.QUIET, isMaintenance: false, x: 10, y: 8, rotation: 90 },
  { id: 's-t2-4', label: 'T2-D', type: SeatType.QUIET, isMaintenance: false, x: 12, y: 8, rotation: 270 },
  // Carrels
  { id: 's-c1', label: 'C1', type: SeatType.STANDARD, isMaintenance: false, x: 1, y: 4, rotation: 90 },
  { id: 's-c2', label: 'C2', type: SeatType.STANDARD, isMaintenance: false, x: 2, y: 4, rotation: 90 },
  { id: 's-c3', label: 'C3', type: SeatType.STANDARD, isMaintenance: false, x: 3, y: 4, rotation: 90 },
  { id: 's-c4', label: 'C4', type: SeatType.STANDARD, isMaintenance: false, x: 4, y: 4, rotation: 90 },
  { id: 's-c5', label: 'C5', type: SeatType.STANDARD, isMaintenance: false, x: 1, y: 6, rotation: 90 },
  { id: 's-c6', label: 'C6', type: SeatType.STANDARD, isMaintenance: false, x: 2, y: 6, rotation: 90 },
  { id: 's-c7', label: 'C7', type: SeatType.STANDARD, isMaintenance: false, x: 3, y: 6, rotation: 90 },
  { id: 's-c8', label: 'C8', type: SeatType.STANDARD, isMaintenance: false, x: 4, y: 6, rotation: 90 },
  { id: 's-c9', label: 'C9', type: SeatType.STANDARD, isMaintenance: false, x: 1, y: 8, rotation: 90 },
  { id: 's-c10', label: 'C10', type: SeatType.STANDARD, isMaintenance: false, x: 2, y: 8, rotation: 90 },
  { id: 's-c11', label: 'C11', type: SeatType.STANDARD, isMaintenance: false, x: 3, y: 8, rotation: 90 },
  { id: 's-c12', label: 'C12', type: SeatType.STANDARD, isMaintenance: false, x: 4, y: 8, rotation: 90 },
];

const ADMIN_USER: User = {
  id: 'admin-1',
  name: 'Library Admin',
  email: 'admin@library.edu',
  password: 'admin',
  role: UserRole.ADMIN,
  isBlocked: false
};

const DEMO_STUDENT: User = {
  id: 'student-1',
  name: 'John Doe',
  email: 'john@student.edu',
  password: 'pass',
  role: UserRole.STUDENT,
  studentId: 'CS2024001',
  department: 'Computer Science',
  yearSection: '3-A',
  mobile: '5550123456',
  isBlocked: false
};

// State to track if we are in offline mode
let isOfflineMode = false;

// Helper function to handle API calls with fallback
async function safeFetch(url: string, options?: RequestInit) {
  if (isOfflineMode) throw new Error("Offline Mode Active");
  
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    
    if (!response.ok) {
       // If 404 or 500, we might still want to throw to trigger fallback if appropriate, 
       // but strictly "Failed to fetch" is a network error. 
       // For now, if server responds, we trust it.
       if(response.status >= 500) throw new Error("Server Error");
       return response;
    }
    return response;
  } catch (error) {
    if (!isOfflineMode) {
      console.warn("Backend Unreachable: Switching to Offline Mode (LocalStorage).");
      isOfflineMode = true;
    }
    throw error;
  }
}

// --- HYBRID DATA ACCESS LAYERS ---

export const getStoredUsers = async (): Promise<User[]> => {
  try {
    const res = await safeFetch(`${API_URL}/users`);
    return await res.json();
  } catch (e) {
    // Fallback
    const stored = localStorage.getItem(KEYS.USERS);
    if (!stored) {
      const initial = [ADMIN_USER, DEMO_STUDENT];
      localStorage.setItem(KEYS.USERS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(stored);
  }
};

export const getStoredSeats = async (): Promise<Seat[]> => {
  try {
    const res = await safeFetch(`${API_URL}/seats`);
    return await res.json();
  } catch (e) {
    // Fallback
    const stored = localStorage.getItem(KEYS.SEATS);
    if (!stored) {
      localStorage.setItem(KEYS.SEATS, JSON.stringify(INITIAL_SEATS));
      return INITIAL_SEATS;
    }
    return JSON.parse(stored);
  }
};

export const getStoredBookings = async (): Promise<Booking[]> => {
  try {
    const res = await safeFetch(`${API_URL}/bookings`);
    return await res.json();
  } catch (e) {
    // Fallback
    const stored = localStorage.getItem(KEYS.BOOKINGS);
    return stored ? JSON.parse(stored) : [];
  }
};

// --- HYBRID MUTATIONS ---

export const saveUser = async (user: User): Promise<void> => {
  try {
    await safeFetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  } catch (e) {
    // Fallback
    const users = await getStoredUsers();
    users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }
};

export const updateUser = async (updatedUser: User): Promise<void> => {
  try {
    await safeFetch(`${API_URL}/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser)
    });
  } catch (e) {
    // Fallback
    const users = await getStoredUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  }
};

export const saveSeats = async (seats: Seat[]): Promise<void> => {
  try {
    await safeFetch(`${API_URL}/seats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seats)
    });
  } catch (e) {
    // Fallback
    localStorage.setItem(KEYS.SEATS, JSON.stringify(seats));
  }
};

export const createBooking = async (booking: Booking): Promise<boolean> => {
  try {
    const res = await safeFetch(`${API_URL}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
    return res.status === 201;
  } catch (e) {
    // Fallback
    const bookings = await getStoredBookings();
    
    // Manual Conflict Check for Offline Mode
    const isTaken = bookings.some(b => 
      b.seatId === booking.seatId && 
      b.date === booking.date && 
      b.startTime === booking.startTime &&
      b.status === 'ACTIVE'
    );
    
    if (isTaken) return false;

    bookings.push(booking);
    localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    return true;
  }
};

export const cancelBooking = async (bookingId: string): Promise<void> => {
  try {
    await safeFetch(`${API_URL}/bookings/${bookingId}/cancel`, {
      method: 'PUT'
    });
  } catch (e) {
    // Fallback
    const bookings = await getStoredBookings();
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
      bookings[index].status = 'CANCELLED';
      localStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    }
  }
};

export const toggleSeatMaintenance = async (seatId: string): Promise<void> => {
  try {
    await safeFetch(`${API_URL}/seats/toggle-maintenance/${seatId}`, {
      method: 'POST'
    });
  } catch (e) {
    // Fallback
    const seats = await getStoredSeats();
    const seat = seats.find(s => s.id === seatId);
    if (seat) {
      seat.isMaintenance = !seat.isMaintenance;
      localStorage.setItem(KEYS.SEATS, JSON.stringify(seats));
    }
  }
};

// --- SESSION MANAGEMENT ---
// Always local for client state
export const getSession = async (): Promise<User | null> => {
  return new Promise((resolve) => {
    const stored = localStorage.getItem(KEYS.CURRENT_USER);
    resolve(stored ? JSON.parse(stored) : null);
  });
};

export const setSession = async (user: User): Promise<void> => {
  localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
};

export const clearSession = async (): Promise<void> => {
  localStorage.removeItem(KEYS.CURRENT_USER);
};