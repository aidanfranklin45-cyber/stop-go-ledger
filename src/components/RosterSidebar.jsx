import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, UserPlus } from 'lucide-react';
import PinNumpad from './PinNumpad';
import { getEmployeeAvatarStyle } from '../firebase';

const RosterSidebar = ({
  activeTeam = [],
  allEmployees = [],
  onAddMember,
  onRemoveMember,
  isReadOnly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('select'); // 'select' or 'pin'
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [error, setError] = useState("");

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.split(/\s+/);
    return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleOpenAddModal = () => {
    setIsOpen(true);
    setStep('select');
    setSelectedEmployeeId(null);
    setError("");
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setStep('select');
    setSelectedEmployeeId(null);
    setError("");
  };

  const handleSelectEmployee = (empId) => {
    setSelectedEmployeeId(empId);
    setStep('pin');
    setError("");
  };

  const handlePinComplete = async (pin) => {
    setError("");
    try {
      const result = await onAddMember(selectedEmployeeId, pin);
      // Support either true/false success return or throwing on validation failure
      if (result === false) {
        setError("Invalid PIN. Please try again.");
      } else {
        handleCloseModal();
      }
    } catch (err) {
      setError(err?.message || "PIN verification failed.");
    }
  };

  // Find employees who are NOT already checked in
  const activeIds = activeTeam.map(emp => emp.employee_id || emp.id);
  const eligibleEmployees = allEmployees.filter(emp => {
    const id = emp.employee_id || emp.id;
    return !activeIds.includes(id) && emp.is_active;
  });

  return (
    <div className="glass-panel roster-card w-full animate-fade-in">
      <div className="roster-header">
        <h2 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 600, 
            fontSize: '1.2rem',
            color: 'var(--text-primary)'
          }}
        >
          Shift Roster
        </h2>
        <span 
          className="badge badge-pending animate-pulse"
          style={{ fontSize: '0.75rem' }}
        >
          {activeTeam.length} Active
        </span>
      </div>

      {/* Active Team List */}
      <div className="roster-list" style={{ flexGrow: 1 }}>
        {activeTeam.length === 0 ? (
          <div 
            style={{ 
              color: 'var(--text-muted)', 
              fontSize: '0.875rem', 
              textAlign: 'center', 
              padding: '24px 0' 
            }}
          >
            No active team members.
          </div>
        ) : (
          activeTeam.map(emp => {
            const id = emp.employee_id || emp.id;
            const name = emp.employee_name || emp.name;
            const role = emp.role || "operator";
            return (
              <div key={id} className="member-item">
                <div className="member-info">
                  <div 
                    className="member-avatar"
                    style={{
                      background: getEmployeeAvatarStyle(name, emp.color).backgroundColor,
                      color: getEmployeeAvatarStyle(name, emp.color).color
                    }}
                  >
                    {getInitials(name)}
                  </div>
                  <div>
                    <div className="member-name">
                      {name}
                    </div>
                    <span 
                      className={`badge ${role === 'manager' ? 'badge-pending' : 'badge-open'}`} 
                      style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: '2px' }}
                    >
                      {role}
                    </span>
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember(id)}
                    style={{ 
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    title="Remove member"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Member Button */}
      {!isReadOnly && (
        <button
          type="button"
          className="btn btn-secondary w-full"
          style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleOpenAddModal}
        >
          <UserPlus size={18} />
          Add Member
        </button>
      )}

      {/* Add Member Modal Overlay */}
      {isOpen && createPortal(
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div 
            className="modal-content glass-panel" 
            style={{ maxWidth: '400px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'select' ? (
              <div>
                <h3 
                  style={{ 
                    fontFamily: 'var(--font-display)', 
                    fontWeight: 600, 
                    fontSize: '1.25rem',
                    color: 'var(--text-primary)',
                    marginBottom: '16px'
                  }}
                >
                  Select Employee
                </h3>
                {eligibleEmployees.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
                    All active employees are already checked in.
                  </p>
                ) : (
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px', 
                      maxHeight: '260px', 
                      overflowY: 'auto',
                      marginBottom: '20px',
                      paddingRight: '4px'
                    }}
                  >
                    {eligibleEmployees.map(emp => {
                      const id = emp.employee_id || emp.id;
                      const name = emp.employee_name || emp.name;
                      const role = emp.role || "operator";
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelectEmployee(id)}
                          className="member-item w-full"
                          style={{ 
                            textAlign: 'left', 
                            cursor: 'pointer', 
                            background: 'rgba(255, 255, 255, 0.02)',
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div className="member-info">
                            <div 
                              className="member-avatar"
                              style={{
                                background: getEmployeeAvatarStyle(name, emp.color).backgroundColor,
                                color: getEmployeeAvatarStyle(name, emp.color).color
                              }}
                            >
                              {getInitials(name)}
                            </div>
                            <div>
                              <div className="member-name">{name}</div>
                              <span 
                                className={`badge ${role === 'manager' ? 'badge-pending' : 'badge-open'}`} 
                                style={{ fontSize: '0.6rem', padding: '1px 5px', marginTop: '2px' }}
                              >
                                {role}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-secondary w-full"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <PinNumpad
                title={`Enter PIN for ${
                  allEmployees.find(e => (e.employee_id || e.id) === selectedEmployeeId)?.employee_name || 
                  allEmployees.find(e => (e.employee_id || e.id) === selectedEmployeeId)?.name
                }`}
                onPinComplete={handlePinComplete}
                onCancel={() => setStep('select')}
                error={error}
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RosterSidebar;
