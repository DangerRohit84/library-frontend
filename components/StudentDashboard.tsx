import React, { useState, useEffect } from 'react';
import { User, Booking, Seat, SeatType, SeatStatus } from '../types';
import { SeatMap } from './SeatMap';
import { getStoredSeats, getStoredBookings, createBooking, cancelBooking } from '../services/storage';
import { format, addDays, addHours, isSameDay } from 'date-fns';
import { Calendar, Clock, LogOut, CheckCircle2, History, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

const ALL_TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 8; // 8 AM to 8 PM
  return {
    value: `${hour.toString().padStart(2, '0')}:00`,
    label: `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'} - ${(hour + 1) % 12 || 12} ${hour + 1 < 12 ? 'AM' : 'PM'}`,
    hourInt: hour
  };
});

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, b] = await Promise.all([getStoredSeats(), getStoredBookings()]);
      setSeats(s);
      setBookings(b);
    } catch (e) {
      console.error(e);
      showToast("Failed to load data.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]); // Refresh when tab changes

  // Filter Time Slots logic
  const getAvailableTimeSlots = () => {
    const now = new Date();
    const isToday = isSameDay(new Date(selectedDate), now);
    const currentHour = now.getHours();

    return ALL_TIME_SLOTS.filter(slot => {
      if (isToday) {
        return slot.hourInt > currentHour;
      }
      return true;
    });
  };

  const filteredSlots = getAvailableTimeSlots();

  // Reset selected time if it becomes invalid
  useEffect(() => {
    if (filteredSlots.length > 0) {
      const isValid = filteredSlots.some(s => s.value === selectedTime);
      if (!isValid) {
        setSelectedTime(filteredSlots[0].value);
      }
    } else {
        setSelectedTime('');
    }
  }, [selectedDate, filteredSlots.length]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter bookings for the selected slot to update the map
  const activeSlotBookings = bookings
    .filter(b => b.date === selectedDate && b.startTime === selectedTime && b.status === 'ACTIVE')
    .map(b => b.seatId);

  const handleBook = async () => {
    if (!selectedSeat) return;
    if (!selectedTime) {
         showToast("No time slots available for this date.", 'error');
         return;
    }

    // Check conflict locally first for immediate feedback (optional, since API handles it too)
    const hasConflict = bookings.some(b => 
      b.userId === user.id && 
      b.date === selectedDate && 
      b.startTime === selectedTime && 
      b.status === 'ACTIVE'
    );

    if (hasConflict) {
      showToast("You already have a booking for this time slot.", 'error');
      return;
    }

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      seatId: selectedSeat.id,
      userId: user.id,
      userName: user.name,
      date: selectedDate,
      startTime: selectedTime,
      endTime: format(addHours(new Date(`2000-01-01T${selectedTime}`), 1), 'HH:00'),
      timestamp: Date.now(),
      status: 'ACTIVE'
    };

    setIsLoading(true);
    try {
      const success = await createBooking(newBooking);
      if (success) {
        await loadData(); // Reload all data
        showToast("Seat booked successfully!", 'success');
        setSelectedSeat(null);
      } else {
        showToast("Failed to book seat. It may have been taken.", 'error');
      }
    } catch (e) {
      showToast("Network error.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      setIsLoading(true);
      try {
        await cancelBooking(bookingId);
        await loadData();
        showToast("Booking cancelled.", 'success');
      } catch (e) {
        showToast("Failed to cancel.", 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const myBookings = bookings.filter(b => b.userId === user.id).sort((a, b) => b.timestamp - a.timestamp);

  // Date selection logic (Today + 2 days)
  const availableDates = [0, 1, 2].map(days => format(addDays(new Date(), days), 'yyyy-MM-dd'));

  return (
    <div className="min-h-screen bg-slate-100 pb-20 relative">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-5 ${toast.type === 'success' ? 'bg-white border-green-200 text-green-700' : 'bg-white border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
          {toast.msg}
        </div>
      )}

      {isLoading && (
         <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
         </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <span className="font-bold text-slate-800 hidden sm:block">LibBook Student</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:block">Welcome, {user.name}</span>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm max-w-md mx-auto mb-8">
          <button
            onClick={() => setActiveTab('book')}
            className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'book' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" /> Book a Seat
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'history' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 mr-2" /> My History
          </button>
        </div>

        {activeTab === 'book' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Filters */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Select Slot
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Date</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableDates.map(date => (
                        <button
                          key={date}
                          onClick={() => setSelectedDate(date)}
                          className={`py-2 text-xs font-medium rounded-lg border ${
                            selectedDate === date 
                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {format(new Date(date), 'MMM dd')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Time</label>
                    {filteredSlots.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 h-64 overflow-y-auto custom-scrollbar pr-1">
                        {filteredSlots.map(slot => (
                          <button
                            key={slot.value}
                            onClick={() => setSelectedTime(slot.value)}
                            className={`py-2 px-3 text-xs text-left font-medium rounded-lg border transition-all ${
                              selectedTime === slot.value
                              ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500 border border-slate-100">
                        No slots available for today.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedSeat && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary/20 animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="font-bold text-slate-800 mb-1">Confirm Booking</h3>
                  <p className="text-sm text-slate-500 mb-4">Please review your selection</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Seat</span>
                      <span className="font-semibold text-slate-900">{selectedSeat.label} <span className="text-xs font-normal text-slate-400">({selectedSeat.type})</span></span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Date</span>
                      <span className="font-semibold text-slate-900">{selectedDate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Time</span>
                      <span className="font-semibold text-slate-900">{ALL_TIME_SLOTS.find(t => t.value === selectedTime)?.label || 'N/A'}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleBook}
                    className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                  >
                    Confirm Booking
                  </button>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="lg:col-span-2">
               <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-700">Seat Map</h2>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                       {activeSlotBookings.length} Booked / {seats.filter(s => !s.isMaintenance).length} Total
                    </span>
                 </div>
                 <SeatMap 
                   seats={seats} 
                   bookingsForSlot={activeSlotBookings} 
                   onSeatClick={setSelectedSeat}
                   selectedSeatId={selectedSeat?.id || null}
                 />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {myBookings.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No booking history found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-4">Booking Ref</th>
                      <th className="px-6 py-4">Seat</th>
                      <th className="px-6 py-4">Date & Time</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono text-slate-500">#{booking.id.slice(-6)}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{seats.find(s => s.id === booking.seatId)?.label || 'Unknown'}</td>
                        <td className="px-6 py-4">
                          <div className="text-slate-900">{booking.date}</div>
                          <div className="text-slate-500 text-xs">{booking.startTime} - {booking.endTime}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${booking.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                              booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {booking.status === 'ACTIVE' && (
                            <button 
                              onClick={() => handleCancel(booking.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                              title="Cancel Booking"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};