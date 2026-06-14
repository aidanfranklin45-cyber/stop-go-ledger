import { useState, useEffect, useCallback } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  Clock, 
  Users, 
  Plus, 
  RotateCcw,
  ShieldCheck,
  Server,
  AlertTriangle
} from 'lucide-react';
import {
  getEmployees,
  validateEmployeePin,
  getActiveShift,
  startShift,
  updateTask,
  submitShiftSignatures,
  sendDiscordNotification,
  simulateDailyCleanup,
  isLiveMode,
  getFirebaseConfig,
  clearFirebaseConfig,
  saveFirebaseConfig,
  updateShiftRoster,
  updateShiftStatus,
  seedTestScenario,
  sendDiscordShiftStarted,
  sendDiscordShiftArchived
} from './firebase';

import PinNumpad from './components/PinNumpad';
import RosterSidebar from './components/RosterSidebar';
import ChoreLedger from './components/ChoreLedger';
import VerificationScreen from './components/VerificationScreen';
import DevControlPanel from './components/DevControlPanel';
import HistoryViewer from './components/HistoryViewer';
import ChoreManager from './components/ChoreManager';
import StaffManager from './components/StaffManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import SlowChoresManager from './components/SlowChoresManager';

function App() {
  // --- UI & Panel states ---
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [appError, setAppError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard');

  // --- Database state ---
  const [isLive, setIsLive] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  
  // --- Shift state ---
  const [currentShift, setCurrentShift] = useState(null); // Full shift document from db
  const [selectedOperatorId, setSelectedOperatorId] = useState(() => {
    return localStorage.getItem('stop_go_selected_operator_id') || null;
  });

  // --- State 01: Setup Roster state ---
  const [initTeamPids, setInitTeamPids] = useState([]);
  const [selectedInitEmployee, setSelectedInitEmployee] = useState(null);
  const [initShiftType, setInitShiftType] = useState('opening');
  const [initDate, setInitDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Load backend configuration & initial metadata
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const liveStatus = isLiveMode();
      setIsLive(liveStatus);
      
      const employees = await getEmployees();
      setAllEmployees(employees);

      // Check if a shift is already active in local storage / db for today
      // Default to checking for today's opening/closing shifts
      const today = initDate;
      let shift = await getActiveShift(`${today}_${initShiftType}`);
      if (!shift) {
        // Look for any open/pending shift
        const openingShift = await getActiveShift(`${today}_opening`);
        const closingShift = await getActiveShift(`${today}_closing`);
        
        if (openingShift && openingShift.status !== 'submitted') {
          shift = openingShift;
        } else if (closingShift && closingShift.status !== 'submitted') {
          shift = closingShift;
        }
      }
      
      if (shift) {
        setCurrentShift(shift);
        const storedId = localStorage.getItem('stop_go_selected_operator_id');
        if (shift.active_team_pids && shift.active_team_pids.length > 0) {
          if (!storedId || !shift.active_team_pids.includes(storedId)) {
            const firstId = shift.active_team_pids[0];
            setSelectedOperatorId(firstId);
            localStorage.setItem('stop_go_selected_operator_id', firstId);
          } else {
            setSelectedOperatorId(storedId);
          }
        }
      } else {
        setCurrentShift(null);
      }
    } catch (err) {
      console.error(err);
      setAppError("Failed to connect to data service.");
    } finally {
      setLoading(false);
    }
  }, [initDate, initShiftType]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      // Defer state update to next tick to avoid set-state-in-effect warning
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadInitialData();
      }
    };
    fetchData();
    return () => { active = false; };
  }, [loadInitialData]);

  // Handle live Firestore connection state updates
  const handleSaveFirebaseConfig = async (config) => {
    setLoading(true);
    const success = await saveFirebaseConfig(config);
    if (success) {
      setIsLive(true);
      setAppError(null);
      await loadInitialData();
    } else {
      setIsLive(false);
      setAppError("Invalid Firebase configuration coordinates.");
    }
    setLoading(false);
  };

  const handleClearFirebaseConfig = async () => {
    setLoading(true);
    clearFirebaseConfig();
    setIsLive(false);
    await loadInitialData();
    setLoading(false);
  };

  // --- State 01 Operations ---
  const handleSelectEmployeeForInit = (emp) => {
    setAppError(null);
    if (initTeamPids.includes(emp.employee_id)) {
      // Toggle off directly if already in team
      setInitTeamPids(prev => prev.filter(pid => pid !== emp.employee_id));
    } else {
      // Prompt for PIN to add
      setSelectedInitEmployee(emp);
    }
  };

  const handleInitEmployeePinComplete = async (pin) => {
    if (!selectedInitEmployee) return;
    const isValid = await validateEmployeePin(selectedInitEmployee.employee_id, pin);
    if (isValid) {
      setInitTeamPids(prev => [...prev, selectedInitEmployee.employee_id]);
      setSelectedInitEmployee(null);
      setAppError(null);
    } else {
      setAppError(`Incorrect PIN code for ${selectedInitEmployee.employee_name}.`);
    }
  };

  const handleStartShift = async () => {
    if (initTeamPids.length === 0) {
      setAppError("At least one checked-in employee is required to start a shift.");
      return;
    }

    // Check if the selected date matches today's date
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (initDate !== todayStr) {
      setAppError(`You can only start checklists for the current day (${todayStr}).`);
      return;
    }

    setLoading(true);
    try {
      const shiftId = `${initDate}_${initShiftType}`;
      
      // Check if shift already exists
      const existing = await getActiveShift(shiftId);
      if (existing) {
        if (existing.status === 'submitted' || existing.status === 'missed_cleanup') {
          setAppError(`A ${initShiftType} shift checklist has already been submitted and sealed for ${initDate}. Only one opening and one closing checklist are allowed per day.`);
          setLoading(false);
          return;
        } else {
          // If it is open/pending, just resume it
          setCurrentShift(existing);
          if (!selectedOperatorId || !existing.active_team_pids.includes(selectedOperatorId)) {
            const firstId = existing.active_team_pids[0];
            setSelectedOperatorId(firstId);
            localStorage.setItem('stop_go_selected_operator_id', firstId);
          }
          setAppError(null);
          setLoading(false);
          return;
        }
      }

      const shift = await startShift(shiftId, initShiftType, initDate, initTeamPids);
      setCurrentShift(shift);
      // Automatically select the first checked-in operator if none is selected or not in team
      if (!selectedOperatorId || !initTeamPids.includes(selectedOperatorId)) {
        const firstId = initTeamPids[0];
        setSelectedOperatorId(firstId);
        localStorage.setItem('stop_go_selected_operator_id', firstId);
      }
      setAppError(null);

      // Webhook notification for shift start
      const webhookUrl = localStorage.getItem('stop_go_discord_webhook_url');
      if (webhookUrl) {
        await sendDiscordShiftStarted(shift, webhookUrl);
      }
    } catch (err) {
      console.error(err);
      setAppError("Could not initialize shift session.");
    } finally {
      setLoading(false);
    }
  };

  // --- State 02 Operations ---
  const handleTaskToggle = async (taskId, isCompleted, employeeId = null, employeeName = null) => {
    if (!currentShift) return;
    try {
      const updated = await updateTask(
        currentShift.shift_id,
        taskId,
        isCompleted,
        employeeId,
        employeeName
      );
      if (updated) {
        setCurrentShift(updated);
      }
    } catch (err) {
      console.error(err);
      setAppError("Failed to update task completion.");
    }
  };

  const handleAddMemberToActiveRoster = async (empId, pin) => {
    if (!currentShift) return false;
    const isValid = await validateEmployeePin(empId, pin);
    if (isValid) {
      const newPids = [...currentShift.active_team_pids, empId];
      const updated = await updateShiftRoster(currentShift.shift_id, newPids);
      if (updated) {
        setCurrentShift(updated);
        // If no operator is selected, select the new member
        if (!selectedOperatorId) {
          setSelectedOperatorId(empId);
          localStorage.setItem('stop_go_selected_operator_id', empId);
        }
      }
      setAppError(null);
      return true;
    } else {
      return false;
    }
  };

  const handleRemoveMemberFromActiveRoster = async (empId) => {
    if (!currentShift) return;
    if (currentShift.active_team_pids.length <= 1) {
      setAppError("Active shifts must retain at least one checked-in employee.");
      return;
    }
    try {
      const newPids = currentShift.active_team_pids.filter(pid => pid !== empId);
      const updated = await updateShiftRoster(currentShift.shift_id, newPids);
      if (updated) {
        setCurrentShift(updated);
        // If the removed member was selected, default to the first remaining member
        if (selectedOperatorId === empId) {
          const fallbackId = newPids[0];
          setSelectedOperatorId(fallbackId);
          localStorage.setItem('stop_go_selected_operator_id', fallbackId);
        }
      }
      setAppError(null);
    } catch (err) {
      console.error(err);
      setAppError("Failed to update roster card lists.");
    }
  };

  // --- State 03 Operations ---
  const handleVerifySignatures = async (signatures, tillReport = null) => {
    if (!currentShift) return;
    setLoading(true);
    try {
      const updated = await submitShiftSignatures(currentShift.shift_id, signatures, tillReport);
      if (updated) {
        setCurrentShift(updated);
        const webhookUrl = localStorage.getItem('stop_go_discord_webhook_url');
        if (webhookUrl) {
          await sendDiscordNotification(updated, webhookUrl);
        }
      }
    } catch (err) {
      console.error(err);
      setAppError("Failed to finalize shift signatures.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetShift = () => {
    setCurrentShift(null);
    setInitTeamPids([]);
    setAppError(null);
  };

  // --- Cron Cleanup trigger ---
  const handleCronSimulation = async () => {
    try {
      const analytics = await simulateDailyCleanup();
      
      // Send Discord notification for each archived shift
      const webhookUrl = localStorage.getItem('stop_go_discord_webhook_url');
      if (webhookUrl && analytics && analytics.length > 0) {
        for (const payload of analytics) {
          await sendDiscordShiftArchived(payload, webhookUrl);
        }
      }

      // If our current shift was swept by cron, refresh state
      if (currentShift) {
        const refreshed = await getActiveShift(currentShift.shift_id);
        setCurrentShift(refreshed);
        
        // Force-purge local session cache if shift became "missed_cleanup"
        if (refreshed && refreshed.status === 'missed_cleanup') {
          // Keep the historical view but allow user to start fresh initialization
          // The spec says: "force-purge tablet active session cache to prepare for upcoming morning initialization"
          // We will reset currentShift to null in 3 seconds to let them start a new setup, or let them click Reset.
          setTimeout(() => {
            setCurrentShift(null);
            setInitTeamPids([]);
          }, 3500);
        }
      }
      return analytics;
    } catch (e) {
      console.error("Cron simulation failed:", e);
      return [];
    }
  };
  
  const handleSeedTestScenario = async () => {
    setLoading(true);
    try {
      const shiftId = `${initDate}_${initShiftType}`;
      const shift = await seedTestScenario(shiftId, initShiftType, initDate);
      setCurrentShift(shift);
      setTimeout(() => {
        setIsDevOpen(false);
      }, 1500);
      setAppError(null);
    } catch (err) {
      console.error(err);
      setAppError("Failed to seed test scenario.");
    } finally {
      setLoading(false);
    }
  };

  // Maps IDs to employee data objects
  const getActiveTeamObjects = () => {
    const list = currentShift ? currentShift.active_team_pids : initTeamPids;
    return list
      .map(pid => allEmployees.find(e => e.employee_id === pid))
      .filter(Boolean);
  };

  const activeTeamObjects = getActiveTeamObjects();

  // Calculate Progress Stats
  const getProgressPercent = () => {
    if (!currentShift || currentShift.total_count === 0) return 0;
    return Math.round((currentShift.completed_count / currentShift.total_count) * 100);
  };

  return (
    <div className="app-container">
      {/* Header bar */}
      <header className="header glass-panel animate-fade-in">
        <div className="logo-section">
          <h1>Stop & Go</h1>
          <p>Dynamic Chores List</p>
        </div>

        {/* Tab Navigation */}
        <div className="nav-tabs" style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('dashboard')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Dashboard
          </button>
          <button 
            type="button"
            className={`btn ${currentTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('history')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Shift History
          </button>
          <button 
            type="button"
            className={`btn ${currentTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('analytics')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Analytics
          </button>
          <button 
            type="button"
            className={`btn ${currentTab === 'slow_chores' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('slow_chores')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Slow Chores
          </button>
          <button 
            type="button"
            className={`btn ${currentTab === 'chores_manager' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('chores_manager')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Manage Chores
          </button>
          <button 
            type="button"
            className={`btn ${currentTab === 'staff_manager' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCurrentTab('staff_manager')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Manage Staff
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Status badge */}
          {currentShift ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {currentShift.date} ({currentShift.shift_type.toUpperCase()})
              </span>
              
              {currentShift.status === 'open' && (
                <span className="badge badge-open">
                  <Clock size={12} /> {currentShift.shift_type === 'closing' ? 'Closing' : 'Opening'} ({getProgressPercent()}%)
                </span>
              )}
              {currentShift.status === 'pending_signatures' && (
                <span className="badge badge-pending">
                  <ShieldCheck size={12} /> Pending Signatures
                </span>
              )}
              {currentShift.status === 'submitted' && (
                <span className="badge badge-submitted">
                  <CheckCircle2 size={12} /> Submitted
                </span>
              )}
              {currentShift.status === 'missed_cleanup' && (
                <span className="badge badge-missed">
                  <AlertTriangle className="icon" size={12} /> Missed Archive
                </span>
              )}
            </div>
          ) : (
            <span className="badge badge-open">
              <Plus size={12} /> Setup Mode
            </span>
          )}

          {/* Database indicator */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '0.75rem',
              color: isLive ? 'var(--accent-green)' : 'var(--accent-amber)',
              background: isLive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              padding: '6px 12px',
              borderRadius: '9999px',
              border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
            }}
          >
            <Server size={12} />
            {isLive ? 'Firestore Live' : 'LocalStorage Mock'}
          </div>

          {/* Developer Control toggle */}
          <button 
            className="btn btn-secondary" 
            onClick={() => setIsDevOpen(true)}
            style={{ padding: '8px', borderRadius: '50%' }}
            aria-label="Settings panel"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main content display based on states */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Synchronizing Ledger State...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : currentTab === 'history' ? (
        <HistoryViewer onBack={() => setCurrentTab('dashboard')} />
      ) : currentTab === 'chores_manager' ? (
        <ChoreManager onBack={() => setCurrentTab('dashboard')} />
      ) : currentTab === 'staff_manager' ? (
        <StaffManager onBack={() => setCurrentTab('dashboard')} />
      ) : currentTab === 'analytics' ? (
        <AnalyticsDashboard onBack={() => setCurrentTab('dashboard')} />
      ) : currentTab === 'slow_chores' ? (
        <SlowChoresManager 
          onBack={() => setCurrentTab('dashboard')} 
          activeTeam={activeTeamObjects} 
          selectedOperatorId={selectedOperatorId} 
        />
      ) : appError && !selectedInitEmployee ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '24px', textAlign: 'center', maxWidth: '500px', margin: '40px auto', borderLeft: '4px solid var(--accent-red)' }}>
          <h3 style={{ color: 'var(--accent-red)', marginBottom: '8px', fontSize: '1.2rem' }}>Operational Error</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>{appError}</p>
          <button className="btn btn-secondary" onClick={() => setAppError(null)}>Dismiss</button>
        </div>
      ) : !currentShift ? (
        // ==============================================================================
        // STATE 01: INITIALIZATION
        // ==============================================================================
        <div className="main-layout animate-fade-in">
          {/* Sidebar Roster progress */}
          <div className="glass-panel roster-card">
            <div className="roster-header">
              <h3>Roster Checklist</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {initTeamPids.length} Selected
              </span>
            </div>

            {initTeamPids.length === 0 ? (
              <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', textAlign: 'center' }}>
                <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Check in employees from the list on the right to populate the active roster.
                </p>
              </div>
            ) : (
              <div className="roster-list" style={{ flexGrow: 1 }}>
                {activeTeamObjects.map(emp => (
                  <div key={emp.employee_id} className="member-item">
                    <div className="member-info">
                      <div className="member-avatar">
                        {emp.employee_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="member-name">{emp.employee_name}</div>
                        <div className="member-role">{emp.role}</div>
                      </div>
                    </div>
                    <button 
                      className="btn" 
                      onClick={() => setInitTeamPids(prev => prev.filter(pid => pid !== emp.employee_id))}
                      style={{ padding: '4px 8px', background: 'transparent', color: 'var(--accent-red)', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Shift setup configuration */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Shift Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={initDate} 
                  disabled
                  style={{ opacity: 0.8, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>Shift Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    className={`btn ${initShiftType === 'opening' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setInitShiftType('opening')}
                  >
                    Opening
                  </button>
                  <button 
                    className={`btn ${initShiftType === 'closing' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setInitShiftType('closing')}
                  >
                    Closing
                  </button>
                </div>
              </div>

              <button 
                className="btn btn-success" 
                onClick={handleStartShift}
                disabled={initTeamPids.length === 0}
                style={{ width: '100%', marginTop: '8px', opacity: initTeamPids.length === 0 ? 0.5 : 1 }}
              >
                Start Shift Checklist
              </button>
            </div>
          </div>

          {/* Employee Pin authentication grid */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Who is working this shift?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
              Tap each active worker name card and verify their PIN code to build the dynamic roster.
            </p>

            {selectedInitEmployee ? (
              <div style={{ maxWidth: '340px', margin: '0 auto' }}>
                <PinNumpad 
                  title={`Enter PIN code for ${selectedInitEmployee.employee_name}`}
                  onPinComplete={handleInitEmployeePinComplete}
                  onCancel={() => setSelectedInitEmployee(null)}
                  error={appError}
                />
              </div>
            ) : (
              <div className="employee-login-grid">
                {allEmployees.map(emp => {
                  const isCheckedIn = initTeamPids.includes(emp.employee_id);
                  return (
                    <button
                      key={emp.employee_id}
                      className={`employee-login-btn ${isCheckedIn ? 'selected' : ''}`}
                      onClick={() => handleSelectEmployeeForInit(emp)}
                    >
                      <div className="member-avatar" style={{ width: '48px', height: '48px', fontSize: '1rem', background: isCheckedIn ? 'var(--accent-green)' : 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                        {isCheckedIn ? '✓' : emp.employee_name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="member-name">{emp.employee_name}</span>
                      <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>
                        {emp.role}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : currentShift.status === 'submitted' ? (
        // ==============================================================================
        // STATE SUBMITTED SUMMARY
        // ==============================================================================
        <div className="glass-panel animate-fade-in" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: '700px', margin: '40px auto' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-green-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid var(--accent-green)' }}>
            <CheckCircle2 size={42} style={{ color: 'var(--accent-green)' }} />
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Shift Ledger Submitted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem' }}>
            The dynamic chores list checklist for {currentShift.date} ({currentShift.shift_type}) is sealed.
          </p>

          <div className="glass-panel" style={{ padding: '24px', margin: '0 auto 32px', textAlign: 'left', background: 'rgba(255,255,255,0.01)' }}>
            <h4 style={{ marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', textTransform: 'uppercase', fontSize: '0.75rem', tracking: '0.05em', color: 'var(--text-secondary)' }}>Shift Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Chore Completion:</span>
                <p style={{ fontWeight: '600' }}>{currentShift.completed_count} / {currentShift.total_count} tasks completed</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Roster:</span>
                <p style={{ fontWeight: '600' }}>{activeTeamObjects.map(e => e.employee_name).join(', ')}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Sealed At:</span>
                <p style={{ fontWeight: '600' }}>{new Date(currentShift.submitted_at).toLocaleTimeString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Sign-off Authorities:</span>
                <p style={{ fontWeight: '600', color: 'var(--accent-green)' }}>
                  {currentShift.signatures?.map(s => s.employee_name).join(' & ')}
                </p>
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleResetShift}>
            <RotateCcw size={16} /> Initialize Next Shift
          </button>
        </div>
      ) : currentShift.status === 'pending_signatures' ? (
        // ==============================================================================
        // STATE 03: VERIFICATION
        // ==============================================================================
        <div className="glass-panel animate-fade-in" style={{ padding: '16px', maxWidth: '600px', margin: '20px auto' }}>
          <VerificationScreen 
            activeTeam={activeTeamObjects}
            onSubmitSignatures={handleVerifySignatures}
            onResetShift={handleResetShift}
            shift={currentShift}
          />
        </div>
      ) : (
        // ==============================================================================
        // STATE 02: ACTIVE CHECKLIST SPLIT VIEW & MISSED CLEANUP
        // ==============================================================================
        <div className="main-layout animate-fade-in">
          {/* Left Side Roster */}
          <div className="glass-panel roster-card">
            <RosterSidebar 
              activeTeam={activeTeamObjects}
              allEmployees={allEmployees}
              onAddMember={handleAddMemberToActiveRoster}
              onRemoveMember={handleRemoveMemberFromActiveRoster}
              isReadOnly={currentShift.status === 'missed_cleanup'}
            />

            {/* If shift is missed, show error warning panel */}
            {currentShift.status === 'missed_cleanup' && (
              <div className="glass-panel" style={{ padding: '16px', marginTop: '20px', background: 'var(--accent-red-glow)', borderColor: 'var(--accent-red)' }}>
                <div style={{ display: 'flex', gap: '8px', color: 'var(--accent-red)', fontWeight: '600', marginBottom: '6px', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} /> Shift Locked by 04:00 AM Cron
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  This shift was left open and was archived by the cleanup script. Missed tasks are marked red.
                </p>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleResetShift} 
                  style={{ width: '100%', marginTop: '12px', fontSize: '0.75rem', padding: '6px' }}
                >
                  Start New Session
                </button>
              </div>
            )}

            {/* Progress tracking */}
            {currentShift.status !== 'missed_cleanup' && (
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '20px', marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Completion Status</span>
                  <span style={{ fontWeight: '600' }}>
                    {currentShift.completed_count} / {currentShift.total_count} Chores
                  </span>
                </div>
                <div style={{ height: '8px', width: '100%', background: 'rgba(255,255,255,0.03)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${getProgressPercent()}%`, 
                      background: 'linear-gradient(to right, var(--primary), var(--accent-green))',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
                {getProgressPercent() === 100 && (
                  <button 
                    className="btn btn-primary"
                    onClick={async () => {
                      const updated = await updateShiftStatus(currentShift.shift_id, 'pending_signatures');
                      if (updated) {
                        setCurrentShift(updated);
                      } else {
                        setCurrentShift(prev => ({ ...prev, status: 'pending_signatures' }));
                      }
                    }}
                    style={{ width: '100%', marginTop: '16px' }}
                  >
                    Proceed to Dual Signature Lock
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Side Chore Ledger */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Chore Ledger</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {currentShift.shift_type.toUpperCase()} LIST
              </span>
            </div>

            <ChoreLedger 
              shift={currentShift}
              activeTeam={activeTeamObjects}
              onTaskToggle={handleTaskToggle}
              selectedOperatorId={selectedOperatorId}
              setSelectedOperatorId={(id) => {
                setSelectedOperatorId(id);
                if (id) {
                  localStorage.setItem('stop_go_selected_operator_id', id);
                } else {
                  localStorage.removeItem('stop_go_selected_operator_id');
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Developer settings drawer */}
      {isDevOpen && (
        <div 
          className="drawer-overlay" 
          onClick={() => setIsDevOpen(false)}
        />
      )}
      <DevControlPanel 
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        isLive={isLive}
        firebaseConfig={getFirebaseConfig()}
        onSaveConfig={handleSaveFirebaseConfig}
        onClearConfig={handleClearFirebaseConfig}
        onCronSimulate={handleCronSimulation}
        onSeedTestScenario={handleSeedTestScenario}
      />
    </div>
  );
}

export default App;
