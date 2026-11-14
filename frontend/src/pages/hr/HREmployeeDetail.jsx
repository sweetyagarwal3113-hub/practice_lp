import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, ArrowLeft, Mail, Calendar, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../../utils/config';
import LeaveHistoryTimeline from '../../components/leaves/LeaveHistoryTimeline';

// Fetch specific employee info
const fetchEmployee = async (id) => {
    console.log("[Frontend Async] Executing fetchEmployee in HREmployeeDetail.jsx");
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/api/hr/employees`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch employee');
  const employees = await res.json();
  return employees.find(e => e.id === parseInt(id));
};

// Fetch employee leaves
const fetchEmployeeLeaves = async (id) => {
    console.log("[Frontend Async] Executing fetchEmployeeLeaves in HREmployeeDetail.jsx");
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/api/leaves/employee/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch leaves');
  return await res.json();
};

// Fetch employee comp-offs
const fetchEmployeeCompOffs = async (id) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE_URL}/api/admin/comp-off/history?employeeId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!res.ok) throw new Error('Failed to fetch comp-offs');
  return await res.json();
};

export default function HREmployeeDetail() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => fetchEmployee(employeeId),
  });

  const { data: leaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['employeeLeaves', employeeId],
    queryFn: () => fetchEmployeeLeaves(employeeId),
  });

  useEffect(() => {
    if (leaves && leaves.length > 0) {
      const latestLeaveDate = new Date(Math.max(...leaves.map(l => new Date(l.start_date))));
      if (latestLeaveDate.getMonth() !== new Date().getMonth() || latestLeaveDate.getFullYear() !== new Date().getFullYear()) {
        setCurrentDate(new Date(latestLeaveDate.getFullYear(), latestLeaveDate.getMonth(), 1));
      }
    }
  }, [leaves]);

  const { data: compOffs, isLoading: compOffsLoading } = useQuery({
    queryKey: ['employeeCompOffs', employeeId],
    queryFn: () => fetchEmployeeCompOffs(employeeId),
  });

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const calendarDays = Array(firstDayOfMonth).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const getLeaveForDay = (day) => {
    if (!leaves) return null;
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    dateToCheck.setHours(0, 0, 0, 0);

    for (let leave of leaves) {
      if (leave.status === 'cancelled' || leave.status === 'withdrawn') continue;
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      if (dateToCheck >= start && dateToCheck <= end) {
        if (leave.withdrawn_dates) {
          const withdrawnArray = typeof leave.withdrawn_dates === 'string' ? JSON.parse(leave.withdrawn_dates) : leave.withdrawn_dates;
          const isWithdrawn = withdrawnArray.some(d => new Date(d).getTime() === dateToCheck.getTime());
          if (isWithdrawn) continue;
        }
        const isWeekend = dateToCheck.getDay() === 0 || dateToCheck.getDay() === 6;
        return { ...leave, isWeekend };
      }
    }
    return null;
  };

  const isCompOffEarnedDay = (day) => {
    if (!compOffs) return false;
    const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    dateToCheck.setHours(0, 0, 0, 0);

    for (let compOff of compOffs) {
      if (compOff.workedDates) {
        const workedDates = typeof compOff.workedDates === 'string' ? JSON.parse(compOff.workedDates) : compOff.workedDates;
        for (let workedDateStr of workedDates) {
          const wd = new Date(workedDateStr);
          if (
            wd.getFullYear() === dateToCheck.getFullYear() &&
            wd.getMonth() === dateToCheck.getMonth() &&
            wd.getDate() === dateToCheck.getDate() &&
            compOff.status === 'approved'
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const calculateSummary = () => {
    let totalWorkingDays = 0;
    let daysPresent = 0;
    let paidLeaveUsed = 0;
    let unpaidLeaveUsed = 0;
    let halfDaysUsed = 0;
    let pendingLeaves = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        totalWorkingDays++;
        const leave = getLeaveForDay(i);
        if (!leave || leave.status === 'rejected') {
          daysPresent++;
        } else if (leave.status === 'approved') {
          if (leave.leave_type.toLowerCase().includes('half')) {
            halfDaysUsed += 0.5;
            daysPresent += 0.5;
            if (leave.leave_type.toLowerCase().includes('unpaid')) unpaidLeaveUsed += 0.5;
            else paidLeaveUsed += 0.5;
          } else {
            if (leave.leave_type.toLowerCase().includes('unpaid')) unpaidLeaveUsed++;
            else paidLeaveUsed++;
          }
        } else if (leave.status === 'pending' || leave.status === 'withdrawal_requested') {
          if (leave.leave_type.toLowerCase().includes('half')) {
            pendingLeaves += 0.5;
            daysPresent += 0.5;
          } else {
            pendingLeaves++;
          }
        }
      }
    }
    
    let compOffsEarned = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      if (isCompOffEarnedDay(i)) {
        compOffsEarned++;
      }
    }

    return { totalWorkingDays, daysPresent, paidLeaveUsed, unpaidLeaveUsed, halfDaysUsed, pendingLeaves, compOffsEarned };
  };

  const calculateLifetimeSummary = () => {
    if (!leaves || !employee) return {
      totalCompOffEarned: 0,
      totalLeaves: 0,
      lifetimeBalance: 0
    };

    // 1. Total Comp Off Earned (from joining date to current date)
    const totalCompOffEarned = compOffs 
      ? compOffs
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + (c.daysGranted || 0), 0)
      : 0;

    // 2. Paid Leaves Used (approved or pending/withdrawal_requested) from joining to current
    const totalPaidLeavesTaken = leaves
      .filter(l => 
        ['approved', 'pending', 'withdrawal_requested'].includes(l.status) &&
        !l.leave_type.toLowerCase().includes('unpaid')
      )
      .reduce((sum, l) => sum + (l.total_days || 0), 0);

    // 3. Unpaid Leaves (LOP) if any from joining date to current date
    const unpaidLeavesLifetime = leaves
      .filter(l => 
        ['approved', 'pending', 'withdrawal_requested'].includes(l.status) &&
        l.leave_type.toLowerCase().includes('unpaid')
      )
      .reduce((sum, l) => sum + (l.total_days || 0), 0);

    // extra leave/extra compoff = total earned compoff - (paid + unpaid leaves)
    const lifetimeBalance = totalCompOffEarned - (totalPaidLeavesTaken + unpaidLeavesLifetime);

    const totalLeaves = totalPaidLeavesTaken + unpaidLeavesLifetime;

    return {
      totalCompOffEarned,
      totalLeaves,
      lifetimeBalance
    };
  };

  const summary = calculateSummary();
  const lifetimeSummary = calculateLifetimeSummary();

  const handleExport = () => {
    let csv = 'Date,Day,Status,Leave Type,Paid/Unpaid\n';
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const formattedDate = date.toLocaleDateString();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      let statusStr = isWeekend ? 'Weekend' : 'Present';
      let leaveTypeStr = 'N/A';
      let paidUnpaid = 'N/A';
      const leave = getLeaveForDay(i);
      if (leave && !isWeekend) {
        statusStr = leave.status === 'approved' ? 'On Leave (Approved)' : 'On Leave (Pending)';
        leaveTypeStr = leave.leave_type;
        paidUnpaid = leave.leave_type.toLowerCase().includes('unpaid') ? 'Unpaid' : 'Paid';
        if (leave.leave_type.toLowerCase().includes('half')) statusStr += ' (Half Day)';
      }
      csv += `"${formattedDate}","${dayName}","${statusStr}","${leaveTypeStr}","${paidUnpaid}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${employee?.full_name?.replace(' ', '_') || 'employee'}_leaves_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (empLoading || leavesLoading || compOffsLoading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
  if (!employee) return <div className="p-8 text-center text-gray-500">Employee not found.</div>;

  return (
    <div className="max-w-7xl mx-auto w-full min-h-[calc(100vh-8rem)] flex flex-col font-sans pb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <button onClick={() => navigate('/hr/dashboard')} className="flex items-center text-gray-500 hover:text-purple-600 transition-colors mb-6 w-fit text-sm">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 lg:mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {employee.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{employee.full_name}</h1>
              <p className="text-sm text-gray-500">{employee.designation}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center text-gray-600 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
              <Mail className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
              {employee.email}
            </div>
            <div className="flex items-center text-gray-600 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
              Joined: {new Date(employee.date_of_joining || employee.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded-lg border border-emerald-100">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
              {employee.verification_status}
            </div>
            <button onClick={handleExport} className="flex items-center px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm ml-auto text-xs font-medium">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export to CSV
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Attendance Calendar</h2>
              <div className="flex items-center gap-4">
                <button onClick={() => changeMonth(-1)} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-semibold text-gray-800 text-lg w-40 text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="p-2 bg-gray-50 text-gray-600 rounded-full hover:bg-gray-100 transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-gray-400 py-1">{day}</div>
              ))}
              
              {calendarDays.map((day, index) => {
                if (!day) return <div key={`empty-${index}`} className="h-20 bg-gray-50/50 rounded-xl border border-transparent" />;
                
                const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const leave = getLeaveForDay(day);
                const isCompOffDay = isCompOffEarnedDay(day);

                let bgColor = isWeekend ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-gray-300';
                let badge = null;

                if (leave && !leave.isWeekend) {
                  if (leave.status === 'approved') {
                    bgColor = 'bg-emerald-50 border-emerald-200';
                    badge = <span className="bg-emerald-500 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm">Approved</span>;
                  } else if (leave.status === 'pending' || leave.status === 'withdrawal_requested') {
                    bgColor = 'bg-amber-50 border-amber-200';
                    badge = <span className="bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm">Pending</span>;
                  } else if (leave.status === 'rejected') {
                    bgColor = 'bg-rose-50 border-rose-200';
                    badge = <span className="bg-rose-500 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm">Rejected</span>;
                  }
                } else if (isCompOffDay) {
                    bgColor = 'bg-blue-50 border-blue-200';
                    badge = <span className="bg-blue-500 text-white text-[9px] font-bold px-1 py-0.5 rounded shadow-sm">Comp-Off</span>;
                }

                return (
                  <div key={day} className={`h-20 p-1.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${bgColor}`}>
                    <div className="flex justify-between items-start">
                      <span className={`font-medium text-xs ${isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>{day}</span>
                    </div>
                    <div className="mt-auto flex flex-col gap-1 items-start">
                      {badge}
                      {leave && leave.leave_type.toLowerCase().includes('half') && !leave.isWeekend && (
                        <span className="bg-purple-100 text-purple-700 text-[9px] uppercase font-bold px-1 rounded truncate w-full text-center">Half</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="h-[400px]">
            <LeaveHistoryTimeline leaves={(leaves || []).filter(l => ['approved', 'rejected', 'pending'].includes(l.status.toLowerCase()))} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Monthly Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-600 font-medium">Total Working Days</span>
                <span className="font-bold text-gray-900 text-base">{summary.totalWorkingDays}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-purple-50 border border-purple-100">
                <span className="text-purple-800 font-medium">Days Present</span>
                <span className="font-bold text-purple-900 text-base">{summary.daysPresent}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-blue-50 border border-blue-100">
                <span className="text-blue-800 font-medium">Comp Off Days</span>
                <span className="font-bold text-blue-900 text-base">{summary.compOffsEarned}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="text-emerald-800 font-medium">Paid Leaves Used</span>
                <span className="font-bold text-emerald-900 text-base">{summary.paidLeaveUsed}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-purple-50/50 border border-purple-100">
                <span className="text-purple-800 font-medium">Half Days Used</span>
                <span className="font-bold text-purple-900 text-base">{summary.halfDaysUsed}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-fit">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex justify-between items-center">
              <span>{lifetimeSummary.lifetimeBalance >= 0 ? "Extra Comp Off" : "Extra Leave"}</span>
              <span className={`px-3 py-1 rounded-full text-base font-bold ${lifetimeSummary.lifetimeBalance >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {Math.abs(lifetimeSummary.lifetimeBalance)}
              </span>
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded-xl bg-red-50/50 border border-red-100">
                <span className="text-red-800 font-medium">Total Leaves Taken</span>
                <span className="font-bold text-red-900 text-base">{lifetimeSummary.totalLeaves}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-xl bg-blue-50/50 border border-blue-100">
                <span className="text-blue-800 font-medium">Total Comp Off Earned</span>
                <span className="font-bold text-blue-900 text-base">{lifetimeSummary.totalCompOffEarned}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

