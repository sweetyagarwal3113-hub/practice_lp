/**
 * Calculates the total leave balance for an employee.
 * Total Balance = Comp-off Leaves + Available (Standard) Leaves
 * 
 * @param {Object} emp - The employee object containing leave balances
 * @returns {number} The total leave balance in days
 */
export const calculateTotalBalance = (emp) => {
  if (!emp) return 0;
  return (emp.comp_off_leaves || 0) + (emp.available_leaves || 0);
};

/**
 * Calculates the number of paid days for a given leave.
 * Extracts information from paid_days if available, otherwise infers from leave_type.
 * 
 * @param {Object} leave - The leave object
 * @returns {number} The number of paid days
 */
export const getPaidDays = (leave) => {
  if (leave.paid_days !== null && leave.paid_days !== undefined) return leave.paid_days;
  if (!leave.leave_type) return leave.total_days;
  if (leave.leave_type.includes("Partially Paid")) return 0;
  const paidMatch = leave.leave_type.match(/(\d+(\.\d+)?)\s*Paid/i);
  if (paidMatch) return parseFloat(paidMatch[1]);
  if (leave.leave_type.toLowerCase().includes("unpaid") || leave.leave_type.toLowerCase().includes("lop")) return 0;
  return leave.total_days;
};

