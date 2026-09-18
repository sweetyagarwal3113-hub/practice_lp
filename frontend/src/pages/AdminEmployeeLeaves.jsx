import React, { useState, useEffect } from 'react';
import { useVerifiedEmployees } from '../hooks/useLeaves';
import { API_BASE_URL } from '../utils/config';
import { useToast } from '../context/ToastContext';
import { Loader2, Calendar, Shield, AlertCircle, Filter } from 'lucide-react';
import { getPaidDays } from '../utils/leaveUtils';

export default function AdminEmployeeLeaves() {
  const { data: employees = [], isLoading: loadingEmployees } = useVerifiedEmployees();
  const toast = useToast();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [partialLeaveConfig, setPartialLeaveConfig] = useState(null);

  // Fetch leaves for the selected employee
  const fetchLeaves = async (employeeId) => {
    setLoadingLeaves(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/leaves/employee/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch leaves');
      const data = await res.json();
      setLeaves(data);
    } catch (err) {
      toast.error('Error fetching leaves: ' + err.message);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchLeaves(selectedEmployeeId);
    } else {
      setLeaves([]);
    }
  }, [selectedEmployeeId]);

  // Set default month to current month on component load
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  }, []);

  const handleAdjustTreatment = async (leaveId, treatment, paidDaysCount = null) => {
    setUpdatingId(leaveId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/leaves/admin/adjust-leave-treatment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ leave_id: leaveId, treatment, paid_days_count: paidDaysCount })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to adjust treatment');
      }

      toast.success('Leave treatment adjusted successfully! 🎉');
      // Refresh leaves list
      await fetchLeaves(selectedEmployeeId);
    } catch (err) {
      toast.error('Error adjusting treatment: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter leaves by selected month
  const filteredLeaves = leaves.filter(leave => {
    if (!selectedMonth) return true;
    const leaveDate = new Date(leave.start_date);
    const leaveYear = leaveDate.getFullYear();
    const leaveMonth = String(leaveDate.getMonth() + 1).padStart(2, '0');
    return `${leaveYear}-${leaveMonth}` === selectedMonth;
  });

  // Extract unique months for filtering dropdown
  const uniqueMonths = Array.from(new Set(leaves.map(leave => {
    const leaveDate = new Date(leave.start_date);
    const year = leaveDate.getFullYear();
    const month = String(leaveDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }))).sort((a, b) => b.localeCompare(a)); // Sort descending

  const handleSavePartial = () => {
    if (partialLeaveConfig) {
      handleAdjustTreatment(partialLeaveConfig.leaveId, 'partial', partialLeaveConfig.currentPaidDays);
      setPartialLeaveConfig(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full min-h-[calc(100vh-8rem)] flex flex-col font-sans pb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header and Employee Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#7e57c2]" /> Employee Leaves & Adjustments
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Employee</label>
            {loadingEmployees ? (
              <div className="flex items-center gap-2 text-gray-500 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-[#7e57c2]" /> Loading employees...
              </div>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7e57c2] focus:border-transparent outline-none bg-white text-sm"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Month selector */}
          {selectedEmployeeId && (
            <div className="animate-in fade-in duration-300">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#7e57c2] focus:border-transparent outline-none bg-white text-sm"
              >
                <option value="">All Months</option>
                {uniqueMonths.map(m => {
                  const [y, mm] = m.split('-');
                  const monthName = new Date(y, parseInt(mm) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <option key={m} value={m}>
                      {monthName}
                    </option>
                  );
                })}
                {/* Always make sure current month is select-able even if no leaves */}
                {!uniqueMonths.includes(selectedMonth) && selectedMonth && (
                  <option value={selectedMonth}>
                    {new Date(selectedMonth.split('-')[0], parseInt(selectedMonth.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Selected Employee Details & Leaves List */}
      {selectedEmployeeId ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-500">
          
          {/* Leaves List */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
              <span>Leaves List</span>
              {selectedMonth && (
                <span className="text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                  {new Date(selectedMonth.split('-')[0], parseInt(selectedMonth.split('-')[1]) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </h2>

            {loadingLeaves ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#7e57c2] mb-3" />
                <p className="text-sm font-medium">Loading leaves data...</p>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50">
                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No leaves found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-semibold">
                      <th className="pb-3 pl-2">Dates</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3 text-center">Duration</th>
                      <th className="pb-3 text-center">Breakdown</th>
                      <th className="pb-3">Reason</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2">Adjustment (LOP Option)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredLeaves.map(leave => {
                      const start = new Date(leave.start_date).toLocaleDateString();
                      const end = new Date(leave.end_date).toLocaleDateString();
                      

                      const calculatedPaidDays = getPaidDays(leave);

                      const isExtraLeave = calculatedPaidDays < leave.total_days || leave.leave_type.toLowerCase().includes('unpaid') || leave.leave_type.toLowerCase().includes('lop');

                      const currentTreatment = leave.leave_type.includes('Partially Paid') ? 'partial' 
                        : (leave.leave_type.toLowerCase().includes('unpaid') || leave.leave_type.toLowerCase().includes('lop')) ? 'unpaid' : 'paid';

                      return (
                        <tr key={leave.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 pl-2 font-medium text-gray-900">
                            {start === end ? start : `${start} - ${end}`}
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${leave.leave_type.toLowerCase().includes('unpaid') || leave.leave_type.toLowerCase().includes('lop') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                              {leave.leave_type}
                            </span>
                          </td>
                          <td className="py-4 text-center font-medium text-gray-800">{leave.total_days} {leave.total_days === 1 ? 'Day' : 'Days'}</td>
                          <td className="py-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 w-20 text-center">
                                {calculatedPaidDays} Paid
                              </span>
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 w-20 text-center">
                                {leave.total_days - calculatedPaidDays} Unpaid
                              </span>
                            </div>
                          </td>
                          <td className="py-4 text-gray-600 max-w-xs truncate" title={leave.reason}>{leave.reason}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : leave.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                              {leave.status}
                            </span>
                          </td>
                          <td className="py-4 pr-2">
                            {leave.status === 'approved' && (
                              <div className="flex items-center gap-2">
                                <select
                                  disabled={updatingId === leave.id}
                                  value={currentTreatment}
                                  onChange={(e) => {
                                    if (e.target.value === 'partial') {
                                      setPartialLeaveConfig({ leaveId: leave.id, totalDays: leave.total_days, currentPaidDays: calculatedPaidDays });
                                    } else {
                                      handleAdjustTreatment(leave.id, e.target.value);
                                    }
                                  }}
                                  className={`px-3 py-1.5 border rounded-lg text-xs font-medium outline-none bg-white cursor-pointer ${isExtraLeave ? 'border-amber-200 bg-amber-50/30 focus:ring-2 focus:ring-amber-500' : 'border-gray-200 focus:ring-2 focus:ring-[#7e57c2]'}`}
                                >
                                  <option value="paid">Paid (Cover by future comp-off)</option>
                                  <option value="partial">Partially Paid (Custom)</option>
                                  <option value="unpaid">Unpaid (Loss of Pay)</option>
                                </select>
                                {updatingId === leave.id && (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7e57c2]" />
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
        </div>
      ) : (
        <div className="flex-1 py-20 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 flex flex-col justify-center items-center">
          <Calendar className="w-12 h-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-gray-700">No Employee Selected</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-sm">Please select an employee from the dropdown above to view and adjust their leave records.</p>
        </div>
      )}

      {/* Partial Payment Modal */}
      {partialLeaveConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Adjust Paid Days</h3>
            <p className="text-sm text-gray-500 mb-6">Specify how many days should be paid out of the total <strong>{partialLeaveConfig.totalDays} days</strong> of leave.</p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Paid Days</label>
              <input 
                type="number" 
                min="0"
                max={partialLeaveConfig.totalDays}
                value={partialLeaveConfig.currentPaidDays ?? 0}
                onChange={(e) => setPartialLeaveConfig(prev => ({ 
                  ...prev, 
                  currentPaidDays: Math.max(0, Math.min(parseInt(e.target.value) || 0, prev.totalDays)) 
                }))}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7e57c2] focus:border-transparent outline-none font-bold text-lg text-gray-900"
              />
            </div>

            <div className="p-4 bg-[#7e57c2]/5 rounded-xl border border-[#7e57c2]/20 mb-6">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-sm text-gray-600 font-medium">Paid Days</span>
                 <span className="text-sm font-bold text-[#7e57c2]">{partialLeaveConfig.currentPaidDays ?? 0} days</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm text-gray-600 font-medium">Unpaid (LOP)</span>
                 <span className="text-sm font-bold text-red-600">{partialLeaveConfig.totalDays - (partialLeaveConfig.currentPaidDays ?? 0)} days</span>
               </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setPartialLeaveConfig(null)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleSavePartial} className="px-5 py-2.5 text-sm font-bold text-white bg-[#7e57c2] hover:bg-[#6c48a8] rounded-xl transition-colors shadow-sm shadow-purple-500/20">
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
