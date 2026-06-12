import { useState } from 'react';
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
  AlertTriangle 
} from 'lucide-react';

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
  selectedCategory = 'All' 
}) => {
  const [activePickerTaskId, setActivePickerTaskId] = useState(null);

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'equipment': return <Wrench size={18} />;
      case 'heavy clean': return <Sparkles size={18} />;
      case 'prep': return <ChefHat size={18} />;
      case 'sanitation': return <Droplets size={18} />;
      case 'facilities': return <Home size={18} />;
      case 'food safety': return <ShieldAlert size={18} />;
      case 'financial': return <DollarSign size={18} />;
      case 'front of house': return <Store size={18} />;
      case 'inventory': return <ClipboardList size={18} />;
      default: return <ClipboardList size={18} />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  const tasks = shift?.tasks ? Object.values(shift.tasks) : [];

  // Filter tasks based on selectedCategory (ignore casing)
  const filteredTasks = selectedCategory && selectedCategory !== 'All' && selectedCategory !== 'all'
    ? tasks.filter(t => t.category?.toLowerCase() === selectedCategory.toLowerCase())
    : tasks;

  const handleCardClick = (task) => {
    if (task.is_completed) {
      if (window.confirm(`Mark "${task.task_name}" as incomplete?`)) {
        onTaskToggle(task.task_id, false, null, null);
      }
    } else {
      setActivePickerTaskId(task.task_id);
    }
  };

  return (
    <div className="ledger-container animate-fade-in">
      {tasks.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          No tasks found for this shift.
        </div>
      ) : (
        CATEGORIES.map(category => {
          // Filter tasks belonging to the current category loop
          const categoryTasks = filteredTasks.filter(
            t => t.category?.toLowerCase() === category.toLowerCase()
          );

          if (categoryTasks.length === 0) return null;

          const completedCount = categoryTasks.filter(t => t.is_completed).length;
          const totalCount = categoryTasks.length;

          return (
            <div key={category} className="category-group">
              <div className="category-title">
                {getCategoryIcon(category)}
                <span>{category}</span>
                <span 
                  style={{ 
                    fontSize: '0.8rem', 
                    color: 'var(--text-muted)', 
                    fontWeight: 500,
                    marginLeft: '4px' 
                  }}
                >
                  ({completedCount}/{totalCount})
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
                      style={{ position: 'relative', overflow: 'hidden' }}
                    >
                      {/* In-place operator picker overlay */}
                      {activePickerTaskId === task.task_id && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            inset: 0, 
                            background: 'var(--bg-deep)',
                            borderRadius: 'inherit',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            padding: '8px',
                            zIndex: 10,
                            border: '1px solid var(--glass-border-focus)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div 
                            style={{ 
                              fontSize: '0.75rem', 
                              color: 'var(--text-secondary)', 
                              marginBottom: '6px', 
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                          >
                            Completed By:
                          </div>
                          {activeTeam.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4px' }}>
                              <p style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginBottom: '8px' }}>
                                No checked-in operators.
                              </p>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                onClick={() => setActivePickerTaskId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div 
                              style={{ 
                                display: 'flex', 
                                flexWrap: 'wrap', 
                                gap: '6px', 
                                justifyContent: 'center', 
                                maxWidth: '100%',
                                maxHeight: '100%',
                                overflowY: 'auto'
                              }}
                            >
                              {activeTeam.map(member => {
                                const mId = member.employee_id || member.id;
                                const mName = member.employee_name || member.name;
                                return (
                                  <button
                                    key={mId}
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                                    onClick={() => {
                                      onTaskToggle(task.task_id, true, mId, mName);
                                      setActivePickerTaskId(null);
                                    }}
                                  >
                                    {mName}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                                onClick={() => setActivePickerTaskId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Task Content */}
                      <div className="task-checkbox">
                        {isCompleted && <Check size={14} strokeWidth={3} />}
                        {!isCompleted && isMissed && <AlertTriangle size={12} strokeWidth={3} />}
                      </div>

                      <div className="task-content">
                        <div className="task-name">{task.task_name}</div>
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
    </div>
  );
};

export default ChoreLedger;
