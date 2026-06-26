import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Users, 
  User,
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  ArrowLeft,
  Trash2,
  Lock,
  Flag,
  FileText
} from 'lucide-react';
import { getSubmittedShifts, getActiveShift, getEmployees, validateEmployeePin, deleteShift, sendDiscordShiftDeleted, updateTask, getEmployeeAvatarStyle } from '../firebase';
import PinNumpad from './PinNumpad';
import ChoreFlagModal from './ChoreFlagModal';

const HistoryViewer = ({ onBack, defaultAuthenticated, currentActiveShiftId, onActiveShiftDeleted }) => {
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Manager authentication for entry
  const [isAuthenticated, setIsAuthenticated] = useState(defaultAuthenticated || false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [fullEmployeesList, setFullEmployeesList] = useState([]);
  const [selectedEntryManagerId, setSelectedEntryManagerId] = useState(null);
  const [entryPinError, setEntryPinError] = useState("");

  // Manager authentication for deletion
  const [showPinGate, setShowPinGate] = useState(false);
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [pinError, setPinError] = useState("");

  const [flaggingTask, setFlaggingTask] = useState(null);

  const handleFlagSave = async (flagData) => {
    if (!selectedShift || !flaggingTask) return;
    try {
      const updatedShift = await updateTask(
        selectedShift.shift_id,
        flaggingTask.task_id,
        flaggingTask.is_completed,
        flaggingTask.completed_by_id,
        flaggingTask.completed_by_name,
        flaggingTask.subtasks || null,
        flagData
      );
      if (updatedShift) {
        setSelectedShift(updatedShift);
        setShifts(prev => prev.map(s => s.shift_id === updatedShift.shift_id ? updatedShift : s));
      }
      setFlaggingTask(null);
    } catch (err) {
      console.error("Failed to flag task:", err);
      alert("Failed to flag task in database.");
    }
  };

  const handleFlagRemove = async (task, managerId, pin) => {
    const isValid = await validateEmployeePin(managerId, pin);
    if (!isValid) {
      alert("Invalid manager PIN code.");
      return;
    }
    
    try {
      const updatedShift = await updateTask(
        selectedShift.shift_id,
        task.task_id,
        task.is_completed,
        task.completed_by_id,
        task.completed_by_name,
        task.subtasks || null,
        'REMOVE'
      );
      if (updatedShift) {
        setSelectedShift(updatedShift);
        setShifts(prev => prev.map(s => s.shift_id === updatedShift.shift_id ? updatedShift : s));
      }
    } catch (err) {
      console.error("Failed to remove flag:", err);
      alert("Failed to remove flag from task.");
    }
  };

  const loadManagers = useCallback(async () => {
    try {
      const emps = await getEmployees();
      setFullEmployeesList(emps);
      setAllEmployees(emps.filter(e => e.role === 'manager' && e.is_active));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const getEmployeeName = (id) => {
    const emp = fullEmployeesList.find(e => e.employee_id === id || e.id === id);
    return emp ? emp.employee_name : id;
  };

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const fetchShifts = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await getSubmittedShifts();
      setShifts(list);
      if (list.length > 0) {
        setSelectedShiftId(list[0].shift_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchShifts();
    }
  }, [isAuthenticated, fetchShifts]);

  const fetchShiftDetail = useCallback(async (id) => {
    setLoadingDetail(true);
    try {
      const detail = await getActiveShift(id);
      setSelectedShift(detail);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    setShowPinGate(false);
    setSelectedManagerId(null);
    setPinError("");
    if (selectedShiftId) {
      fetchShiftDetail(selectedShiftId);
    } else {
      setSelectedShift(null);
    }
  }, [selectedShiftId, fetchShiftDetail]);

  const handleStartDeleteShift = async () => {
    try {
      const emps = await getEmployees();
      setManagers(emps.filter(e => e.role === 'manager' && e.is_active));
      setShowPinGate(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePinComplete = async (pin) => {
    setPinError("");
    if (!selectedManagerId) return;

    try {
      const isValid = await validateEmployeePin(selectedManagerId, pin);
      if (isValid) {
        const isSealed = selectedShift.status === 'submitted' || selectedShift.status === 'missed_cleanup';
        const confirmMessage = isSealed
          ? `Are you sure you want to permanently delete the sealed shift submission for ${selectedShift.date} (${selectedShift.shift_type})? This action cannot be undone.`
          : `Are you sure you want to permanently delete the in-progress shift checklist for ${selectedShift.date} (${selectedShift.shift_type})? This will force the team to start the shift over from scratch.`;

        if (window.confirm(confirmMessage)) {
          setLoadingDetail(true);
          const shiftDate = selectedShift.date;
          const shiftType = selectedShift.shift_type;
          const success = await deleteShift(selectedShift.shift_id);
          if (success) {
            const webhookUrl = localStorage.getItem('stop_go_discord_webhook_url');
            if (webhookUrl) {
              await sendDiscordShiftDeleted(shiftDate, shiftType, webhookUrl);
            }
            if (onActiveShiftDeleted && selectedShift.shift_id === currentActiveShiftId) {
              onActiveShiftDeleted();
            }
            setShowPinGate(false);
            setSelectedManagerId(null);
            setSelectedShiftId(null);
            setSelectedShift(null);
            await fetchShifts();
          } else {
            setPinError("Failed to delete shift from database.");
          }
          setLoadingDetail(false);
        }
      } else {
        setPinError("Invalid manager PIN code.");
      }
    } catch (err) {
      setPinError("PIN verification error.");
    }
  };

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

  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val === 'object' && typeof val.toDate === 'function') {
      return val.toDate();
    }
    if (typeof val === 'object' && val.seconds !== undefined) {
      return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatTime = (isoString) => {
    const d = parseDate(isoString);
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (isoString) => {
    const d = parseDate(isoString);
    if (!d) return "";
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  // Group task details by category
  const getTasksByCategory = () => {
    if (!selectedShift || !selectedShift.tasks) return {};
    const grouped = {};
    Object.values(selectedShift.tasks).forEach(task => {
      const cat = task.category || "Uncategorized";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(task);
    });
    return grouped;
  };

  const groupedTasks = getTasksByCategory();

  // --- RENDERING AUTH GATE ---
  if (!isAuthenticated) {
    const managersList = allEmployees;

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
          Please verify your manager authorization PIN code to access historical shift reports.
        </p>

        {selectedEntryManagerId === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {managersList.length === 0 ? (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
                No active managers registered.
              </p>
            ) : (
              managersList.map(mgr => (
                <button
                  key={mgr.employee_id}
                  type="button"
                  className="btn btn-secondary w-full"
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', alignItems: 'center' }}
                  onClick={() => setSelectedEntryManagerId(mgr.employee_id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: getEmployeeAvatarStyle(mgr.employee_name, mgr.color).backgroundColor,
                      color: getEmployeeAvatarStyle(mgr.employee_name, mgr.color).color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700
                    }}>
                      {mgr.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span>{mgr.employee_name}</span>
                  </div>
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
            title={`Enter PIN for ${managersList.find(m => m.employee_id === selectedEntryManagerId)?.employee_name}`}
            onPinComplete={handleEntryPinComplete}
            onCancel={() => setSelectedEntryManagerId(null)}
            error={entryPinError}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="main-layout animate-fade-in no-print" style={{ gridTemplateColumns: '320px 1fr' }}>
      
      {/* Left Column: Shifts List */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onBack}
            style={{ padding: '6px 10px', borderRadius: '50%' }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Shift History</h2>
        </div>

        {loadingList ? (
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : shifts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)', flexGrow: 1 }}>
            <Calendar size={28} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
            <p style={{ fontSize: '0.85rem' }}>No submitted shifts found.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
            {shifts.map(s => {
              const isSelected = s.shift_id === selectedShiftId;
              const progress = s.total_count > 0 ? Math.round((s.completed_count / s.total_count) * 100) : 0;
              return (
                <button
                  key={s.shift_id}
                  type="button"
                  onClick={() => setSelectedShiftId(s.shift_id)}
                  className={`member-item w-full ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    textAlign: 'left', 
                    cursor: 'pointer', 
                    background: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'rgba(255, 255, 255, 0.45)',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.date}
                    </span>
                    <span 
                      className={`badge ${s.shift_type === 'opening' ? 'badge-open' : 'badge-pending'}`}
                      style={{ fontSize: '0.6rem', padding: '2px 6px', textTransform: 'uppercase' }}
                    >
                      {s.shift_type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Progress: {s.completed_count}/{s.total_count} ({progress}%)</span>
                    
                    {s.status === 'missed_cleanup' && (
                      <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Missed</span>
                    )}
                    {s.status === 'submitted' && (
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Sealed</span>
                    )}
                    {s.status === 'open' && (
                      <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>In Progress</span>
                    )}
                    {s.status === 'pending_signatures' && (
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Pending</span>
                    )}
                  </div>

                  {s.till_status && s.till_status !== 'balanced' && (
                    <div style={{ marginTop: '6px', fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={10} />
                      <span>Till {s.till_status}: ${Number(s.till_discrepancy_amount).toFixed(2)}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Shift Details Panel */}
      <div className="glass-panel" style={{ padding: '24px', height: 'calc(100vh - 180px)', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
        {loadingDetail ? (
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Retrieving report details...</span>
          </div>
        ) : !selectedShift ? (
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-secondary)' }}>
            <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3>No Shift Selected</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Select a shift report from the left sidebar to view details.</p>
          </div>
        ) : showPinGate ? (
          <div className="glass-panel text-center p-8 animate-fade-in" style={{ maxWidth: '400px', margin: '40px auto', background: 'rgba(255,255,255,0.45)', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '12px', borderRadius: '50%' }}>
                <Lock size={32} />
              </div>
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Manager Verification Required
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Please enter a manager authorization PIN to delete the {(selectedShift.status === 'submitted' || selectedShift.status === 'missed_cleanup') ? 'sealed shift submission' : 'in-progress shift checklist'}.
            </p>

            {selectedManagerId === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {managers.length === 0 ? (
                  <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
                    No active managers checked-in.
                  </p>
                ) : (
                  managers.map(mgr => (
                    <button
                      key={mgr.employee_id}
                      type="button"
                      className="btn btn-secondary w-full"
                      style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', alignItems: 'center' }}
                      onClick={() => setSelectedManagerId(mgr.employee_id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: getEmployeeAvatarStyle(mgr.employee_name, mgr.color).backgroundColor,
                          color: getEmployeeAvatarStyle(mgr.employee_name, mgr.color).color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700
                        }}>
                          {mgr.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <span>{mgr.employee_name}</span>
                      </div>
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
                  onClick={() => setShowPinGate(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <PinNumpad
                title={`Enter PIN for ${managers.find(m => m.employee_id === selectedManagerId)?.employee_name}`}
                onPinComplete={handlePinComplete}
                onCancel={() => setSelectedManagerId(null)}
                error={pinError}
              />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
            
            {/* Shift Detail Header Summary Block */}
            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Shift Details</span>
                <span style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>{selectedShift.date}</span>
                <span className={`badge ${selectedShift.shift_type === 'opening' ? 'badge-open' : 'badge-pending'}`} style={{ display: 'inline-block', fontSize: '0.65rem', padding: '2px 6px', marginTop: '6px', textTransform: 'uppercase' }}>
                  {selectedShift.shift_type} list
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Chore Completion</span>
                <span style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  {selectedShift.completed_count} / {selectedShift.total_count}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {Math.round((selectedShift.completed_count / selectedShift.total_count) * 100)}% Tasks Completed
                </p>
              </div>

              {selectedShift.shift_type === 'closing' && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Till Closing Report</span>
                  <span style={{ 
                    fontWeight: 700, 
                    fontSize: '1.05rem', 
                    color: selectedShift.till_status === 'balanced' ? 'var(--accent-green)' : 'var(--accent-red)'
                  }}>
                    {selectedShift.till_status === 'balanced' && "Balanced ($0.00)"}
                    {selectedShift.till_status === 'over' && `Over (+$${Number(selectedShift.till_discrepancy_amount).toFixed(2)})`}
                    {selectedShift.till_status === 'under' && `Under (-$${Number(selectedShift.till_discrepancy_amount).toFixed(2)})`}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Expected Till: $300.00
                  </p>
                </div>
              )}

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>Authentication Status</span>
                {selectedShift.status === 'missed_cleanup' && (
                  <div>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> Missed Cleanup
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Auto-archived: {formatDateTime(selectedShift.cleaned_up_at)}
                    </span>
                  </div>
                )}
                {selectedShift.status === 'submitted' && (
                  <div>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Submitted & Sealed
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Time: {formatDateTime(selectedShift.submitted_at)}
                    </span>
                  </div>
                )}
                {selectedShift.status === 'open' && (
                  <div>
                    <span style={{ color: 'var(--accent-amber)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> In Progress
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Started: {formatDateTime(selectedShift.initialized_at || selectedShift.created_at)}
                    </span>
                  </div>
                )}
                {selectedShift.status === 'pending_signatures' && (
                  <div>
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} /> Pending Signatures
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Started: {formatDateTime(selectedShift.initialized_at || selectedShift.created_at)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                {(selectedShift.status === 'submitted' || selectedShift.status === 'missed_cleanup') && (
                  <button
                    type="button"
                    className="btn btn-secondary no-print"
                    style={{ 
                      fontSize: '0.8rem', 
                      padding: '8px 12px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '6px',
                      width: '100%',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.print()}
                  >
                    <FileText size={14} />
                    <span>Export PDF Report</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ 
                    fontSize: '0.8rem', 
                    padding: '8px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    backgroundColor: 'var(--accent-red)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px'
                  }}
                  onClick={handleStartDeleteShift}
                >
                  <Trash2 size={14} />
                  <span>{(selectedShift.status === 'submitted' || selectedShift.status === 'missed_cleanup') ? 'Delete Submission' : 'Delete Active Shift'}</span>
                </button>
              </div>
            </div>

            {/* Roster & Signatures Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.3)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> Checked-in Roster
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedShift.active_team_pids?.map(pid => {
                    const emp = fullEmployeesList.find(e => e.employee_id === pid || e.id === pid);
                    const name = emp?.employee_name || pid;
                    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const avatarStyle = getEmployeeAvatarStyle(name, emp?.color);
                    return (
                      <div key={pid} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: avatarStyle.backgroundColor,
                          color: avatarStyle.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700
                        }}>
                          {initials}
                        </div>
                        <span>{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.3)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> Signatures Sealed
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedShift.signatures && Array.isArray(selectedShift.signatures) ? (
                    selectedShift.signatures.map((s, idx) => {
                      const emp = fullEmployeesList.find(e => e.employee_id === s.employeeId || e.id === s.employeeId);
                      const avatarStyle = getEmployeeAvatarStyle(s.name, emp?.color);
                      return (
                        <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: avatarStyle.backgroundColor,
                              color: avatarStyle.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.55rem',
                              fontWeight: 700
                            }}>
                              {s.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>{formatTime(s.timestamp)}</span>
                        </div>
                      );
                    })
                  ) : selectedShift.signatures ? (
                    // Fallback for object format in older tests
                    <div style={{ fontSize: '0.85rem' }}>
                      {selectedShift.signatures.manager_name && <p>Manager: {selectedShift.signatures.manager_name}</p>}
                      {selectedShift.signatures.operator_name && <p>Operator: {selectedShift.signatures.operator_name}</p>}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No signatures collected (Auto-archived).</span>
                  )}
                </div>
              </div>
            </div>

            {/* Shift Notes callout */}
            {selectedShift.notes && (
              <div className="glass-panel animate-fade-in" style={{ padding: '16px', background: 'rgba(255,255,255,0.45)', borderLeft: '4px solid var(--primary)', marginTop: '8px', marginBottom: '8px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📝 Shift Notes
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {selectedShift.notes}
                </p>
              </div>
            )}

            {/* Chores Grid Breakdowns */}
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '14px' }}>
                Completed Chore Records
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.keys(groupedTasks).map(cat => {
                  return (
                    <div key={cat} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '10px' }}>
                        {cat}
                      </div>
                      <div className="tasks-grid">
                        {groupedTasks[cat].map(t => {
                          return (
                            <div 
                              key={t.task_id} 
                              className={`task-card ${t.is_completed ? 'completed' : t.missed ? 'missed' : ''}`}
                              style={{ cursor: 'default', position: 'relative', paddingRight: t.is_completed ? '80px' : '12px' }}
                            >
                              <div className="task-checkbox">
                                {t.is_completed && <Check size={14} strokeWidth={3} />}
                                {!t.is_completed && t.missed && <AlertTriangle size={12} strokeWidth={3} />}
                              </div>
                              <div className="task-content">
                                <div className="task-name" style={{ textDecoration: t.is_completed ? 'line-through' : 'none' }}>
                                  {t.task_name}
                                </div>
                                {t.is_completed && (
                                  <div className="task-meta">
                                    <div className="task-meta-item">
                                      <User size={12} />
                                      <span>{t.completed_by_name}</span>
                                    </div>
                                    <div className="task-meta-item">
                                      <Clock size={12} />
                                      <span>{formatTime(t.timestamp)}</span>
                                    </div>
                                  </div>
                                )}
                                {t.missed && (
                                  <div className="task-meta">
                                    <div className="task-meta-item" style={{ color: 'var(--accent-red)' }}>
                                      <AlertTriangle size={12} />
                                      <span>Missed in Cleanup</span>
                                    </div>
                                  </div>
                                )}

                                {t.is_completed && t.flag && (
                                  <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Flag size={12} fill="currentColor" />
                                      <span>Flagged by {t.flag.flagged_by_name}</span>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                                      "{t.flag.reason}"
                                    </p>
                                    {t.flag.photo && (
                                      <img 
                                        src={t.flag.photo} 
                                        alt="Audit proof" 
                                        style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '4px', marginTop: '6px', cursor: 'pointer' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const w = window.open();
                                          w.document.write(`<img src="${t.flag.photo}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                                        }}
                                      />
                                    )}
                                  </div>
                                )}
                              </div>

                              {t.is_completed && (
                                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                  {t.flag ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Flagged by ${t.flag.flagged_by_name}: "${t.flag.reason}"\n\nDo you want to clear/resolve this flag?`)) {
                                          const pinInput = window.prompt("Enter Manager PIN to resolve/clear flag:");
                                          if (pinInput) {
                                            const mgrId = allEmployees[0]?.employee_id || allEmployees[0]?.id;
                                            if (mgrId) {
                                              handleFlagRemove(t, mgrId, pinInput);
                                            } else {
                                              alert("No managers loaded to verify PIN.");
                                            }
                                          }
                                        }
                                      }}
                                      style={{
                                        background: 'var(--accent-red-glow)',
                                        border: '1px solid var(--accent-red)',
                                        color: 'var(--accent-red)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                    >
                                      <Flag size={10} fill="currentColor" />
                                      <span>Flagged</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setFlaggingTask(t)}
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid var(--glass-border)',
                                        color: 'var(--text-secondary)',
                                        borderRadius: '4px',
                                        padding: '2px 6px',
                                        fontSize: '0.7rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                                    >
                                      <Flag size={10} />
                                      <span>Flag</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {flaggingTask && (
              <ChoreFlagModal
                chore={flaggingTask}
                shiftId={selectedShift.shift_id}
                onClose={() => setFlaggingTask(null)}
                onSave={handleFlagSave}
              />
            )}

          </div>
        )}
      </div>
    </div>
      {/* ── PRINT-ONLY: detailed task breakdown ── */}
      {selectedShift && (
        <div className="print-only" style={{ marginTop: '0', textAlign: 'left' }}>
          <div className="print-doc-header">
            <div>
              <div className="print-doc-title">Stop &amp; Go — Shift Ledger</div>
              <div className="print-doc-subtitle">
                {selectedShift.date} &nbsp;·&nbsp; {selectedShift.shift_type?.toUpperCase()} SHIFT
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
              {selectedShift.status === 'submitted' ? (
                <div>Sealed: {formatDateTime(selectedShift.submitted_at)}</div>
              ) : selectedShift.status === 'missed_cleanup' ? (
                <div>Sealed: {formatDateTime(selectedShift.cleaned_up_at)} (Missed Archive)</div>
              ) : (
                <div>Status: {selectedShift.status}</div>
              )}
              <div style={{ marginTop: '4px' }}>
                Signed by: {selectedShift.signatures && Array.isArray(selectedShift.signatures) ? (
                  selectedShift.signatures.map(s => s.name).join(' & ')
                ) : selectedShift.signatures ? (
                  [selectedShift.signatures.manager_name, selectedShift.signatures.operator_name].filter(Boolean).join(' & ')
                ) : (
                  'None'
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', fontSize: '12px', color: '#475569' }}>
            <span><strong style={{ color: '#0f172a' }}>{selectedShift.completed_count}</strong> / {selectedShift.total_count} tasks completed</span>
            <span>Team: <strong style={{ color: '#0f172a' }}>{selectedShift.active_team_pids?.map(pid => getEmployeeName(pid)).join(', ') || 'None'}</strong></span>
          </div>

          {/* Full task list grouped by category */}
          {selectedShift.tasks && Object.values(selectedShift.tasks).length > 0 && (() => {
            const allTasks = Object.values(selectedShift.tasks);
            const categories = [...new Set(allTasks.map(t => t.category).filter(Boolean))];
            return categories.map(cat => {
              const catTasks = allTasks.filter(t => t.category === cat);
              return (
                <div key={cat} style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                    {cat}
                  </div>
                  {catTasks.map(task => (
                    <div key={task.task_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: task.is_completed ? '#10b981' : '#e2e8f0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', flexShrink: 0 }}>
                        {task.is_completed ? '✓' : task.missed ? '✕' : ''}
                      </span>
                      <span style={{ flex: 1, color: task.is_completed ? '#0f172a' : '#94a3b8', textDecoration: task.missed ? 'line-through' : 'none' }}>
                        {task.task_name}
                      </span>
                      {task.is_completed && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          {task.completed_by_name} · {task.completed_at ? formatTime(task.completed_at) : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            });
          })()}
        </div>
      )}
    </>
  );
};

export default HistoryViewer;
