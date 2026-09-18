import { useState } from 'react';
import { Users, Mail, Calendar, ShieldCheck, Loader2, Search, Trash2, Filter, AlertTriangle, X, Edit, Phone, UserCog } from 'lucide-react';
import { useManagers } from '../../hooks/useLeaves';
import { useAuth } from '../../context/AuthContext';
import { calculateTotalBalance } from '../../utils/leaveUtils';

// Replaced inline style array with Tailwind classes per requirements
const AVATAR_COLORS = [
  'bg-[#7e57c2]',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-purple-500'
];

export default function EmployeeTable({ filteredEmployees, isLoading, search, setSearch, department, setDepartment, onDelete, onUpdate, onRowClick, readOnly }) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // For details modal
  const [employeeToEdit, setEmployeeToEdit] = useState(null); // For edit modal
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    designation: '',
    phone: '',
    date_of_joining: '',
    probation_date: '',
    probation_same_as_joining: false,
    toggle_manager: false
  });
  const { data: managers = [] } = useManagers();
  const { user } = useAuth();

  const handleEditClick = (emp) => {
    console.log("[Frontend Component] Rendering handleEditClick in EmployeeTable.jsx");
    setEmployeeToEdit(emp);
    const isSame = emp.probation_date && emp.date_of_joining && 
                   new Date(emp.probation_date).toISOString().split('T')[0] === new Date(emp.date_of_joining).toISOString().split('T')[0];
    setEditFormData({
      full_name: emp.full_name || '',
      email: emp.email || '',
      designation: emp.designation || '',
      phone: emp.phone || '',
      toggle_manager: emp.managers?.some(m => m.id === user?.id) || false,
      date_of_joining: emp.date_of_joining ? new Date(emp.date_of_joining).toISOString().split('T')[0] : '',
      probation_date: emp.probation_date ? new Date(emp.probation_date).toISOString().split('T')[0] : '',
      probation_same_as_joining: isSame || (!emp.probation_date && emp.date_of_joining ? true : false)
    });
  };

  const handleEditSubmit = async (e) => {
    console.log("[Frontend Async] Executing handleEditSubmit in EmployeeTable.jsx");
    e.preventDefault();
    if (onUpdate && employeeToEdit) {
      await onUpdate({ id: employeeToEdit.id, data: editFormData });
      setEmployeeToEdit(null);
    }
  };

  const handleDeleteClick = (emp) => {
    console.log("[Frontend Component] Rendering handleDeleteClick in EmployeeTable.jsx");
    setEmployeeToDelete(emp);
    setShowConfirmModal(true);
  };

  const confirmDeletion = () => {
    console.log("[Frontend Component] Rendering confirmDeletion in EmployeeTable.jsx");
    if (employeeToDelete && onDelete) {
      onDelete(employeeToDelete.id);
      setEmployeeToDelete(null);
      setShowConfirmModal(false);
    }
  };
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#9b72e5] w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden min-h-[400px]">
      
      <div className="p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between gap-4 items-center">
        
        {/* Left Side: Search */}
        <div className="relative w-full flex-1 max-w-2xl">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search employees by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#9b72e5] focus:border-transparent outline-none transition-all shadow-sm"
          />
        </div>

        {/* Right Side: Delete & Filter */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-56">
            <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 appearance-none border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#9b72e5] focus:border-transparent outline-none transition-all shadow-sm bg-white"
            >
              <option value="All">All Departments</option>
              <option value="Appian Developer">Appian Developer</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-auto flex-1">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[#9b72e5]" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">No employees found</p>
            <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
              {search ? 'Try adjusting your search query.' : 'There are no verified employees yet.'}
            </p>
          </div>
        ) : (
          <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-base text-left">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm">Employee</th>
              <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm">Contact</th>
              <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm">Department</th>
              <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm">Joined Date</th>
              <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm text-center">Leave Balance</th>
              <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm">Status</th>
              {!readOnly && <th className="px-4 py-4 font-semibold text-gray-600 uppercase tracking-wide text-sm text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredEmployees.map((emp, i) => (
              <tr key={emp.id} className="hover:bg-purple-50/50 transition-colors group">
                <td className="px-4 py-4">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onRowClick ? onRowClick(emp) : setSelectedEmployee(emp)}
                    title="Click to view details"
                  >
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 group-hover:scale-110 transition-transform duration-300 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                    >
                      {(emp.full_name || emp.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-base group-hover:text-[#7e57c2] transition-colors truncate">{emp.full_name || 'No Name'}</p>
                      <p className="text-xs text-gray-500 hover:underline cursor-pointer">View details</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 whitespace-nowrap">
                    {emp.designation || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-4 text-gray-500 text-sm whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(emp.date_of_joining || emp.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    {emp.probation_date && (
                      <span className="text-xs text-[#7e57c2] font-semibold ml-6">
                        Probation: {new Date(emp.probation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center whitespace-nowrap">
                  <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-[#7e57c2] border border-purple-200 shadow-sm">
                    {calculateTotalBalance(emp)} Days
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-4 h-4" /> Verified
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 transition-opacity">
                      <button
                        onClick={() => handleEditClick(emp)}
                        className="p-2 text-gray-400 hover:text-[#7e57c2] hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit Employee"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(emp)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove Employee"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          </table>
        </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filteredEmployees.map((emp, i) => (
              <div key={emp.id} className="p-4 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => onRowClick ? onRowClick(emp) : setSelectedEmployee(emp)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                      {(emp.full_name || emp.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{emp.full_name || 'No Name'}</h4>
                      <p className="text-xs text-gray-500">{emp.designation || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-[#7e57c2] border border-purple-200">
                    {calculateTotalBalance(emp)} Days
                  </div>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 shrink-0 text-gray-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
                        {new Date(emp.date_of_joining || emp.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      {emp.probation_date && (
                        <span className="text-xs text-[#7e57c2] font-semibold ml-6">
                          Probation: {new Date(emp.probation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  </div>
                </div>
                {!readOnly && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={() => handleEditClick(emp)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDeleteClick(emp)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Remove Employee(s)</h3>
                    <p className="text-sm text-gray-500 mt-1">This action cannot be undone.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl mb-6 border border-gray-100">
                <p className="text-gray-700 text-sm">
                  Are you sure you want to permanently remove <span className="font-bold text-gray-900">{employeeToDelete?.full_name}</span> from the directory? All their associated data, including leave history, will be deleted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletion}
                  className="px-5 py-2.5 rounded-xl font-medium bg-red-500 hover:bg-red-600 text-white transition-colors text-sm flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 relative">
              <button 
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center mt-2 mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-4 bg-[#7e57c2]">
                  {(selectedEmployee.full_name || selectedEmployee.email).charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedEmployee.full_name || 'No Name'}</h3>
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium mt-2">{selectedEmployee.designation || 'N/A'}</span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium">{selectedEmployee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium">{selectedEmployee.phone || 'Phone number not provided'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <UserCog className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium">Reports to: {selectedEmployee.parent?.full_name || 'No Manager Assigned'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium">Joined {new Date(selectedEmployee.date_of_joining || selectedEmployee.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {selectedEmployee.probation_date && (
                  <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <Calendar className="w-5 h-5 text-purple-400 shrink-0" />
                    <span className="text-sm font-medium">Probation Date: {new Date(selectedEmployee.probation_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-sm font-medium text-emerald-700 capitalize">Status: {selectedEmployee.verification_status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {employeeToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                    <Edit className="w-5 h-5 text-[#7e57c2]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Employee</h3>
                    <p className="text-sm text-gray-500 mt-1">Update profile details below.</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setEmployeeToEdit(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.full_name} 
                    onChange={e => setEditFormData({...editFormData, full_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={editFormData.email} 
                    onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department / Designation</label>
                  <select 
                    value={editFormData.designation} 
                    onChange={e => setEditFormData({...editFormData, designation: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow bg-white"
                  >
                    <option value="">Select Department</option>
                    <option value="Appian Developer">Appian Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                {user?.role === 'admin' && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label className="flex items-center space-x-3 cursor-pointer mb-2">
                      <input 
                        type="checkbox"
                        checked={editFormData.toggle_manager}
                        onChange={e => setEditFormData({...editFormData, toggle_manager: e.target.checked})}
                        className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm font-medium text-gray-800">Assign me as Reporting Manager</span>
                    </label>
                    <div className="text-xs text-gray-500 ml-8">
                      {employeeToEdit?.managers?.length > 0 
                        ? `Currently managed by: ${employeeToEdit.managers.map(m => m.full_name).join(', ')}` 
                        : "Currently has no managers."}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={editFormData.phone} 
                    onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Joining</label>
                  <input 
                    type="date" 
                    value={editFormData.date_of_joining} 
                    onChange={e => {
                      const newJoin = e.target.value;
                      setEditFormData(prev => ({
                        ...prev,
                        date_of_joining: newJoin,
                        probation_date: prev.probation_same_as_joining ? newJoin : prev.probation_date
                      }));
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow"
                  />
                </div>

                <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editFormData.probation_same_as_joining}
                      onChange={e => {
                        const checked = e.target.checked;
                        setEditFormData(prev => ({
                          ...prev,
                          probation_same_as_joining: checked,
                          probation_date: checked ? prev.date_of_joining : prev.probation_date
                        }));
                      }}
                      className="w-5 h-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-800">Probation Date same as Date of Joining</span>
                  </label>
                  
                  {!editFormData.probation_same_as_joining && (
                    <div className="animate-in fade-in duration-200">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Probation Date</label>
                      <input 
                        type="date" 
                        required={!editFormData.probation_same_as_joining}
                        value={editFormData.probation_date} 
                        onChange={e => setEditFormData({...editFormData, probation_date: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-shadow"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEmployeeToEdit(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-medium bg-purple-500 hover:bg-[#7e57c2] text-white transition-colors text-sm flex items-center gap-2 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
