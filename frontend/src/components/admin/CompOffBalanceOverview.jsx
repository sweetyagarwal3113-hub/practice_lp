import React, { useState } from 'react';
import { useAdminEmployees } from '../../hooks/useAdminEmployees';
import { useCompOffHistory } from '../../hooks/useCompOff';
import { Search, TrendingUp, Users, X, Calendar, PlusCircle } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

export default function CompOffBalanceOverview() {
  const { filteredEmployees, isLoading } = useAdminEmployees();
  const { data: compOffHistory = [] } = useCompOffHistory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState('standard');
  const [actionType, setActionType] = useState('add');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [standardHistory, setStandardHistory] = useState([]);
  const [lopHistory, setLopHistory] = useState([]);
  const [employeeLeaves, setEmployeeLeaves] = useState([]);

  const fetchLopHistory = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lop/history?employeeId=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setLopHistory(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployeeLeaves = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leaves/employee/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setEmployeeLeaves(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    if (selectedEmployee) {
      const token = localStorage.getItem('token');
      
      fetch(`${API_BASE_URL}/api/admin/adjust-balance/history?employeeId=${selectedEmployee.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setStandardHistory(data))
      .catch(console.error);

      fetchLopHistory(selectedEmployee.id);
      fetchEmployeeLeaves(selectedEmployee.id);
    }
  }, [selectedEmployee]);

  const markLopMutation = {
    mutate: async (data, { onSuccess, onError }) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/mark-lop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to mark LOP');
        const result = await res.json();
        
        if (selectedEmployee) fetchLopHistory(selectedEmployee.id);
        if (onSuccess) onSuccess(result);
      } catch (error) {
        if (onError) onError(error);
      }
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustAmount) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const isCompOff = adjustType === 'compoff';
      const endpoint = isCompOff ? '/api/admin/comp-off/grant' : '/api/admin/adjust-balance';
      
      let finalAmount = Math.abs(Number(adjustAmount));
      if (actionType === 'deduct') {
        finalAmount = -finalAmount;
      }
      
      // If it's standard leaves, a deduction in UI implies adding to backend udhaar, so flip sign for standard
      if (adjustType === 'standard') {
          finalAmount = -finalAmount; // deduct UI = + backend, add UI = - backend
      }

      const payload = isCompOff 
        ? { employeeId: selectedEmployee.id, daysGranted: finalAmount, reason: adjustReason || 'Manual Adjustment', workedDates: [] }
        : { employeeId: selectedEmployee.id, amount: finalAmount, reason: adjustReason };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        queryClient.invalidateQueries(['verified_employees']);
        queryClient.invalidateQueries(['comp_off_history']);
        
        setSelectedEmployee(prev => ({
          ...prev,
          available_leaves: isCompOff ? prev.available_leaves : prev.available_leaves + finalAmount,
          comp_off_leaves: isCompOff ? (prev.comp_off_leaves || 0) + finalAmount : prev.comp_off_leaves
        }));

        if (!isCompOff) {
          fetch(`${API_BASE_URL}/api/admin/adjust-balance/history?employeeId=${selectedEmployee.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          .then(res => res.json())
          .then(data => setStandardHistory(data));
        }

        setIsAdjusting(false);
        setAdjustAmount('');
        setAdjustReason('');
      } else {
        alert("Failed to adjust balance");
      }
    } catch (e) {
      console.error(e);
      alert("Error adjusting balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter only employees, not HR/Admins
  const employees = filteredEmployees?.filter(e => e.role === 'employee') || [];
  
  // Apply local search
  const displayed = employees.filter(e => 
    e.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEmployeeCompOffs = (empId) => {
    return compOffHistory.filter(c => c.employeeId === empId);
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col h-[400px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 text-[#7e57c2] rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Employee Balance Overview</h3>
              <p className="text-sm text-gray-500">Quickly check leave balances across the team</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#7e57c2] focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-gray-300" />
                <p className="text-gray-400 text-sm">Loading balances...</p>
              </div>
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              No employees found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map(emp => {
                const totalBal = (emp.comp_off_leaves || 0) + (emp.available_leaves || 0);
                const percentage = Math.min(Math.max((totalBal / (emp.total_leaves || 20)) * 100, 0), 100);
                const isHigh = totalBal > 5;
                const isNegative = totalBal < 0;
                
                return (
                  <div 
                    key={emp.id} 
                    onClick={() => setSelectedEmployee(emp)}
                    className={`p-4 rounded-xl border hover:shadow-md transition-all group cursor-pointer ${isNegative ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-purple-200'}`}
                  >
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-gray-900 group-hover:text-[#7e57c2] transition-colors truncate`}>{emp.full_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{emp.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{emp.designation || 'Employee'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${isNegative ? 'bg-red-100 text-red-700' : isHigh ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-[#7e57c2]'}`}>
                        {totalBal} days
                      </span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Available</span>
                        <span>{emp.total_leaves} Total</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isNegative ? 'bg-red-500' : isHigh ? 'bg-green-500' : 'bg-[#7e57c2]'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="min-w-0 pr-4">
                <h3 className="text-xl font-bold text-gray-900 truncate" title={selectedEmployee.full_name}>{selectedEmployee.full_name}</h3>
                <p className="text-sm text-gray-500 truncate">{selectedEmployee.email}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{selectedEmployee.designation || 'Employee'}</p>
              </div>
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto custom-scrollbar flex-1">
              {(() => {
                const getPaidDays = (leave) => {
                  if (leave.paid_days !== null && leave.paid_days !== undefined) return leave.paid_days;
                  if (!leave.leave_type) return leave.total_days;
                  if (leave.leave_type.includes("Partially Paid")) return 0;
                  const paidMatch = leave.leave_type.match(/(\d+(\.\d+)?)\s*Paid/i);
                  if (paidMatch) return parseFloat(paidMatch[1]);
                  if (leave.leave_type.toLowerCase().includes('unpaid') || leave.leave_type.toLowerCase().includes('lop')) return 0;
                  return leave.total_days;
                };
                const approvedLeaves = employeeLeaves.filter(l => l.status === 'approved');
                const totalPaidLeaves = approvedLeaves.reduce((acc, curr) => acc + getPaidDays(curr), 0);
                const totalUnpaidLeaves = approvedLeaves.reduce((acc, curr) => acc + (curr.total_days - getPaidDays(curr)), 0);

                const totalCompOffsGranted = compOffHistory.filter(c => c.status === 'approved' && c.employeeId === selectedEmployee.id).reduce((acc, curr) => acc + (curr.daysGranted || 0), 0);
                const totalStandardAllocated = selectedEmployee.total_leaves || 0;

                const totalLeavesTaken = totalPaidLeaves + totalUnpaidLeaves;
                const compOffsUsed = Math.min(totalLeavesTaken, totalCompOffsGranted);
                const standardUsed = totalLeavesTaken - compOffsUsed;

                const trueCompOffBalance = totalCompOffsGranted - compOffsUsed;
                const trueStandardBalance = totalStandardAllocated - standardUsed;
                const trueTotalBalance = trueCompOffBalance + trueStandardBalance;

                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={`p-4 rounded-xl flex flex-col justify-center ${trueStandardBalance < 0 ? 'bg-purple-50' : 'bg-blue-50'}`}>
                        <p className={`text-xs font-medium mb-1 ${trueStandardBalance < 0 ? 'text-purple-900' : 'text-blue-900'}`}>
                          {trueStandardBalance < 0 ? 'Leaves Taken (Udhaar)' : 'Standard Leave Balance'}
                        </p>
                        <div className={`text-2xl font-black ${trueStandardBalance < 0 ? 'text-[#7e57c2]' : 'text-blue-700'}`}>
                          {Math.abs(trueStandardBalance)} <span className="text-sm font-medium">days</span>
                        </div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl flex flex-col justify-center">
                        <p className="text-xs font-medium text-green-900 mb-1">Comp-Off Balance</p>
                        <div className="text-2xl font-black text-green-700">
                          {trueCompOffBalance} <span className="text-sm font-medium">days</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl mb-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Total Available Balance</p>
                        <p className="text-xs text-gray-500 mt-0.5">Comp-Offs + Standard Balance</p>
                      </div>
                      <div className="text-xl font-black text-gray-900">
                        {trueTotalBalance} <span className="text-sm font-medium">days</span>
                      </div>
                    </div>

                    {selectedEmployee && (
                      <div className="flex gap-4 mb-6">
                        <div className="flex-1 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-center">
                          <p className="text-xs font-semibold text-emerald-800 mb-1">Approved Paid Leaves</p>
                          <p className="text-lg font-black text-emerald-700">
                            {totalPaidLeaves} <span className="text-sm font-medium">days</span>
                          </p>
                        </div>
                        <div className="flex-1 p-3 bg-red-50 rounded-xl border border-red-100 flex flex-col justify-center">
                          <p className="text-xs font-semibold text-red-800 mb-1">Approved Unpaid (LOP)</p>
                          <p className="text-lg font-black text-red-700">
                            {totalUnpaidLeaves} <span className="text-sm font-medium">days</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}


              {lopHistory.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-red-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-700" />
                    LOP History
                  </h4>
                  <div className="space-y-3">
                    {lopHistory.map((log, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-red-900">{log.action}</p>
                          <p className="text-xs text-red-500 mt-1">Marked on: {new Date(log.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#7e57c2]" />
                Leaves Taken History
              </h4>
              
              <div className="space-y-3 mb-6">
                {standardHistory.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm">
                    No manual adjustments have been made to leaves taken.
                  </div>
                ) : (
                  standardHistory.map(log => (
                    <div key={log.id} className="p-4 border border-gray-100 rounded-xl hover:border-purple-200 transition-colors bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900 text-sm">{log.action.split('. Reason: ')[1] || 'No reason'}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${log.action.includes('by -') ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                          {log.action.match(/by (-?\d+(\.\d+)?)/)?.[1]} days
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Adjusted on: {new Date(log.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-600" />
                Comp-Off Grant History
              </h4>
              
              <div className="space-y-3">
                {getEmployeeCompOffs(selectedEmployee.id).length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm">
                    No comp-offs have been granted to this employee yet.
                  </div>
                ) : (
                  getEmployeeCompOffs(selectedEmployee.id).map(grant => (
                    <div key={grant.id} className="p-4 border border-gray-100 rounded-xl hover:border-green-200 transition-colors bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900 text-sm">{grant.reason}</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                          +{grant.daysGranted} days
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Granted on: {new Date(grant.grantedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      {grant.workedDates && grant.workedDates.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Worked on: {grant.workedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })).join(', ')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="px-6 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
