import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Activity, 
  Clock, 
  Lock 
} from 'lucide-react';
import { getSubmittedShifts, getActiveShift, getEmployees, validateEmployeePin } from '../firebase';
import PinNumpad from './PinNumpad';

const AnalyticsDashboard = ({ onBack, currentShift, defaultAuthenticated }) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(defaultAuthenticated || false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEntryManagerId, setSelectedEntryManagerId] = useState(null);
  const [entryPinError, setEntryPinError] = useState("");

  // Loading and data states
  const [loading, setLoading] = useState(false);
  const [shiftsDetail, setShiftsDetail] = useState([]);

  // Load managers list on mount
  const loadManagers = useCallback(async () => {
    try {
      const emps = await getEmployees();
      setAllEmployees(emps.filter(e => e.role === 'manager' && e.is_active));
    } catch (err) {
      console.error("Failed to load managers:", err);
    }
  }, []);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  // Handle PIN entry
  const handleEntryPinComplete = async (pin) => {
    setEntryPinError("");
    if (!selectedEntryManagerId) return;

    try {
      const isValid = await validateEmployeePin(selectedEntryManagerId, pin);
      if (isValid) {
        setIsAuthenticated(true);
        setSelectedEntryManagerId(null);
      } else {
        setEntryPinError("Invalid manager PIN code.");
      }
    } catch (err) {
      setEntryPinError("PIN verification error.");
    }
  };

  // Fetch submitted shifts and load details
  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const summaryList = await getSubmittedShifts();
      // Lazy load detailed task-level data for all shifts (Option A)
      const detailedList = await Promise.all(
        summaryList.map(async (s) => {
          const fullShift = await getActiveShift(s.shift_id);
          return fullShift || s; // fallback to summary if full shift fails
        })
      );

      // Append active shift if it exists and is not already in the submitted list
      if (currentShift && currentShift.shift_id) {
        if (!detailedList.some(s => s.shift_id === currentShift.shift_id)) {
          const fullActive = await getActiveShift(currentShift.shift_id);
          if (fullActive) {
            detailedList.push(fullActive);
          }
        }
      }

      setShiftsDetail(detailedList);
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentShift]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalyticsData();
    }
  }, [isAuthenticated, fetchAnalyticsData]);

  // --- Calculations ---

  // Date parsing utility to safely handle Firestore Timestamps and ISO strings
  const parseTime = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    return new Date(val).getTime();
  };

  // 1. Overall Completion Rate
  let totalCompleted = 0;
  let totalTasks = 0;
  shiftsDetail.forEach(s => {
    totalCompleted += s.completed_count || 0;
    totalTasks += s.total_count || 0;
  });
  const overallCompletionRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // 2. Net Till Discrepancy
  let totalTillDiscrepancy = 0;
  shiftsDetail.forEach(s => {
    const amount = Number(s.till_discrepancy_amount || 0);
    if (s.till_status === 'over') {
      totalTillDiscrepancy += amount;
    } else if (s.till_status === 'under') {
      totalTillDiscrepancy -= amount;
    }
  });

  // 3. Shift Streak (consecutive 100% completion shifts, descending chronological order)
  let currentStreak = 0;
  const chronShifts = [...shiftsDetail].sort((a, b) => {
    const timeA = new Date(a.date + 'T' + (a.shift_type === 'closing' ? '23:00' : '12:00'));
    const timeB = new Date(b.date + 'T' + (b.shift_type === 'closing' ? '23:00' : '12:00'));
    return timeB - timeA;
  });
  for (const s of chronShifts) {
    const rate = s.total_count > 0 ? (s.completed_count / s.total_count) : 0;
    if (rate === 1 && s.status !== 'missed_cleanup') {
      currentStreak++;
    } else {
      break; // broken streak
    }
  }

  // 4. Top Performers (Tally tasks completed_by_name)
  const performerTally = {};
  shiftsDetail.forEach(s => {
    if (s.tasks) {
      Object.values(s.tasks).forEach(t => {
        if (t.is_completed && t.completed_by_name) {
          performerTally[t.completed_by_name] = (performerTally[t.completed_by_name] || 0) + 1;
        }
      });
    }
  });
  const topPerformers = Object.entries(performerTally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Most Missed Chores
  const missedTally = {};
  shiftsDetail.forEach(s => {
    if (s.tasks) {
      Object.values(s.tasks).forEach(t => {
        if (t.missed || (!t.is_completed && s.status === 'missed_cleanup')) {
          missedTally[t.task_name] = (missedTally[t.task_name] || 0) + 1;
        }
      });
    }
  });
  const mostMissedChores = Object.entries(missedTally)
    .map(([task_name, count]) => ({ task_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 6. Shift Type Breakdown
  const openingShifts = shiftsDetail.filter(s => s.shift_type === 'opening');
  const closingShifts = shiftsDetail.filter(s => s.shift_type === 'closing');

  // 7. Chore Completion Durations & Running Averages
  const taskDurations = {}; // { [task_name]: [duration1, duration2, ...] }
  shiftsDetail.forEach(s => {
    const shiftInit = parseTime(s.initialized_at);
    if (!shiftInit || !s.tasks) return;
    Object.values(s.tasks).forEach(t => {
      if (t.is_completed && t.timestamp) {
        const taskDone = parseTime(t.timestamp);
        if (taskDone && taskDone >= shiftInit) {
          const durationMins = (taskDone - shiftInit) / (60 * 1000);
          if (!taskDurations[t.task_name]) {
            taskDurations[t.task_name] = [];
          }
          taskDurations[t.task_name].push(durationMins);
        }
      }
    });
  });

  const taskAverages = {}; // { [task_name]: avg_mins }
  Object.entries(taskDurations).forEach(([name, durations]) => {
    const sum = durations.reduce((a, b) => a + b, 0);
    taskAverages[name] = sum / durations.length;
  });

  // 8. Auditing Speedy Completions
  const speedyAlerts = [];
  shiftsDetail.forEach(s => {
    const shiftInit = parseTime(s.initialized_at);
    if (!shiftInit || !s.tasks) return;
    Object.values(s.tasks).forEach(t => {
      if (t.is_completed && t.timestamp && t.completed_by_name) {
        const taskDone = parseTime(t.timestamp);
        const avg = taskAverages[t.task_name];
        if (taskDone && avg && avg >= 3) { // running average must be >= 3 minutes
          const taken = (taskDone - shiftInit) / (60 * 1000);
          // Flag if taken < 40% of average and the raw difference is at least 2 minutes
          if (taken < (0.4 * avg) && (avg - taken) >= 2) {
            speedyAlerts.push({
              task_name: t.task_name,
              completed_by_name: t.completed_by_name,
              taken_mins: Math.round(taken * 10) / 10,
              avg_mins: Math.round(avg * 10) / 10,
              date: s.date,
              shift_type: s.shift_type,
              shift_id: s.shift_id
            });
          }
        }
      }
    });
  });
  speedyAlerts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 9. Missing Shift Checklist Tracking (past 30 days excluding today)
  const missingShifts = [];
  const todayVal = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(todayVal);
    d.setDate(todayVal.getDate() - i);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const hasOpening = shiftsDetail.some(s => s.date === dateString && s.shift_type === 'opening');
    const hasClosing = shiftsDetail.some(s => s.date === dateString && s.shift_type === 'closing');
    
    if (!hasOpening || !hasClosing) {
      let missingLabel = "";
      if (!hasOpening && !hasClosing) {
        missingLabel = "Both Opening & Closing";
      } else if (!hasOpening) {
        missingLabel = "Opening Shift";
      } else {
        missingLabel = "Closing Shift";
      }
      missingShifts.push({
        date: dateString,
        missing: missingLabel
      });
    }
  }
  missingShifts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // --- RENDERING AUTH GATE ---
  if (!isAuthenticated) {
    return (
      <div className="glass-panel max-w-md mx-auto w-full text-center p-8 animate-fade-in" style={{ marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: '50%' }}>
            <Lock size={32} />
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Manager Verification Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Please verify your manager authorization PIN code to access operations analytics.
        </p>

        {selectedEntryManagerId === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allEmployees.length === 0 ? (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
                No active managers registered.
              </p>
            ) : (
              allEmployees.map(mgr => (
                <button
                  key={mgr.employee_id}
                  type="button"
                  className="btn btn-secondary w-full"
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}
                  onClick={() => setSelectedEntryManagerId(mgr.employee_id)}
                >
                  <span>{mgr.employee_name}</span>
                  <span className="badge badge-pending" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                    Manager
                  </span>
                </button>
              ))
            )}
            <button
              type="button"
              className="btn btn-danger"
              style={{ marginTop: '16px' }}
              onClick={onBack}
            >
              Cancel
            </button>
          </div>
        ) : (
          <PinNumpad
            title={`Enter PIN for ${allEmployees.find(m => m.employee_id === selectedEntryManagerId)?.employee_name}`}
            onPinComplete={handleEntryPinComplete}
            onCancel={() => setSelectedEntryManagerId(null)}
            error={entryPinError}
          />
        )}
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Dashboard Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onBack}
            style={{ padding: '8px 12px', borderRadius: '50%' }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
              Manager Operations Analytics
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Aggregated statistics across all historical submitted shift checklists.
            </p>
          </div>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={fetchAnalyticsData}
          disabled={loading}
          style={{ fontSize: '0.85rem', padding: '8px 16px' }}
        >
          Refresh Data
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compiling statistics from shifts ledger...</span>
        </div>
      ) : shiftsDetail.length === 0 ? (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Activity size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', margin: '0 auto' }} />
          <h3>No Data Available</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '6px' }}>
            There are no submitted shift records in history to compile analytics from yet.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stat Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Card 1: Completion Rate */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', borderRadius: '12px' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Chore Completion</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{overallCompletionRate}%</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Avg. completion rate
                </span>
              </div>
            </div>

            {/* Card 2: Till Discrepancies */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                padding: '12px', 
                background: totalTillDiscrepancy === 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                color: totalTillDiscrepancy === 0 ? 'var(--accent-green)' : 'var(--accent-red)', 
                borderRadius: '12px' 
              }}>
                <DollarSign size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Till Discrepancy</span>
                <span style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 700, 
                  color: totalTillDiscrepancy === 0 ? 'var(--text-primary)' : totalTillDiscrepancy < 0 ? 'var(--accent-red)' : 'var(--accent-green)' 
                }}>
                  {totalTillDiscrepancy >= 0 ? `+$${totalTillDiscrepancy.toFixed(2)}` : `-$${Math.abs(totalTillDiscrepancy).toFixed(2)}`}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Net cash imbalance
                </span>
              </div>
            </div>

            {/* Card 3: Shift Streak */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--accent-amber)', borderRadius: '12px' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Perfect Streak</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentStreak} Shifts</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  Consecutive 100% completions
                </span>
              </div>
            </div>

            {/* Card 4: Shift Totals */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--accent-green)', borderRadius: '12px' }}>
                <Calendar size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Total Checklists</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{shiftsDetail.length} Shifts</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  {openingShifts.length} Openings / {closingShifts.length} Closings
                </span>
              </div>
            </div>
          </div>

          {/* Leaders and Missed Chores Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Leaderboard Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <Award size={20} style={{ color: 'var(--primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Top Performers</h3>
              </div>
              {topPerformers.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                  No chore completions tracked yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topPerformers.map((perf, idx) => (
                    <div 
                      key={perf.name} 
                      className="member-item" 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.3)', 
                        padding: '12px', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '50%', 
                          background: idx === 0 ? 'var(--primary)' : 'rgba(79, 70, 229, 0.1)', 
                          color: idx === 0 ? '#ffffff' : 'var(--primary)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700, 
                          fontSize: '0.85rem' 
                        }}>
                          {perf.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{perf.name}</span>
                      </div>
                      <span className="badge badge-submitted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {perf.count} Chores
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Missed Chores Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--accent-red)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Most Missed Chores</h3>
              </div>
              {mostMissedChores.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                  No chores have been missed in cleanup. Great job!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {mostMissedChores.map((chore) => (
                    <div 
                      key={chore.task_name} 
                      className="member-item" 
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.3)', 
                        padding: '12px', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center' 
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chore.task_name}
                      </span>
                      <span className="badge badge-missed" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        Missed {chore.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Speed Audit & Missing Reports Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Chore Speed Audits Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <Clock size={20} style={{ color: 'var(--accent-amber)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Chore Speed Audits</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Flags chores completed in less than 40% of their historical average time (minimum 3 mins average).
              </p>
              {speedyAlerts.length === 0 ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                  <p style={{ color: 'var(--accent-green)', fontSize: '0.85rem', textAlign: 'center', fontWeight: 500 }}>
                    ✅ All completions align with expected durations.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '300px' }}>
                  {speedyAlerts.map((alert, idx) => (
                    <div 
                      key={idx} 
                      className="member-item animate-fade-in" 
                      style={{ 
                        background: 'rgba(239, 68, 68, 0.04)', 
                        borderColor: 'rgba(239, 68, 68, 0.15)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {alert.task_name}
                        </span>
                        <span className="badge badge-missed" style={{ fontSize: '0.65rem', background: 'var(--accent-red-glow)', color: 'var(--accent-red)' }}>
                          Speed Warning
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>Completed by: <strong>{alert.completed_by_name}</strong></span>
                        <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                          {alert.taken_mins}m <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(Avg: {alert.avg_mins}m)</span>
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {alert.date} ({alert.shift_type.toUpperCase()})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Shift Checklists Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                <AlertTriangle size={20} style={{ color: 'var(--accent-red)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Missing Reports (Last 30 Days)</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Identifies calendar days where opening or closing checklists were never initialized.
              </p>
              {missingShifts.length === 0 ? (
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '120px' }}>
                  <p style={{ color: 'var(--accent-green)', fontSize: '0.85rem', textAlign: 'center', fontWeight: 500 }}>
                    ✅ All expected checklists generated in the last 30 days.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '300px' }}>
                  {missingShifts.map((m, idx) => (
                    <div 
                      key={idx} 
                      className="member-item animate-fade-in" 
                      style={{ 
                        background: 'rgba(245, 158, 11, 0.04)', 
                        borderColor: 'rgba(245, 158, 11, 0.15)',
                        padding: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                          {m.date}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          No reports generated
                        </span>
                      </div>
                      <span className="badge badge-missed" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {m.missing}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Till Discrepancy Log Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <Activity size={20} style={{ color: 'var(--text-secondary)' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Till Discrepancy Log</h3>
            </div>
            
            {closingShifts.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                No closing shift report history recorded.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Shift Date</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Till Status</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Amount</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>Sealed Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closingShifts.map((s) => {
                      const amount = Number(s.till_discrepancy_amount || 0);
                      
                      return (
                        <tr key={s.shift_id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.date}</td>
                          <td style={{ padding: '12px 8px' }}>
                            <span className={`badge ${s.till_status === 'balanced' ? 'badge-submitted' : 'badge-missed'}`} style={{ textTransform: 'capitalize' }}>
                              {s.till_status || 'N/A'}
                            </span>
                          </td>
                          <td style={{ 
                            padding: '12px 8px', 
                            fontWeight: 700, 
                            color: s.till_status === 'balanced' ? 'var(--text-primary)' : s.till_status === 'over' ? 'var(--accent-amber)' : 'var(--accent-red)'
                          }}>
                            {s.till_status === 'balanced' ? '$0.00' : s.till_status === 'over' ? `+$${amount.toFixed(2)}` : `-$${amount.toFixed(2)}`}
                          </td>
                          <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                            {s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Auto-archived'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default AnalyticsDashboard;
