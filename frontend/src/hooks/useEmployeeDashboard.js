import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/config';
import { useMyRequests } from './useLeaves';

export function useEmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const { data: myLeaves = [] } = useMyRequests();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
        console.log("[Frontend Effect] Triggered in useEmployeeDashboard.js");
    if (!user?.id) return;
    
    // Fetch profile
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setProfile(data.user))
      .catch(err => console.error(err));
  }, [user]);

  const stats = useMemo(() => {
    const pending = myLeaves.filter(d => d.status === 'pending' || d.status === 'withdrawal_requested').length;
    const approved = myLeaves.filter(d => d.status === 'approved').length;
    const rejected = myLeaves.filter(d => d.status === 'rejected').length;
    const total_days = myLeaves.filter(d => d.status === 'approved').reduce((acc, curr) => acc + curr.total_days, 0);
    return { pending, approved, rejected, total_days };
  }, [myLeaves]);

  // Derived state for Leave Rules Card
  const joinedDate = profile?.date_of_joining ? new Date(profile.date_of_joining) : new Date(profile?.created_at || Date.now());
  const now = new Date();
  const diffYears = now.getFullYear() - joinedDate.getFullYear();
  const diffMonths = now.getMonth() - joinedDate.getMonth();
  const monthsSinceJoining = (diffYears * 12) + diffMonths;
  const inProbation = monthsSinceJoining < 6;

  // The available leaves balance directly from the DB
  const availablePaid = profile?.available_leaves || 0;
  const compOffLeaves = profile?.comp_off_leaves || 0;
  const totalAvailable = availablePaid + compOffLeaves;
  const daysTakenThisMonth = 0; // Keeping this if used elsewhere in UI

  return {
    stats,
    monthsSinceJoining,
    availablePaid,
    daysTakenThisMonth,
    inProbation,
    firstName: profile?.full_name?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Employee',
    greeting: getGreeting(),
    available_leaves: totalAvailable, // Send total as available_leaves for backward compatibility in some components
    comp_off_leaves: compOffLeaves,
    total_leaves: profile?.total_leaves || 0
  };
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good Morning';
  if (hr < 18) return 'Good Afternoon';
  return 'Good Evening';
}
