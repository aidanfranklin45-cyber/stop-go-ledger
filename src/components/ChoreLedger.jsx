
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
  selectedCategory = 'All',
  selectedOperatorId,
  setSelectedOperatorId
}) => {

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

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
        onTaskToggle(task.task_id, false, null, null);
      }
    } else {
      if (!activeOpId) {
        alert("Please check in or select an operator from the list first.");
        return;
      }
      onTaskToggle(task.task_id, true, activeOpId, activeOpName);
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
                      background: isSelected ? '#ffffff' : 'var(--primary)',
                      color: isSelected ? 'var(--primary)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700
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
    </div>
  );
};

export default ChoreLedger;
