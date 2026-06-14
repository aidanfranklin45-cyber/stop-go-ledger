import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Plus, 
  Check, 
  Trash2, 
  Edit, 
  Lock, 
  ShieldCheck, 
  Calendar,
  AlertTriangle,
  User,
  Settings,
  X
} from 'lucide-react';
import { 
  getSlowChores, 
  addSlowChore, 
  updateSlowChore, 
  deleteSlowChore, 
  completeSlowChore,
  getEmployees,
  validateEmployeePin 
} from '../firebase';
import PinNumpad from './PinNumpad';

const SlowChoresManager = ({ onBack, activeTeam = [], selectedOperatorId }) => {
  // Navigation tab: 'checklist' or 'scheduler'
  const [activeSubTab, setActiveSubTab] = useState('checklist');

  // Authentication states for manager scheduler
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEntryManagerId, setSelectedEntryManagerId] = useState(null);
  const [entryPinError, setEntryPinError] = useState("");
  const [pinError, setPinError] = useState("");

  // Data states
  const [slowChoresList, setSlowChoresList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [choreName, setChoreName] = useState("");
  const [frequencyDays, setFrequencyDays] = useState(3);
  const [editingChore, setEditingChore] = useState(null);
  const [managerError, setManagerError] = useState("");
  const [managerSuccess, setManagerSuccess] = useState("");

  // Operator select state for completion
  const [completingChore, setCompletingChore] = useState(null);
  const [selectedCompleterId, setSelectedCompleterId] = useState("");

  // Load slow chores list
  const loadSlowChores = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSlowChores();
      setSlowChoresList(list);
    } catch (err) {
      console.error("Failed to load slow chores:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all active employees on mount
  const loadEmployees = useCallback(async () => {
    try {
      const emps = await getEmployees();
      setAllEmployees(emps.filter(e => e.is_active));
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  }, []);

  useEffect(() => {
    loadSlowChores();
    loadEmployees();
  }, [loadSlowChores, loadEmployees]);

  // PIN authentication for manager scheduler settings
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

  // Form actions
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setManagerError("");
    setManagerSuccess("");

    if (!choreName.trim()) {
      setManagerError("Chore description is required.");
      return;
    }

    if (Number(frequencyDays) <= 0) {
      setManagerError("Frequency must be 1 day or more.");
      return;
    }

    try {
      if (editingChore) {
        // Edit Chore
        const updated = await updateSlowChore(editingChore.id, {
          name: choreName.trim(),
          frequency_days: Number(frequencyDays)
        });
        if (updated) {
          setManagerSuccess(`Successfully updated "${choreName.trim()}"`);
          setEditingChore(null);
          setChoreName("");
          setFrequencyDays(3);
          await loadSlowChores();
        } else {
          setManagerError("Failed to update slow chore.");
        }
      } else {
        // Add Chore
        const added = await addSlowChore({
          name: choreName.trim(),
          frequency_days: Number(frequencyDays)
        });
        if (added) {
          setManagerSuccess(`Successfully scheduled "${choreName.trim()}"`);
          setChoreName("");
          setFrequencyDays(3);
          await loadSlowChores();
        } else {
          setManagerError("Failed to add slow chore.");
        }
      }
    } catch (err) {
      console.error(err);
      setManagerError("An error occurred during operations.");
    }
  };

  const handleStartEdit = (chore) => {
    setEditingChore(chore);
    setChoreName(chore.name);
    setFrequencyDays(chore.frequency_days);
    setManagerError("");
    setManagerSuccess("");
  };

  const handleCancelEdit = () => {
    setEditingChore(null);
    setChoreName("");
    setFrequencyDays(3);
    setManagerError("");
    setManagerSuccess("");
  };

  const handleDeleteChore = async (id, name) => {
    setManagerError("");
    setManagerSuccess("");
    if (window.confirm(`Are you sure you want to permanently delete the slow chore schedule for "${name}"?`)) {
      try {
        const success = await deleteSlowChore(id);
        if (success) {
          setManagerSuccess(`Deleted chore schedule: "${name}"`);
          if (editingChore && editingChore.id === id) {
            handleCancelEdit();
          }
          await loadSlowChores();
        } else {
          setManagerError("Failed to delete slow chore.");
        }
      } catch (err) {
        console.error(err);
        setManagerError("Failed to delete.");
      }
    }
  };

  // Handle slow chore completion without PIN verification
  const handleChoreComplete = async () => {
    if (!completingChore || !selectedCompleterId) return;

    try {
      const employee = allEmployees.find(e => e.employee_id === selectedCompleterId);
      if (employee) {
        const updated = await completeSlowChore(
          completingChore.id,
          employee.employee_id,
          employee.employee_name
        );
        if (updated) {
          setCompletingChore(null);
          setSelectedCompleterId("");
          await loadSlowChores();
        } else {
          alert("Failed to record chore completion.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error marking completion.");
    }
  };

  // Helper: check if due
  const isDue = (chore) => {
    if (!chore.last_completed_at) return true;
    const elapsedMs = Date.now() - new Date(chore.last_completed_at).getTime();
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    return elapsedDays >= chore.frequency_days;
  };

  // Helper: calculate time remaining or overdue
  const getScheduleLabel = (chore) => {
    if (!chore.last_completed_at) return "Never completed (Needs Attention)";
    
    const nextDueTime = new Date(chore.last_completed_at).getTime() + (chore.frequency_days * 24 * 60 * 60 * 1000);
    const diffMs = nextDueTime - Date.now();
    
    if (diffMs <= 0) {
      const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      return overdueDays > 0 
        ? `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`
        : "Overdue by less than a day";
    } else {
      const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (remainingDays > 0) {
        return `Due in ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      } else {
        const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
        return `Due in ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
    }
  };

  const dueChores = slowChoresList.filter(c => isDue(c));
  const upcomingChores = slowChoresList.filter(c => !isDue(c));

  // --- RENDER ---
  return (
    <div className="animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tab Header */}
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
              Slow Chores Scheduler
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Periodic chores completed during slow store hours to keep procedures running smoothly.
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="nav-tabs" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '4px', borderRadius: '8px' }}>
          <button 
            type="button"
            className={`btn ${activeSubTab === 'checklist' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('checklist')}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Checklist
          </button>
          <button 
            type="button"
            className={`btn ${activeSubTab === 'scheduler' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('scheduler')}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Configure
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
          <div style={{ width: '30px', height: '30px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Synchronizing periodic schedule...</span>
        </div>
      )}

      {!loading && activeSubTab === 'checklist' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          


          {/* Section 1: Due Now */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <AlertTriangle size={20} style={{ color: 'var(--accent-red)' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Due Now (Needs Attention)</h3>
              <span className="badge badge-missed" style={{ fontSize: '0.75rem', fontWeight: 600, marginLeft: 'auto' }}>
                {dueChores.length} Chores Due
              </span>
            </div>

            {dueChores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                <Check size={36} style={{ color: 'var(--accent-green)', marginBottom: '8px', margin: '0 auto' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</p>
                <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>No scheduled chores require attention at this time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {dueChores.map(chore => (
                  <div 
                    key={chore.id} 
                    className="member-item animate-fade-in" 
                    style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.45)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{chore.name}</h4>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span className="badge badge-missed" style={{ fontSize: '0.65rem' }}>Every {chore.frequency_days} Days</span>
                        <span>•</span>
                        <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{getScheduleLabel(chore)}</span>
                        {chore.last_completed_at && (
                          <>
                            <span>•</span>
                            <span>Last by {chore.last_completed_by_name} ({new Date(chore.last_completed_at).toLocaleDateString()})</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      className="btn btn-success"
                      onClick={() => {
                        setCompletingChore(chore);
                        setSelectedCompleterId("");
                      }}
                      style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Check size={14} />
                      <span>Mark Complete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Upcoming */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
              <Clock size={20} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Scheduled / Upcoming</h3>
              <span className="badge badge-open" style={{ fontSize: '0.75rem', fontWeight: 600, marginLeft: 'auto' }}>
                {upcomingChores.length} Scheduled
              </span>
            </div>

            {upcomingChores.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                No upcoming chores on the schedule.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingChores.map(chore => (
                  <div 
                    key={chore.id} 
                    className="member-item" 
                    style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.25)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      borderColor: 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{chore.name}</h4>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span className="badge badge-open" style={{ fontSize: '0.65rem' }}>Every {chore.frequency_days} Days</span>
                        <span>•</span>
                        <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{getScheduleLabel(chore)}</span>
                        {chore.last_completed_at && (
                          <>
                            <span>•</span>
                            <span>Last: {chore.last_completed_by_name} ({new Date(chore.last_completed_at).toLocaleDateString()})</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Confirmation Modal */}
      {completingChore && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '400px', width: '100%', background: '#ffffff', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Record Chore Completion</h3>
              <button 
                type="button" 
                onClick={() => {
                  setCompletingChore(null);
                  setSelectedCompleterId("");
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 500 }}>
              Chore: <span style={{ color: 'var(--primary)' }}>{completingChore.name}</span>
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Completed By
              </label>
              <select
                className="form-input"
                value={selectedCompleterId}
                onChange={(e) => setSelectedCompleterId(e.target.value)}
                style={{ padding: '10px', fontSize: '0.9rem', cursor: 'pointer', width: '100%', marginBottom: '16px' }}
              >
                <option value="">Select Employee</option>
                {allEmployees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary w-full"
                onClick={() => {
                  setCompletingChore(null);
                  setSelectedCompleterId("");
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success w-full"
                onClick={handleChoreComplete}
                disabled={!selectedCompleterId}
              >
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Tab (Manager Gated Settings) */}
      {!loading && activeSubTab === 'scheduler' && (
        <>
          {!isAuthenticated ? (
            <div className="glass-panel max-w-md mx-auto w-full text-center p-8 animate-fade-in" style={{ marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <div style={{ background: 'var(--primary-glow)', color: 'var(--primary)', padding: '12px', borderRadius: '50%' }}>
                  <Lock size={32} />
                </div>
              </div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                Manager Verification Required
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Please verify your manager authorization PIN code to configure slow chores and frequencies.
              </p>

              {selectedEntryManagerId === null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allEmployees.filter(e => e.role === 'manager').length === 0 ? (
                    <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
                      No active managers registered.
                    </p>
                  ) : (
                    allEmployees.filter(e => e.role === 'manager').map(mgr => (
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
                    onClick={() => setActiveSubTab('checklist')}
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
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              
              {/* Add / Edit Form Card */}
              <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                  <ShieldCheck size={20} style={{ color: 'var(--accent-green)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {editingChore ? 'Edit Scheduled Chore' : 'Add Scheduled Chore'}
                  </h3>
                </div>

                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {managerError && (
                    <div style={{ color: 'var(--accent-red)', background: 'var(--accent-red-glow)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
                      {managerError}
                    </div>
                  )}
                  {managerSuccess && (
                    <div style={{ color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
                      {managerSuccess}
                    </div>
                  )}

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Chore Description
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={choreName}
                      onChange={(e) => setChoreName(e.target.value)}
                      placeholder="e.g. Deep Clean Restroom Cabinets"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                      Frequency Schedule (Every N Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={frequencyDays}
                      onChange={(e) => setFrequencyDays(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    <button type="submit" className="btn btn-success w-full" style={{ padding: '12px' }}>
                      {editingChore ? 'Save Chore Changes' : 'Schedule Slow Chore'}
                    </button>
                    {editingChore && (
                      <button type="button" className="btn btn-secondary w-full" onClick={handleCancelEdit} style={{ padding: '10px' }}>
                        Cancel Editing
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Scheduled chores list */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                  <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Chore Scheduler Roster</h3>
                </div>

                {slowChoresList.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                    No chores registered on the periodic schedule.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {slowChoresList.map(chore => (
                      <div 
                        key={chore.id} 
                        className="member-item" 
                        style={{ 
                          padding: '12px 16px', 
                          background: 'rgba(255,255,255,0.3)', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                            {chore.name}
                          </span>
                          <span className="badge badge-open" style={{ fontSize: '0.65rem', marginTop: '4px' }}>
                            Every {chore.frequency_days} Days
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleStartEdit(chore)}
                            style={{ padding: '8px', borderRadius: '50%' }}
                            aria-label="Edit chore"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleDeleteChore(chore.id, chore.name)}
                            style={{ padding: '8px', borderRadius: '50%', color: 'var(--accent-red)' }}
                            aria-label="Delete chore"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
};

export default SlowChoresManager;
