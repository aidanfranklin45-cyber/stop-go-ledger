import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Users, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  ArrowLeft 
} from 'lucide-react';
import { getSubmittedShifts, getActiveShift } from '../firebase';

const HistoryViewer = ({ onBack }) => {
  const [shifts, setShifts] = useState([]);
  const [selectedShiftId, setSelectedShiftId] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
    fetchShifts();
  }, [fetchShifts]);

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
    if (selectedShiftId) {
      fetchShiftDetail(selectedShiftId);
    } else {
      setSelectedShift(null);
    }
  }, [selectedShiftId, fetchShiftDetail]);

  const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return "";
    }
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

  return (
    <div className="main-layout animate-fade-in" style={{ gridTemplateColumns: '320px 1fr' }}>
      
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
              const isMissed = s.status === 'missed_cleanup';
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
                    
                    {isMissed ? (
                      <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Missed</span>
                    ) : (
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Sealed</span>
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
                {selectedShift.status === 'missed_cleanup' ? (
                  <div>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> Missed Cleanup
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Auto-archived: {formatDateTime(selectedShift.cleaned_up_at)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Submitted & Sealed
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Time: {formatDateTime(selectedShift.submitted_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Roster & Signatures Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.3)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> Checked-in Roster
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedShift.active_team_pids?.map(pid => (
                    <span key={pid} style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      ID: {pid}
                    </span>
                  ))}
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.3)' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> Signatures Sealed
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedShift.signatures && Array.isArray(selectedShift.signatures) ? (
                    selectedShift.signatures.map((s, idx) => (
                      <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{formatTime(s.timestamp)}</span>
                      </div>
                    ))
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
                              style={{ cursor: 'default' }}
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryViewer;
