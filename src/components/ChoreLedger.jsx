
import { useState, useEffect } from 'react';
import { 
  Wrench, 
  Sparkles, 
  ChefHat, 
  Droplets, 
  Home, 
  ShieldAlert, 
  DollarSign, 
  Store, 
  ClipboardList, 
  Clock, 
  User, 
  Check, 
  AlertTriangle,
  X 
} from 'lucide-react';
import { updateShiftNotes, getEmployeeAvatarStyle } from '../firebase';

const CATEGORIES = [
  "Equipment", 
  "Heavy Clean", 
  "Prep", 
  "Sanitation", 
  "Facilities", 
  "Food Safety", 
  "Financial", 
  "Front of House", 
  "Inventory"
];

const ChoreLedger = ({ 
  shift, 
  activeTeam = [], 
  onTaskToggle, 
  selectedCategory = 'All',
  selectedOperatorId,
  setSelectedOperatorId
}) => {
  const [notes, setNotes] = useState(shift?.notes || "");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [subtaskModalTask, setSubtaskModalTask] = useState(null);
  const [localSubtasks, setLocalSubtasks] = useState([]);

  // Sync subtasks local state when modal target changes
  useEffect(() => {
    if (subtaskModalTask) {
      setLocalSubtasks(subtaskModalTask.subtasks ? [...subtaskModalTask.subtasks] : []);
    } else {
      setLocalSubtasks([]);
    }
  }, [subtaskModalTask]);

  const handleLocalSubtaskToggle = (index) => {
    setLocalSubtasks(prev => prev.map((st, i) => i === index ? { ...st, is_completed: !st.is_completed } : st));
  };

  // Sync state if shift prop changes (e.g. initial load or reset)
  useEffect(() => {
    setNotes(shift?.notes || "");
  }, [shift?.notes]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!shift || notes === (shift.notes || "")) return;
    const timer = setTimeout(async () => {
      try {
        await updateShiftNotes(shift.shift_id, notes);
      } catch (err) {
        console.error("Failed to auto-save shift notes:", err);
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(timer);
  }, [notes, shift]);

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

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'equipment':      return <Wrench size={15} />;
      case 'heavy clean':    return <Sparkles size={15} />;
      case 'prep':           return <ChefHat size={15} />;
      case 'sanitation':     return <Droplets size={15} />;
      case 'facilities':     return <Home size={15} />;
      case 'food safety':    return <ShieldAlert size={15} />;
      case 'financial':      return <DollarSign size={15} />;
      case 'front of house': return <Store size={15} />;
      case 'inventory':      return <ClipboardList size={15} />;
      default:               return <ClipboardList size={15} />;
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'equipment':      '#3b82f6',
      'heavy clean':    '#8b5cf6',
      'prep':           '#f59e0b',
      'sanitation':     '#06b6d4',
      'facilities':     '#10b981',
      'food safety':    '#ef4444',
      'financial':      '#059669',
      'front of house': '#f97316',
      'inventory':      '#6366f1',
    };
    return colors[category?.toLowerCase()] || '#4f46e5';
  };

  const tasks = shift?.tasks ? Object.values(shift.tasks) : [];

  // Filter tasks based on selectedCategory (ignore casing)
  const filteredTasks = selectedCategory && selectedCategory !== 'All' && selectedCategory !== 'all'
    ? tasks.filter(t => t.category?.toLowerCase() === selectedCategory.toLowerCase())
    : tasks;

  // Resolve current active operator for one-tap clicks
  const currentActiveOp = activeTeam.find(t => (t.employee_id || t.id) === selectedOperatorId) || activeTeam[0];
  const activeOpId = currentActiveOp ? (currentActiveOp.employee_id || currentActiveOp.id) : null;
  const activeOpName = currentActiveOp ? (currentActiveOp.employee_name || currentActiveOp.name) : "";

  const handleCardClick = (task) => {
    if (task.is_completed) {
      if (window.confirm(`Mark "${task.task_name}" as incomplete?`)) {
        const resetSubtasks = task.subtasks ? task.subtasks.map(st => ({ ...st, is_completed: false })) : [];
        onTaskToggle(task.task_id, false, null, null, resetSubtasks);
      }
    } else {
      if (!activeOpId) {
        alert("Please check in or select an operator from the list first.");
        return;
      }
      if (task.subtasks && task.subtasks.length > 0) {
        setSubtaskModalTask(task);
      } else {
        onTaskToggle(task.task_id, true, activeOpId, activeOpName, []);
      }
    }
  };

  return (
    <div className="ledger-container animate-fade-in">
      {/* Active Operator Selection Bar */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.45)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Completing Chores As:
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {activeTeam.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-red)', fontWeight: 500 }}>
              ⚠️ No checked-in operators. Tap "+ Add Member" in the sidebar to log in.
            </span>
          ) : (
            activeTeam.map(member => {
              const id = member.employee_id || member.id;
              const name = member.employee_name || member.name;
              const isSelected = id === activeOpId;
              const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <button
                  key={id}
                  type="button"
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => {
                    setSelectedOperatorId(id);
                    localStorage.setItem('stop_go_selected_operator_id', id);
                  }}
                >
                  <div 
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      background: getEmployeeAvatarStyle(name, member.color).backgroundColor,
                      color: getEmployeeAvatarStyle(name, member.color).color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      border: isSelected ? '1px solid #ffffff' : 'none'
                    }}
                  >
                    {initials}
                  </div>
                  <span>{name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          No tasks found for this shift.
        </div>
      ) : (
        CATEGORIES.map(category => {
          const categoryTasks = filteredTasks.filter(
            t => t.category?.toLowerCase() === category.toLowerCase()
          );

          if (categoryTasks.length === 0) return null;

          const completedCount = categoryTasks.filter(t => t.is_completed).length;
          const totalCount = categoryTasks.length;

          const catColor = getCategoryColor(category);

          return (
            <div key={category} className="category-group">
              <div className="category-title">
                {/* Colored icon chip */}
                <span
                  className="category-title-icon"
                  style={{ '--cat-accent': catColor }}
                >
                  {getCategoryIcon(category)}
                </span>
                <span>{category}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: catColor,
                    fontWeight: 700,
                    background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
                    padding: '1px 8px',
                    borderRadius: '999px',
                    marginLeft: '2px',
                  }}
                >
                  {completedCount}/{totalCount}
                </span>
              </div>

              <div className="tasks-grid">
                {categoryTasks.map(task => {
                  const isCompleted = task.is_completed;
                  const isMissed = task.missed === true;
                  const cardClass = `task-card ${isCompleted ? 'completed' : ''} ${isMissed ? 'missed' : ''}`;

                  return (
                    <div
                      key={task.task_id}
                      className={cardClass}
                      onClick={() => handleCardClick(task)}
                      style={{ '--category-accent': catColor }}
                    >
                      {/* Task Content */}
                      <div className="task-checkbox">
                        {isCompleted && <Check size={14} strokeWidth={3} />}
                        {!isCompleted && isMissed && <AlertTriangle size={12} strokeWidth={3} />}
                      </div>

                      <div className="task-content">
                        <div className="task-name">{task.task_name}</div>
                        {task.subtasks && task.subtasks.length > 0 && !isCompleted && (
                          <div style={{ 
                            fontSize: '0.7rem', 
                            color: 'var(--text-secondary)', 
                            marginTop: '6px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            background: 'rgba(79, 70, 229, 0.06)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600
                          }}>
                            <ClipboardList size={11} style={{ color: 'var(--primary)' }} />
                            <span>
                              {task.subtasks.filter(st => st.is_completed).length} of {task.subtasks.length} steps
                            </span>
                          </div>
                        )}
                        {(isCompleted || isMissed) && (
                          <div className="task-meta">
                            {isCompleted && (
                              <>
                                <div className="task-meta-item">
                                  <User size={12} />
                                  <span>{task.completed_by_name}</span>
                                </div>
                                <div className="task-meta-item">
                                  <Clock size={12} />
                                  <span>{formatTime(task.timestamp)}</span>
                                </div>
                              </>
                            )}
                            {isMissed && (
                              <div className="task-meta-item" style={{ color: 'var(--accent-red)' }}>
                                <AlertTriangle size={12} />
                                <span>Missed in Cleanup</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Shift Notes Collapsible Panel */}
      {shift && (
        <div className="glass-panel" style={{ marginTop: '20px', background: 'rgba(255,255,255,0.45)', padding: '16px' }}>
          <button
            type="button"
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className="btn btn-secondary"
            style={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '10px 16px',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          >
            <span>📝 Shift Notes</span>
            <span>{isNotesOpen ? '▲' : '▼'}</span>
          </button>

          {isNotesOpen && (
            <div style={{ marginTop: '12px' }} className="animate-fade-in">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  shift.status === 'submitted' || shift.status === 'missed_cleanup'
                    ? "No notes recorded for this shift."
                    : "Add any shift notes, exceptions, or general hand-off updates here (autosaves)..."
                }
                disabled={shift.status === 'submitted' || shift.status === 'missed_cleanup'}
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
              {shift.status !== 'submitted' && shift.status !== 'missed_cleanup' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
                  Autosaving...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sub-tasks checklist modal */}
      {subtaskModalTask && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', zIndex: 1000, padding: '16px', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '24px', maxWidth: '450px', width: '100%', background: '#ffffff', color: 'var(--text-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              <div style={{ textAlign: 'left' }}>
                <span className="badge badge-open" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'inline-block', textTransform: 'uppercase' }}>
                  {subtaskModalTask.category}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {subtaskModalTask.task_name}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setSubtaskModalTask(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', textAlign: 'left' }}>
              Check off all steps to complete this chore.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {localSubtasks.map((st, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleLocalSubtaskToggle(idx)}
                  className={`member-item ${st.is_completed ? 'signed' : ''}`}
                  style={{ 
                    padding: '12px 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    cursor: 'pointer',
                    background: st.is_completed ? 'var(--accent-green-glow)' : 'rgba(0,0,0,0.02)',
                    borderColor: st.is_completed ? 'var(--accent-green)' : 'var(--glass-border)'
                  }}
                >
                  <div className="task-checkbox" style={{ margin: 0, background: st.is_completed ? 'var(--accent-green)' : 'transparent', color: st.is_completed ? '#ffffff' : 'transparent', borderColor: st.is_completed ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                    {st.is_completed && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span style={{ 
                    fontSize: '0.9rem', 
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

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary w-full"
                onClick={() => {
                  // Save partial progress
                  onTaskToggle(subtaskModalTask.task_id, false, null, null, localSubtasks);
                  setSubtaskModalTask(null);
                }}
              >
                Save Progress
              </button>
              <button 
                className="btn btn-success w-full"
                disabled={localSubtasks.length === 0 || !localSubtasks.every(st => st.is_completed)}
                onClick={() => {
                  // Complete the task
                  onTaskToggle(subtaskModalTask.task_id, true, activeOpId, activeOpName, localSubtasks);
                  setSubtaskModalTask(null);
                }}
              >
                Confirm Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChoreLedger;
