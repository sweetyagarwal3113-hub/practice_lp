import { describe, it, expect } from 'vitest';
import { calculateTotalBalance } from './leaveUtils';

describe('calculateTotalBalance', () => {
  it('should return the sum of comp_off_leaves and available_leaves', () => {
    const emp = { comp_off_leaves: 5, available_leaves: 10 };
    expect(calculateTotalBalance(emp)).toBe(15);
  });

  it('should handle missing available_leaves (default to 0)', () => {
    const emp = { comp_off_leaves: 5 };
    expect(calculateTotalBalance(emp)).toBe(5);
  });

  it('should handle missing comp_off_leaves (default to 0)', () => {
    const emp = { available_leaves: 3 };
    expect(calculateTotalBalance(emp)).toBe(3);
  });

  it('should handle null or undefined employee gracefully', () => {
    expect(calculateTotalBalance(null)).toBe(0);
    expect(calculateTotalBalance(undefined)).toBe(0);
  });

  it('should handle negative balances correctly', () => {
    const emp = { comp_off_leaves: 2, available_leaves: -5 };
    expect(calculateTotalBalance(emp)).toBe(-3);
  });
});

describe("getPaidDays", () => {
  const { getPaidDays } = require("./leaveUtils"); // Or import it if ES module, but this is a test block

  it("should return paid_days if it is defined", () => {
    expect(getPaidDays({ paid_days: 3, total_days: 5 })).toBe(3);
    expect(getPaidDays({ paid_days: 0, total_days: 5 })).toBe(0);
  });

  it("should return total_days if leave_type is missing", () => {
    expect(getPaidDays({ total_days: 4 })).toBe(4);
  });

  it("should return 0 if leave_type includes Partially Paid", () => {
    expect(getPaidDays({ leave_type: "Partially Paid", total_days: 5 })).toBe(0);
  });

  it("should extract number from leave_type if it matches Paid regex", () => {
    expect(getPaidDays({ leave_type: "2 Paid", total_days: 5 })).toBe(2);
    expect(getPaidDays({ leave_type: "1.5 Paid", total_days: 5 })).toBe(1.5);
  });

  it("should return 0 if leave_type includes unpaid or lop", () => {
    expect(getPaidDays({ leave_type: "unpaid", total_days: 5 })).toBe(0);
    expect(getPaidDays({ leave_type: "LOP", total_days: 5 })).toBe(0);
  });

  it("should return total_days as fallback", () => {
    expect(getPaidDays({ leave_type: "Sick Leave", total_days: 2 })).toBe(2);
  });
});

