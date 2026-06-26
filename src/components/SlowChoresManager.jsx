import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Check, 
  Trash2, 
  Edit, 
  Lock, 
  ShieldCheck, 
  Calendar,
  AlertTriangle,
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
  validateEmployeePin,
  getEmployeeAvatarStyle 
} from '../firebase';
import PinNumpad from './PinNumpad';

const SlowChoresManager = ({ onBack, viewMode = 'checklist', defaultAuthenticated }) => {
  // Navigation tab: 'checklist' or 'scheduler'
  const [activeSubTab, setActiveSubTab] = useState(viewMode);

  // Authentication states for manager scheduler
  const [isAuthenticated, setIsAuthenticated] = useState(defaultAuthenticated || false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEntryManagerId, setSelectedEntryManagerId] = useState(null);
  const [entryPinError, setEntryPinError] = useState("");

  // Data states
  const [slowChoresList, setSlowChoresList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [choreName, setChoreName] = useState("");
  const [frequencyDays, setFrequencyDays] = useState(3);
  const [laborIntensity, setLaborIntensity] = useState("medium");
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [formSubtasks, setFormSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [editingChore, setEditingChore] = useState(null);
  const [managerError, setManagerError] = useState("");
  const [managerSuccess, setManagerSuccess] = useState("");

  // Operator select state for completion & subtasks
  const [completingChore, setCompletingChore] = useState(null);
  const [selectedCompleterId, setSelectedCompleterId] = useState("");
  const [localSubtasks, setLocalSubtasks] = useState([]);
  const [activeDragOverCol, setActiveDragOverCol] = useState(null);

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

  // Sync subtasks when completingChore changes
  useEffect(() => {
    if (completingChore) {
      setLocalSubtasks(completingChore.subtasks ? completingChore.subtasks.map(st => ({ ...st })) : []);
    } else {
      setLocalSubtasks([]);
    }
  }, [completingChore]);

  const handleLocalSubtaskToggle = (index) => {
    setLocalSubtasks(prev => prev.map((st, i) => i === index ? { ...st, is_completed: !st.is_completed } : st));
  };

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
    } catch {
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

    const subtaskObjects = formSubtasks.map(name => ({ name, is_completed: false }));

    try {
      const chorePayload = {
        name: choreName.trim(),
        frequency_days: Number(frequencyDays) || 3,
        labor_intensity: laborIntensity,
        days_of_week: daysOfWeek,
        subtasks: subtaskObjects
      };

      if (editingChore) {
        // Edit Chore
        const oldDays = [...(editingChore.days_of_week || [])].sort();
        const newDays = [...(daysOfWeek || [])].sort();
        const daysChanged = JSON.stringify(oldDays) !== JSON.stringify(newDays);
        if (daysChanged) {
          chorePayload.last_completed_at = null;
          chorePayload.last_completed_by_id = null;
          chorePayload.last_completed_by_name = null;
          chorePayload.created_at = new Date().toISOString();
        } else {
          chorePayload.created_at = editingChore.created_at || new Date().toISOString();
        }

        const updated = await updateSlowChore(editingChore.id, chorePayload);
        if (updated) {
          setManagerSuccess(`Successfully updated "${choreName.trim()}"`);
          handleCancelEdit();
          await loadSlowChores();
        } else {
          setManagerError("Failed to update slow chore.");
        }
      } else {
        // Add Chore
        chorePayload.created_at = new Date().toISOString();
        const added = await addSlowChore(chorePayload);
        if (added) {
          setManagerSuccess(`Successfully scheduled "${choreName.trim()}"`);
          handleCancelEdit();
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
    setFrequencyDays(chore.frequency_days || 3);
    setLaborIntensity(chore.labor_intensity || "medium");
    setDaysOfWeek(chore.days_of_week || []);
    setFormSubtasks(chore.subtasks ? chore.subtasks.map(s => s.name) : []);
    setManagerError("");
    setManagerSuccess("");
  };

  const handleCancelEdit = () => {
    setEditingChore(null);
    setChoreName("");
    setFrequencyDays(3);
    setLaborIntensity("medium");
    setDaysOfWeek([]);
    setFormSubtasks([]);
    setNewSubtaskText("");
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
        const resetSubtasks = localSubtasks.map(st => ({ ...st, is_completed: false }));
        const updated = await completeSlowChore(
          completingChore.id,
          employee.employee_id,
          employee.employee_name,
          resetSubtasks
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

  const handleSaveSubtaskProgress = async () => {
    if (!completingChore) return;
    try {
      const updated = await updateSlowChore(completingChore.id, {
        subtasks: localSubtasks
      });
      if (updated) {
        setCompletingChore(null);
        setSelectedCompleterId("");
        await loadSlowChores();
      } else {
        alert("Failed to save progress.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving progress.");
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, choreId, sourceColumn) => {
    e.dataTransfer.setData("text/plain", choreId);
    e.dataTransfer.setData("sourceColumn", sourceColumn);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    const choreId = e.dataTransfer.getData("text/plain");
    const sourceColumn = e.dataTransfer.getData("sourceColumn");

    if (sourceColumn === targetColumn) return;

    const chore = slowChoresList.find(c => c.id === choreId);
    if (!chore) return;

    let updatedDays = chore.days_of_week ? [...chore.days_of_week] : [];

    if (targetColumn === "unassigned") {
      updatedDays = [];
    } else {
      if (sourceColumn === "unassigned") {
        updatedDays = [targetColumn];
      } else {
        updatedDays = updatedDays.filter(d => d !== sourceColumn);
        if (!updatedDays.includes(targetColumn)) {
          updatedDays.push(targetColumn);
        }
      }
    }

    try {
      const updatePayload = {
        days_of_week: updatedDays,
        last_completed_at: null,
        last_completed_by_id: null,
        last_completed_by_name: null,
        created_at: new Date().toISOString()
      };
      const updated = await updateSlowChore(choreId, updatePayload);
      if (updated) {
        await loadSlowChores();
      }
    } catch (err) {
      console.error("Failed to update chore days via drag and drop:", err);
    }
  };

  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && val.seconds !== undefined) {
      return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper: get the first due date matching days_of_week on or after created_at
  const getFirstDueDate = useCallback((chore) => {
    if (!chore.days_of_week || chore.days_of_week.length === 0) {
      return null;
    }
    const startStr = chore.created_at || "2026-06-12T00:00:00.000Z";
    const startDate = new Date(startStr);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayName = days[checkDate.getDay()];
      if (chore.days_of_week.includes(dayName)) {
        checkDate.setHours(0, 0, 0, 0);
        return checkDate;
      }
    }
    return null;
  }, []);

  // Helper: check if due
  const isDue = useCallback((chore, nowTime, todayStart) => {
    if (!chore.days_of_week || chore.days_of_week.length === 0) {
      if (!chore.last_completed_at) return true;
      const d = parseDate(chore.last_completed_at);
      if (!d) return true;
      const elapsedMs = nowTime - d.getTime();
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      return elapsedDays >= chore.frequency_days;
    }

    if (chore.last_completed_at) {
      const d = parseDate(chore.last_completed_at);
      if (!d) return true;
      const elapsedMs = nowTime - d.getTime();
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      return elapsedDays >= chore.frequency_days;
    }

    const firstDue = getFirstDueDate(chore);
    if (!firstDue) return true;

    return todayStart.getTime() >= firstDue.getTime();
  }, [getFirstDueDate]);

  // Helper: calculate time remaining or overdue
  const getScheduleLabel = useCallback((chore, nowTime, todayStart) => {
    if (!chore.days_of_week || chore.days_of_week.length === 0) {
      if (!chore.last_completed_at) return "Never completed (Needs Attention)";
      const d = parseDate(chore.last_completed_at);
      if (!d) return "Never completed (Needs Attention)";
      
      const nextDueTime = d.getTime() + (chore.frequency_days * 24 * 60 * 60 * 1000);
      const diffMs = nextDueTime - nowTime;
      
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
    }

    // If never completed, show relative to first due date
    if (!chore.last_completed_at) {
      const firstDue = getFirstDueDate(chore);
      if (!firstDue) return "";

      const diffMs = firstDue.getTime() - todayStart.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "Due today";
      } else if (diffDays < 0) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const firstDueDayName = days[firstDue.getDay()];
        return `⚠️ Overdue since ${firstDueDayName}`;
      } else {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const firstDueDayName = days[firstDue.getDay()];
        return `Upcoming: starts ${firstDueDayName} (${diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`})`;
      }
    }

    // If completed, runs on frequency from last completion
    const d = parseDate(chore.last_completed_at);
    if (!d) return "";

    const nextDueTime = d.getTime() + (chore.frequency_days * 24 * 60 * 60 * 1000);
    const diffMs = nextDueTime - nowTime;

    if (diffMs <= 0) {
      const overdueDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      return overdueDays > 0 
        ? `⚠️ Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}`
        : "Due today";
    } else {
      const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (remainingDays > 0) {
        return `Due in ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      } else {
        const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
        return `Due in ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
    }
  }, [getFirstDueDate]);

  const [nowTimeForDue] = useState(() => Date.now());
  const todayStartForDue = useMemo(() => {
    const d = new Date(nowTimeForDue);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [nowTimeForDue]);

  const dueChores = useMemo(() => {
    return slowChoresList.filter(c => isDue(c, nowTimeForDue, todayStartForDue));
  }, [slowChoresList, nowTimeForDue, todayStartForDue, isDue]);

  const upcomingChores = useMemo(() => {
    return slowChoresList.filter(c => !isDue(c, nowTimeForDue, todayStartForDue));
  }, [slowChoresList, nowTimeForDue, todayStartForDue, isDue]);

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
              {viewMode === 'scheduler' ? 'Configure Slow Chores' : 'Slow Chores Scheduler'}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              {viewMode === 'scheduler' 
                ? 'Add, edit, or stagger periodic slow chores across days of the week.' 
                : 'Periodic chores completed during slow store hours to keep procedures running smoothly.'}
            </p>
          </div>
        </div>

        {/* Tab selection */}
        {viewMode !== 'checklist' && viewMode !== 'scheduler' && (
          <div className="nav-tabs" style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '8px' }}>
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
        )}
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
                {dueChores.map(chore => {
                  const completedSubtasksCount = chore.subtasks ? chore.subtasks.filter(s => s.is_completed).length : 0;
                  const totalSubtasksCount = chore.subtasks ? chore.subtasks.length : 0;
                  return (
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>{getScheduleLabel(chore, nowTimeForDue, todayStartForDue)}</span>
                          
                          {totalSubtasksCount > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ background: 'rgba(79, 70, 229, 0.06)', padding: '2px 8px', borderRadius: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                                {completedSubtasksCount} of {totalSubtasksCount} steps completed
                              </span>
                            </>
                          )}
                          
                          {chore.last_completed_at && (
                            <>
                              <span>•</span>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: getEmployeeAvatarStyle(chore.last_completed_by_name, allEmployees.find(e => e.employee_id === chore.last_completed_by_id)?.color).backgroundColor,
                                  color: getEmployeeAvatarStyle(chore.last_completed_by_name, allEmployees.find(e => e.employee_id === chore.last_completed_by_id)?.color).color,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.55rem',
                                  fontWeight: 700,
                                  lineHeight: 1
                                }}>
                                  {chore.last_completed_by_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <span>Last by {chore.last_completed_by_name} ({parseDate(chore.last_completed_at) ? parseDate(chore.last_completed_at).toLocaleDateString() : ''})</span>
                              </div>
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
                        <span>{totalSubtasksCount > 0 ? 'View Steps & Complete' : 'Mark Complete'}</span>
                      </button>
                    </div>
                  );
                })}
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{getScheduleLabel(chore, nowTimeForDue, todayStartForDue)}</span>
                        {chore.subtasks && chore.subtasks.length > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {chore.subtasks.length} steps
                            </span>
                          </>
                        )}
                         {chore.last_completed_at && (
                           <>
                             <span>•</span>
                             <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                               <div style={{
                                 width: '14px',
                                 height: '14px',
                                 borderRadius: '50%',
                                 background: getEmployeeAvatarStyle(chore.last_completed_by_name, allEmployees.find(e => e.employee_id === chore.last_completed_by_id)?.color).backgroundColor,
                                 color: getEmployeeAvatarStyle(chore.last_completed_by_name, allEmployees.find(e => e.employee_id === chore.last_completed_by_id)?.color).color,
                                 display: 'inline-flex',
                                 alignItems: 'center',
                                 justifyContent: 'center',
                                 fontSize: '0.55rem',
                                 fontWeight: 700,
                                 lineHeight: 1
                               }}>
                                 {chore.last_completed_by_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                               </div>
                               <span>Last: {chore.last_completed_by_name} ({parseDate(chore.last_completed_at) ? parseDate(chore.last_completed_at).toLocaleDateString() : ''})</span>
                             </div>
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

      {/* Completion & Subtask Checklist Modal */}
      {completingChore && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '450px', width: '100%', background: '#ffffff', color: 'var(--text-primary)', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Record Chore Completion</h3>
              </div>
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
            
            <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '16px', fontWeight: 600, textAlign: 'left' }}>
              Chore: <span style={{ color: 'var(--primary)' }}>{completingChore.name}</span>
            </p>

            {/* Subtasks Checklist */}
            {localSubtasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', textAlign: 'left' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Procedures / Steps Checklist
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                  {localSubtasks.map((st, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleLocalSubtaskToggle(idx)}
                      className={`member-item ${st.is_completed ? 'signed' : ''}`}
                      style={{ 
                        padding: '10px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer',
                        background: st.is_completed ? 'var(--accent-green-glow)' : 'rgba(0,0,0,0.02)',
                        borderColor: st.is_completed ? 'var(--accent-green)' : 'var(--glass-border)',
                        margin: 0
                      }}
                    >
                      <div className="task-checkbox" style={{ margin: 0, background: st.is_completed ? 'var(--accent-green)' : 'transparent', color: st.is_completed ? '#ffffff' : 'transparent', borderColor: st.is_completed ? 'var(--accent-green)' : 'var(--text-muted)', width: '16px', height: '16px' }}>
                        {st.is_completed && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-primary)',
                        textDecoration: st.is_completed ? 'line-through' : 'none',
                        fontWeight: 500,
                        textAlign: 'left'
                      }}>
                        {st.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '20px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Completed By
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedCompleterId && (() => {
                  const emp = allEmployees.find(e => e.employee_id === selectedCompleterId);
                  if (!emp) return null;
                  const initials = emp.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const avatarStyle = getEmployeeAvatarStyle(emp.employee_name, emp.color);
                  return (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: avatarStyle.backgroundColor,
                      color: avatarStyle.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {initials}
                    </div>
                  );
                })()}
                <select
                  className="form-input"
                  value={selectedCompleterId}
                  onChange={(e) => setSelectedCompleterId(e.target.value)}
                  style={{ padding: '10px', fontSize: '0.9rem', cursor: 'pointer', flexGrow: 1 }}
                >
                <option value="">Select Employee</option>
                {allEmployees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.employee_name} ({emp.role})
                  </option>
                ))}
              </select>
              </div>
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

              {localSubtasks.length > 0 && (
                <button 
                  className="btn btn-secondary w-full"
                  onClick={handleSaveSubtaskProgress}
                  style={{ color: 'var(--primary)' }}
                >
                  Save Progress
                </button>
              )}

              <button 
                className="btn btn-success w-full"
                onClick={handleChoreComplete}
                disabled={!selectedCompleterId || (localSubtasks.length > 0 && !localSubtasks.every(st => st.is_completed))}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Row 1: Drag & Drop Calendar Scheduler */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Weekly Schedule Calendar</h3>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    💡 Drag and drop cards to distribute chores and balance daily labor load.
                  </span>
                </div>

                {/* Calendar Columns Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', overflowX: 'auto', minWidth: '800px' }}>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => {
                    const dayChores = slowChoresList.filter(c => c.days_of_week && c.days_of_week.includes(day));
                    
                    // Labor Load Score Calculation
                    const score = dayChores.reduce((acc, c) => {
                      const weight = c.labor_intensity === 'high' ? 3 : c.labor_intensity === 'low' ? 1 : 2;
                      return acc + weight;
                    }, 0);
                    
                    let loadLabel = "Light Load";
                    let loadDot = "🟢";
                    let loadBg = "var(--accent-green-glow)";
                    let loadColor = "var(--accent-green)";
                    if (score > 5) {
                      loadLabel = "Heavy Load";
                      loadDot = "🔴";
                      loadBg = "var(--accent-red-glow)";
                      loadColor = "var(--accent-red)";
                    } else if (score >= 3) {
                      loadLabel = "Mod. Load";
                      loadDot = "🟡";
                      loadBg = "var(--primary-glow)";
                      loadColor = "var(--primary)";
                    } else if (score === 0) {
                      loadLabel = "Empty";
                      loadDot = "⚪";
                      loadBg = "rgba(0,0,0,0.02)";
                      loadColor = "var(--text-secondary)";
                    }

                    const isOver = activeDragOverCol === day;

                    return (
                      <div 
                        key={day}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setActiveDragOverCol(day)}
                        onDragLeave={() => setActiveDragOverCol(null)}
                        onDrop={(e) => {
                          setActiveDragOverCol(null);
                          handleDrop(e, day);
                        }}
                        style={{
                          background: isOver ? 'rgba(79, 70, 229, 0.08)' : 'rgba(255,255,255,0.2)',
                          border: isOver ? '2px dashed var(--primary)' : '1px solid var(--glass-border)',
                          borderRadius: '12px',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          minHeight: '260px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Column Header */}
                        <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{day}</span>
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.62rem', 
                              padding: '2px 6px', 
                              marginTop: '4px',
                              background: loadBg, 
                              color: loadColor, 
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>{loadDot}</span>
                            <span>{loadLabel} ({score})</span>
                          </span>
                        </div>

                        {/* Draggable Chores List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                          {dayChores.map(chore => (
                            <div
                              key={chore.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, chore.id, day)}
                              onClick={() => handleStartEdit(chore)}
                              className="slow-chore-calendar-card"
                              title="Click to edit, drag to reschedule"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left', wordBreak: 'break-word', lineHeight: '1.2' }}>
                                  {chore.name}
                                </span>
                                <Edit size={10} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginTop: '2px', flexShrink: 0 }} />
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ 
                                  fontSize: '0.55rem',
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  background: chore.labor_intensity === 'high' ? 'var(--accent-red-glow)' : chore.labor_intensity === 'low' ? 'var(--accent-green-glow)' : 'var(--primary-glow)',
                                  color: chore.labor_intensity === 'high' ? 'var(--accent-red)' : chore.labor_intensity === 'low' ? 'var(--accent-green)' : 'var(--primary)'
                                }}>
                                  {chore.labor_intensity ? chore.labor_intensity.toUpperCase() : 'MEDIUM'}
                                </span>
                                
                                {chore.subtasks && chore.subtasks.length > 0 && (
                                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', padding: '1px 4px', borderRadius: '4px' }}>
                                    📋 {chore.subtasks.length} steps
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Unassigned List + Add/Edit Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                
                {/* Unassigned Chores Column */}
                <div 
                  className="glass-panel" 
                  onDragOver={handleDragOver}
                  onDragEnter={() => setActiveDragOverCol("unassigned")}
                  onDragLeave={() => setActiveDragOverCol(null)}
                  onDrop={(e) => {
                    setActiveDragOverCol(null);
                    handleDrop(e, "unassigned");
                  }}
                  style={{ 
                    padding: '24px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    background: activeDragOverCol === 'unassigned' ? 'rgba(79, 70, 229, 0.05)' : 'rgba(255,255,255,0.45)',
                    border: activeDragOverCol === 'unassigned' ? '2px dashed var(--primary)' : '1px solid var(--glass-border)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                    <Settings size={20} style={{ color: 'var(--text-secondary)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Unassigned Chore Pool</h3>
                  </div>

                  {slowChoresList.filter(c => !c.days_of_week || c.days_of_week.length === 0).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-secondary)', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      <Check size={28} style={{ color: 'var(--accent-green)', marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>All Chores Scheduled</p>
                      <p style={{ fontSize: '0.75rem', marginTop: '2px' }}>Drag chores out of the calendar back here to unassign them.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                      {slowChoresList
                        .filter(c => !c.days_of_week || c.days_of_week.length === 0)
                        .map(chore => (
                          <div 
                            key={chore.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, chore.id, "unassigned")}
                            onClick={() => handleStartEdit(chore)}
                            className="member-item" 
                            style={{ 
                              padding: '12px 16px', 
                              background: '#ffffff', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ textAlign: 'left', flexGrow: 1, paddingRight: '10px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                                {chore.name}
                              </span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                <span style={{ 
                                  fontSize: '0.55rem', 
                                  padding: '1px 4px', 
                                  borderRadius: '4px',
                                  fontWeight: 700, 
                                  background: chore.labor_intensity === 'high' ? 'var(--accent-red-glow)' : chore.labor_intensity === 'low' ? 'var(--accent-green-glow)' : 'var(--primary-glow)',
                                  color: chore.labor_intensity === 'high' ? 'var(--accent-red)' : chore.labor_intensity === 'low' ? 'var(--accent-green)' : 'var(--primary)'
                                }}>
                                  {chore.labor_intensity ? chore.labor_intensity.toUpperCase() : 'MEDIUM'}
                                </span>
                                {chore.subtasks && chore.subtasks.length > 0 && (
                                  <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                    • {chore.subtasks.length} steps
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => handleStartEdit(chore)}
                                style={{ padding: '6px', borderRadius: '50%' }}
                                aria-label="Edit chore"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={(e) => { e.stopPropagation(); handleDeleteChore(chore.id, chore.name); }}
                                style={{ padding: '6px', borderRadius: '50%', color: 'var(--accent-red)' }}
                                aria-label="Delete chore"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Add / Edit Form Card */}
                <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px' }}>
                    <ShieldCheck size={20} style={{ color: 'var(--accent-green)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {editingChore ? 'Edit Scheduled Chore' : 'Add Scheduled Chore'}
                    </h3>
                  </div>

                  <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Labor Intensity
                        </label>
                        <select
                          className="form-input"
                          value={laborIntensity}
                          onChange={(e) => setLaborIntensity(e.target.value)}
                          style={{ padding: '8px', cursor: 'pointer' }}
                        >
                          <option value="low">🟢 Low Weight (1)</option>
                          <option value="medium">🔵 Medium Weight (2)</option>
                          <option value="high">🔴 High Weight (3)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                          Frequency Fallback
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={frequencyDays}
                          onChange={(e) => setFrequencyDays(e.target.value)}
                          required
                          title="Fallback interval if weekly calendar scheduling days are unselected."
                        />
                      </div>
                    </div>

                    {/* Days of Week Checkboxes */}
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Weekly Calendar Days (Staggering)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => {
                          const isChecked = daysOfWeek.includes(day);
                          return (
                            <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setDaysOfWeek(prev => prev.filter(d => d !== day));
                                  } else {
                                    setDaysOfWeek(prev => [...prev, day]);
                                  }
                                }}
                              />
                              <span>{day.slice(0, 3)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sub-tasks Section */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Sub-tasks / Procedures (Optional)
                      </label>
                      
                      {formSubtasks.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px', maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          {formSubtasks.map((st, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.04)' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexGrow: 1 }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                                  {idx + 1}.
                                </span>
                                <textarea
                                   rows={1}
                                   ref={el => {
                                     if (el) {
                                       el.style.height = 'auto';
                                       el.style.height = el.scrollHeight + 'px';
                                     }
                                   }}
                                   value={st}
                                   onChange={(e) => {
                                     const val = e.target.value;
                                     setFormSubtasks(prev => prev.map((item, i) => i === idx ? val : item));
                                   }}
                                   style={{
                                     border: 'none',
                                     background: 'transparent',
                                     fontSize: '0.78rem',
                                     color: 'var(--text-primary)',
                                     padding: '2px 4px',
                                     width: '100%',
                                     outline: 'none',
                                     borderRadius: '4px',
                                     resize: 'none',
                                     whiteSpace: 'pre-wrap',
                                     wordBreak: 'break-word',
                                     height: 'auto',
                                     fontFamily: 'inherit',
                                     transition: 'background-color 0.2s'
                                   }}
                                   onInput={(e) => {
                                     e.target.style.height = 'auto';
                                     e.target.style.height = e.target.scrollHeight + 'px';
                                   }}
                                   onFocus={(e) => { 
                                     e.target.style.backgroundColor = '#f0f0f5'; 
                                     e.target.style.height = e.target.scrollHeight + 'px';
                                   }}
                                   onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                                 />
                              </div>
                              <button
                                type="button"
                                onClick={() => setFormSubtasks(prev => prev.filter((_, i) => i !== idx))}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={newSubtaskText}
                          onChange={(e) => setNewSubtaskText(e.target.value)}
                          placeholder="e.g. Wipe down the counter tops"
                          style={{ padding: '8px', fontSize: '0.82rem' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newSubtaskText.trim()) {
                                setFormSubtasks(prev => [...prev, newSubtaskText.trim()]);
                                setNewSubtaskText("");
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            if (newSubtaskText.trim()) {
                              setFormSubtasks(prev => [...prev, newSubtaskText.trim()]);
                              newSubtaskText("");
                            }
                          }}
                        >
                          Add
                        </button>
                      </div>
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

              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
};

export default SlowChoresManager;
