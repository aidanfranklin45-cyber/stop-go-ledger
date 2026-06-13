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
                      style={{ position: 'relative' }}
                    >
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

      {/* Global Operator Picker Modal */}
      {activePickerTaskId && (
        <div className="modal-overlay" onClick={() => setActivePickerTaskId(null)}>
          <div 
            className="modal-content glass-panel animate-fade-in" 
            style={{ maxWidth: '400px', width: '100%', padding: '24px' }} 
            onClick={e => e.stopPropagation()}
          >
            <h3 
              style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 600, 
                fontSize: '1.25rem',
                color: 'var(--text-primary)',
                marginBottom: '12px' 
              }}
            >
              Assign Completion
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: '1.4' }}>
              {tasks.find(t => t.task_id === activePickerTaskId)?.task_name}
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeTeam.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px' }}>
                  <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4' }}>
                    Please check in at least one operator in the sidebar before completing tasks.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    onClick={() => setActivePickerTaskId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {activeTeam.map(member => {
                    const mId = member.employee_id || member.id;
                    const mName = member.employee_name || member.name;
                    return (
                      <button
                        key={mId}
                        type="button"
                        className="btn btn-primary w-full"
                        style={{ padding: '12px' }}
                        onClick={() => {
                          onTaskToggle(activePickerTaskId, true, mId, mName);
                          setActivePickerTaskId(null);
                        }}
                      >
                        {mName}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    style={{ marginTop: '8px' }}
                    onClick={() => setActivePickerTaskId(null)}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChoreLedger;
