import React, { useState, useEffect } from 'react';
import { User, Booking, Seat, SeatStatus, SeatType } from '../types';
import { SeatMap } from './SeatMap';
import { getStoredUsers, getStoredBookings, getStoredSeats, toggleSeatMaintenance, updateUser, saveSeats } from '../services/storage';
import { LayoutDashboard, Users, Armchair, LogOut, Ban, CheckCircle, Pencil, Save, RotateCw, Trash2, Monitor, BookOpen, Download, CalendarRange, Loader2 } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'seats' | 'students'>('overview');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Date Filter State for Export
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [s, u, b] = await Promise.all([
        getStoredSeats(),
        getStoredUsers(),
        getStoredBookings()
      ]);
      setSeats(s);
      setUsers(u);
      setBookings(b);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [activeTab]);

  const generateLabel = (x: number, y: number) => {
    return `${String.fromCharCode(65 + y)}${x + 1}`;
  };

  const handleSeatInteraction = async (seat: Seat) => {
    if (isEditMode) {
      if (selectedSeat?.id === seat.id) {
        setSelectedSeat(null);
      } else {
        setSelectedSeat(seat);
      }
    } else {
      await toggleSeatMaintenance(seat.id);
      refreshData();
    }
  };

  const handleEmptySlotClick = async (x: number, y: number) => {
    if (!isEditMode) return;

    if (selectedSeat) {
      // Move Logic
      const updatedSeats = seats.map(s => {
        if (s.id === selectedSeat.id) {
          return { ...s, x, y, label: generateLabel(x, y) };
        }
        return s;
      });
      setSeats(updatedSeats); // Optimistic Update
      await saveSeats(updatedSeats);
      setSelectedSeat(null);
    } else {
      // Create Logic
      const newSeat: Seat = {
        id: `seat-${Date.now()}`,
        label: generateLabel(x, y),
        type: SeatType.STANDARD,
        isMaintenance: false,
        x,
        y,
        rotation: 0
      };
      const updatedSeats = [...seats, newSeat];
      setSeats(updatedSeats); // Optimistic Update
      await saveSeats(updatedSeats);
    }
  };

  const handleChangeType = async (type: SeatType) => {
    if (!selectedSeat) return;
    const updatedSeats = seats.map(s => s.id === selectedSeat.id ? { ...s, type } : s);
    setSeats(updatedSeats);
    await saveSeats(updatedSeats);
    setSelectedSeat({ ...selectedSeat, type });
  };

  const handleRotateSeat = async () => {
    if (!selectedSeat) return;
    const newRotation = ((selectedSeat.rotation || 0) + 90) % 360;
    const updatedSeats = seats.map(s => s.id === selectedSeat.id ? { ...s, rotation: newRotation } : s);
    setSeats(updatedSeats);
    await saveSeats(updatedSeats);
    setSelectedSeat({ ...selectedSeat, rotation: newRotation });
  };

  const handleDeleteSeat = async () => {
    if (!selectedSeat) return;
    
    if (window.confirm(`Are you sure you want to PERMANENTLY delete seat ${selectedSeat.label}?`)) {
      const updatedSeats = seats.filter(s => s.id !== selectedSeat.id);
      setSeats(updatedSeats); // Optimistic
      await saveSeats(updatedSeats);
      setSelectedSeat(null);
    }
  };

  const handleBlockUser = async (targetUser: User) => {
    if (targetUser.role === 'ADMIN') return;
    const updated = { ...targetUser, isBlocked: !targetUser.isBlocked };
    await updateUser(updated);
    refreshData();
  };

  const handleExportData = () => {
    const filteredBookings = bookings.filter(b => {
      return b.date >= startDate && b.date <= endDate;
    });

    if (filteredBookings.length === 0) {
      alert("No bookings found in the selected date range.");
      return;
    }

    const headers = ["Booking ID", "Student Name", "Student ID", "Department", "Seat", "Date", "Time", "Status"];
    const rows = filteredBookings.map(b => {
      const student = users.find(u => u.id === b.userId);
      const seat = seats.find(s => s.id === b.seatId);
      
      return [
        b.id,
        b.userName,
        student?.studentId || "N/A",
        student?.department || "N/A",
        seat?.label || "Unknown",
        b.date,
        `${b.startTime} - ${b.endTime}`,
        b.status
      ].map(field => `"${field}"`).join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `library_bookings_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'ACTIVE').length;
  const maintenanceSeats = seats.filter(s => s.isMaintenance).length;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
          <div className="p-6 border-b border-slate-800">
             <div className="text-xl font-bold tracking-tight">LibAdmin</div>
             <div className="text-xs text-slate-500">Management Console</div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === 'overview' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('seats')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === 'seats' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Armchair className="w-5 h-5 mr-3" /> Seat Management
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm transition-colors ${activeTab === 'students' ? 'bg-primary text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="w-5 h-5 mr-3" /> Students
            </button>
          </nav>
          <div className="p-4 border-t border-slate-800">
            <button onClick={onLogout} className="w-full flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-red-600 rounded-lg transition-colors text-sm">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <header className="mb-8 md:hidden flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-800">LibAdmin</h1>
            <button onClick={onLogout} className="text-slate-500"><LogOut /></button>
          </header>
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
                 
                 <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-2">
                   <div className="flex items-center gap-2 px-2">
                     <CalendarRange className="text-slate-400" size={16} />
                     <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                       <input 
                         type="date" 
                         value={startDate} 
                         onChange={(e) => setStartDate(e.target.value)}
                         className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer" 
                       />
                     </div>
                   </div>
                   <div className="w-px h-8 bg-slate-100 hidden md:block"></div>
                   <div className="flex items-center gap-2 px-2">
                     <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                       <input 
                         type="date" 
                         value={endDate} 
                         onChange={(e) => setEndDate(e.target.value)}
                         className="text-xs font-medium text-slate-700 bg-transparent outline-none cursor-pointer" 
                       />
                     </div>
                   </div>
                   <button 
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm text-sm font-medium ml-2"
                   >
                     <Download size={16} /> Export
                   </button>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                   <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Total Bookings</div>
                   <div className="text-4xl font-bold text-slate-900">{totalBookings}</div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                   <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Active Now</div>
                   <div className="text-4xl font-bold text-emerald-600">{activeBookings}</div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                   <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-2">Seats in Maintenance</div>
                   <div className="text-4xl font-bold text-orange-500">{maintenanceSeats}</div>
                 </div>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                 <h3 className="font-bold text-slate-800 mb-4">Recent Activity</h3>
                 <ul className="space-y-3">
                   {bookings.slice(-5).reverse().map(b => (
                     <li key={b.id} className="flex justify-between items-center text-sm border-b border-slate-100 last:border-0 pb-2">
                       <span className="text-slate-600">
                         <span className="font-semibold text-slate-800">{b.userName}</span> {b.status === 'ACTIVE' ? 'booked' : 'cancelled'} seat {seats.find(s => s.id === b.seatId)?.label}
                       </span>
                       <span className="text-slate-400 text-xs">{new Date(b.timestamp).toLocaleTimeString()}</span>
                     </li>
                   ))}
                 </ul>
               </div>
            </div>
          )}

          {activeTab === 'seats' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Seat Management</h2>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setIsEditMode(!isEditMode); setSelectedSeat(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${isEditMode ? 'bg-primary text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {isEditMode ? <><Save size={16} /> Finish Editing</> : <><Pencil size={16} /> Edit Layout</>}
                  </button>
                  
                  {!isEditMode && (
                    <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-lg border flex items-center">
                      Click seat to toggle <span className="text-orange-500 font-bold mx-1">Maintenance</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Editing Toolbar */}
              {isEditMode && selectedSeat && (
                <div className="bg-white p-4 rounded-xl shadow-lg border border-primary/20 flex flex-wrap gap-4 items-center justify-between animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">
                      {selectedSeat.label}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase font-semibold">Selected Seat</div>
                      <div className="text-sm font-medium text-slate-900">{selectedSeat.type}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleChangeType(SeatType.STANDARD)} className={`p-2 rounded-lg border ${selectedSeat.type === SeatType.STANDARD ? 'bg-slate-100 border-slate-300' : 'bg-white hover:bg-slate-50'}`} title="Standard"><Armchair size={18}/></button>
                    <button onClick={() => handleChangeType(SeatType.PC)} className={`p-2 rounded-lg border ${selectedSeat.type === SeatType.PC ? 'bg-cyan-50 border-cyan-300' : 'bg-white hover:bg-slate-50'}`} title="PC Station"><Monitor size={18}/></button>
                    <button onClick={() => handleChangeType(SeatType.QUIET)} className={`p-2 rounded-lg border ${selectedSeat.type === SeatType.QUIET ? 'bg-violet-50 border-violet-300' : 'bg-white hover:bg-slate-50'}`} title="Quiet Zone"><BookOpen size={18}/></button>
                    
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    
                    <button onClick={handleRotateSeat} className="flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium border border-slate-200" title="Rotate Seat">
                      <RotateCw size={16} /> Rotate
                    </button>
                    
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    
                    <button onClick={handleDeleteSeat} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium">
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              )}

              <SeatMap 
                seats={seats} 
                bookingsForSlot={[]} 
                onSeatClick={handleSeatInteraction}
                onEmptySlotClick={handleEmptySlotClick}
                selectedSeatId={selectedSeat?.id || null}
                isAdmin={true}
                isEditMode={isEditMode}
              />
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
               <h2 className="text-2xl font-bold text-slate-800">Student Management</h2>
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-4">Name / ID</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Dept / Year</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.filter(u => u.role === 'STUDENT').map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">{u.name}</div>
                            <div className="text-slate-500 text-xs">{u.studentId}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{u.email}</td>
                          <td className="px-6 py-4 text-slate-600">{u.department} - {u.yearSection}</td>
                          <td className="px-6 py-4">
                             {u.isBlocked ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Blocked</span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                             )}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleBlockUser(u)}
                              className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${u.isBlocked ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-red-200 text-red-700 hover:bg-red-50'}`}
                            >
                              {u.isBlocked ? <><CheckCircle size={14} /> Unblock</> : <><Ban size={14} /> Block</>}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};