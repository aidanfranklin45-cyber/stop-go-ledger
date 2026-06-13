import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Lock, 
  ShieldCheck, 
  Users,
  User,
  Key,
  X
} from 'lucide-react';
import { getEmployees, validateEmployeePin, addEmployee, deleteEmployee, updateEmployeePin } from '../firebase';
import PinNumpad from './PinNumpad';

const StaffManager = ({ onBack }) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [pinError, setPinError] = useState("");

  // Editor states
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [managerMessage, setManagerMessage] = useState("");
  const [managerError, setManagerError] = useState("");

  // Form input states
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("operator");
  const [newPin, setNewPin] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await getEmployees();
      setAllEmployees(emps.filter(e => e.role === 'manager' && e.is_active));
      setEmployeesList(emps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePinComplete = async (pin) => {
    setPinError("");
    if (!selectedManagerId) return;

    try {
      const isValid = await validateEmployeePin(selectedManagerId, pin);
      if (isValid) {
        setIsAuthenticated(true);
        setSelectedManagerId(null);
      } else {
        setPinError("Invalid manager PIN code.");
      }
    } catch (err) {
      setPinError("PIN verification error.");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setManagerError("");
    setManagerMessage("");

    if (editingEmployee) {
      // Edit PIN Mode
      if (!/^\d{6}$/.test(newPin)) {
        setManagerError("PIN code must be exactly 6 numeric digits.");
        return;
      }
      try {
        const success = await updateEmployeePin(editingEmployee.employee_id, newPin);
        if (success) {
          setManagerMessage(`Successfully updated PIN for ${editingEmployee.employee_name}.`);
          setEditingEmployee(null);
          setNewPin("");
          await loadData();
        } else {
          setManagerError("Failed to update PIN.");
        }
      } catch (err) {
        console.error(err);
        setManagerError("Error updating PIN.");
      }
    } else {
      // Add Employee Mode
      if (!newName.trim()) {
        setManagerError("Employee name is required.");
        return;
      }
      if (!/^\d{6}$/.test(newPin)) {
        setManagerError("PIN code must be exactly 6 numeric digits.");
        return;
      }
      try {
        await addEmployee({
          employee_name: newName.trim(),
          role: newRole,
          pin: newPin
        });
        setManagerMessage(`Successfully added employee ${newName.trim()}.`);
        setNewName("");
        setNewPin("");
        setNewRole("operator");
        await loadData();
      } catch (err) {
        console.error(err);
        setManagerError("Error adding employee.");
      }
    }
  };

  const handleStartEdit = (emp) => {
    setEditingEmployee(emp);
    setNewPin("");
    setNewName("");
    setManagerError("");
    setManagerMessage("");
  };

  const handleCancelEdit = () => {
    setEditingEmployee(null);
    setNewPin("");
    setManagerError("");
    setManagerMessage("");
  };

  const handleDeleteEmployee = async (empId, name, role) => {
    setManagerError("");
    setManagerMessage("");

    if (role === 'manager') {
      const activeManagers = employeesList.filter(e => e.role === 'manager' && e.is_active);
      if (activeManagers.length <= 1) {
        alert("Operation Denied: You cannot delete the last active manager profile.");
        return;
      }
    }

    if (window.confirm(`Are you sure you want to permanently delete employee ${name}?`)) {
      try {
        if (editingEmployee && editingEmployee.employee_id === empId) {
          handleCancelEdit();
        }
        await deleteEmployee(empId);
        setManagerMessage(`Successfully deleted employee ${name}.`);
        await loadData();
      } catch (err) {
        console.error(err);
        setManagerError("Failed to delete employee.");
      }
    }
  };

  // --- RENDERING AUTH GATE ---
  if (!isAuthenticated) {
    const managers = allEmployees;

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
          Please verify your manager authorization PIN code to access staff profiles.
        </p>

        {selectedManagerId === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {managers.length === 0 ? (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
                No active managers registered.
              </p>
            ) : (
              managers.map(mgr => (
                <button
                  key={mgr.employee_id}
                  type="button"
                  className="btn btn-secondary w-full"
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px' }}
                  onClick={() => setSelectedManagerId(mgr.employee_id)}
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
              onClick={onBack}
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
    );
  }

  // --- RENDERING STAFF EDITOR DASHBOARD ---
  return (
    <div className="main-layout animate-fade-in" style={{ gridTemplateColumns: '1fr 400px' }}>
      
      {/* Left Column: Staff Roster */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onBack}
            style={{ padding: '6px 10px', borderRadius: '50%' }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Staff Manager</h2>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : employeesList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--text-secondary)', flexGrow: 1 }}>
            <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3>No Employees Seeded</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
            {employeesList.map(emp => {
              const initials = emp.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div 
                  key={emp.employee_id} 
                  className="member-item" 
                  style={{ 
                    background: '#ffffff', 
                    borderColor: editingEmployee?.employee_id === emp.employee_id ? 'var(--primary)' : 'rgba(15,23,42,0.06)',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {initials}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>
                        {emp.employee_name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        ID: {emp.employee_id} | Role: <span className={`badge ${emp.role === 'manager' ? 'badge-pending' : 'badge-open'}`} style={{ fontSize: '0.6rem', padding: '1px 4px', textTransform: 'capitalize' }}>{emp.role}</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(emp)}
                      style={{ 
                        background: 'transparent',
                        border: 'none',
                        color: editingEmployee?.employee_id === emp.employee_id ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '50%',
                        transition: 'all 0.2s',
                        backgroundColor: editingEmployee?.employee_id === emp.employee_id ? 'var(--primary-glow)' : 'transparent'
                      }}
                      onMouseEnter={(e) => { 
                        if (editingEmployee?.employee_id !== emp.employee_id) {
                          e.currentTarget.style.color = 'var(--primary)'; 
                          e.currentTarget.style.background = 'var(--primary-glow)'; 
                        }
                      }}
                      onMouseLeave={(e) => { 
                        if (editingEmployee?.employee_id !== emp.employee_id) {
                          e.currentTarget.style.color = 'var(--text-muted)'; 
                          e.currentTarget.style.background = 'transparent'; 
                        }
                      }}
                      title="Change PIN"
                    >
                      <Key size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp.employee_id, emp.employee_name, emp.role)}
                      style={{ 
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '50%',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.background = 'var(--accent-red-glow)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                      title="Delete Staff Profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Add/Edit Staff Form */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
          {editingEmployee ? 'Change PIN' : 'Add New Employee'}
        </h3>

        {managerMessage && (
          <div style={{ color: 'var(--accent-green)', background: 'var(--accent-green-glow)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
            {managerMessage}
          </div>
        )}

        {managerError && (
          <div style={{ color: 'var(--accent-red)', background: 'var(--accent-red-glow)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
            {managerError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editingEmployee ? (
            <div className="form-group">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</label>
              <input
                type="text"
                className="form-input"
                value={editingEmployee.employee_name}
                disabled
                style={{ opacity: 0.8, cursor: 'not-allowed' }}
              />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Michael Jordan"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</label>
                <select
                  className="form-input"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ padding: '8px', cursor: 'pointer' }}
                >
                  <option value="operator">Operator (Standard Staff)</option>
                  <option value="manager">Manager (Admin Access)</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {editingEmployee ? 'New Register PIN (6 Digits)' : 'Register PIN (6 Digits)'}
            </label>
            <input
              type="text"
              pattern="\d*"
              maxLength={6}
              className="form-input"
              value={newPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, ''); // keep only numbers
                setNewPin(val);
              }}
              placeholder="e.g. 123456"
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn btn-success w-full"
              style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={editingEmployee ? newPin.length !== 6 : (!newName.trim() || newPin.length !== 6)}
            >
              {editingEmployee ? <ShieldCheck size={18} /> : <Plus size={18} />}
              <span>{editingEmployee ? 'Change PIN' : 'Add Employee'}</span>
            </button>
            {editingEmployee && (
              <button
                type="button"
                className="btn btn-secondary w-full"
                style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={handleCancelEdit}
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};

export default StaffManager;
