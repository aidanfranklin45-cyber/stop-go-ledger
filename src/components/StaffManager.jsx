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
  X,
  Clock,
  Flag,
  AlertTriangle
} from 'lucide-react';
import { getEmployees, validateEmployeePin, addEmployee, deleteEmployee, updateEmployeePin, updateEmployeeColor, updateEmployeeProfile, getSubmittedShifts, getActiveShift, getEmployeeAvatarStyle } from '../firebase';
import PinNumpad from './PinNumpad';

const StaffManager = ({ onBack, defaultAuthenticated }) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(defaultAuthenticated || false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [pinError, setPinError] = useState("");

  // Editor states
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [managerMessage, setManagerMessage] = useState("");
  const [managerError, setManagerError] = useState("");

  // Audit history states
  const [allShifts, setAllShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Form input states
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("operator");
  const [newPin, setNewPin] = useState("");
  const [editNameInput, setEditNameInput] = useState("");
  const [editIdInput, setEditIdInput] = useState("");

  useEffect(() => {
    if (editingEmployee) {
      setEditNameInput(editingEmployee.employee_name);
      setEditIdInput(editingEmployee.employee_id);
    } else {
      setEditNameInput("");
      setEditIdInput("");
    }
  }, [editingEmployee]);

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

  const fetchShiftsDetail = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const summaryList = await getSubmittedShifts();
      const detailedList = await Promise.all(
        summaryList.map(async (s) => {
          const fullShift = await getActiveShift(s.shift_id);
          return fullShift || s;
        })
      );
      const completedList = detailedList.filter(s => s.status === 'submitted' || s.status === 'missed_cleanup');
      setAllShifts(completedList);
    } catch (err) {
      console.error("Failed to fetch shifts for staff audit:", err);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchShiftsDetail();
    }
  }, [isAuthenticated, fetchShiftsDetail]);

  const getFlaggedInstances = (empId) => {
    const instances = [];
    allShifts.forEach(s => {
      if (s.tasks) {
        Object.values(s.tasks).forEach(t => {
          if (t.completed_by_id === empId && t.flag) {
            instances.push({
              ...t,
              shift_date: s.date,
              shift_type: s.shift_type,
              shift_id: s.shift_id
            });
          }
        });
      }
    });
    return instances.sort((a, b) => new Date(b.flag.flagged_at || '1970-01-01') - new Date(a.flag.flagged_at || '1970-01-01'));
  };

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

  const handleProfileUpdateSubmit = async (e) => {
    e.preventDefault();
    setManagerError("");
    setManagerMessage("");

    const trimmedName = editNameInput.trim();
    const trimmedId = editIdInput.trim();

    if (!trimmedName) {
      setManagerError("Employee name is required.");
      return;
    }
    if (!trimmedId) {
      setManagerError("Employee ID is required.");
      return;
    }

    if (trimmedId !== editingEmployee.employee_id) {
      const confirmChange = window.confirm(
        `Warning: Changing the Employee ID from "${editingEmployee.employee_id}" to "${trimmedId}" will modify their login credentials. Are you sure you want to proceed?`
      );
      if (!confirmChange) return;
    }

    try {
      setLoading(true);
      const updated = await updateEmployeeProfile(
        editingEmployee.employee_id,
        trimmedName,
        trimmedId
      );
      setManagerMessage(`Successfully updated profile for ${trimmedName}.`);
      
      setSelectedEmpId(updated.employee_id);
      setEditingEmployee(updated);
      
      await loadData();
    } catch (err) {
      console.error(err);
      setManagerError(err.message || "Failed to update employee profile.");
    } finally {
      setLoading(false);
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
          setSelectedEmpId(null);
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
  const flaggedInstances = selectedEmpId ? getFlaggedInstances(selectedEmpId) : [];

  return (
    <div className="main-layout animate-fade-in" style={{ gridTemplateColumns: '1fr 400px' }}>
      
      {/* Left Column: Staff Roster */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onBack}
              style={{ padding: '6px 10px', borderRadius: '50%' }}
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>Staff Manager</h2>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => {
              setSelectedEmpId(null);
              setEditingEmployee(null);
              setNewPin("");
              setManagerError("");
              setManagerMessage("");
            }}
          >
            <Plus size={14} />
            <span>New Staff</span>
          </button>
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
              const isSelected = selectedEmpId === emp.employee_id;
              const violations = getFlaggedInstances(emp.employee_id);
              const violationsCount = violations.length;

              return (
                <div 
                  key={emp.employee_id} 
                  className="member-item" 
                  onClick={() => {
                    setSelectedEmpId(emp.employee_id);
                    setEditingEmployee(emp);
                    setNewPin("");
                    setManagerError("");
                    setManagerMessage("");
                  }}
                  style={{ 
                    background: isSelected ? 'var(--primary-glow)' : '#ffffff', 
                    borderColor: isSelected ? 'var(--primary)' : 'rgba(15,23,42,0.06)',
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.08)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '50%', 
                      background: getEmployeeAvatarStyle(emp.employee_name, emp.color).backgroundColor,
                      color: getEmployeeAvatarStyle(emp.employee_name, emp.color).color,
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                      fontSize: '0.85rem', 
                      fontWeight: 'bold',
                      boxShadow: isSelected ? '0 0 8px rgba(79, 70, 229, 0.3)' : 'none'
                    }}>
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {violationsCount > 0 && (
                      <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Flag size={10} fill="currentColor" />
                        <span>{violationsCount} Flag{violationsCount > 1 ? 's' : ''}</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEmployee(emp.employee_id, emp.employee_name, emp.role);
                      }}
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

      {/* Right Column: Add/Edit/View Staff Profile */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 180px)', minHeight: '480px', overflowY: 'auto' }}>
        {selectedEmpId && editingEmployee ? (
          <>
            {/* Header / Meta */}
            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: getEmployeeAvatarStyle(editingEmployee.employee_name, editingEmployee.color).backgroundColor,
                color: getEmployeeAvatarStyle(editingEmployee.employee_name, editingEmployee.color).color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(15,23,42,0.1)'
              }}>
                {editingEmployee.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div style={{ flexGrow: 1 }}>
                <span className={`badge ${editingEmployee.role === 'manager' ? 'badge-pending' : 'badge-open'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', textTransform: 'capitalize', marginBottom: '4px', display: 'inline-block' }}>
                  {editingEmployee.role}
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
                  {editingEmployee.employee_name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {editingEmployee.employee_id}</span>
              </div>
            </div>

            {/* Edit Name & ID Form */}
            <form onSubmit={handleProfileUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Edit Name & ID
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    placeholder="Full Name"
                    required
                    style={{ flex: 2, padding: '8px' }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={editIdInput}
                    onChange={(e) => setEditIdInput(e.target.value)}
                    placeholder="ID"
                    required
                    style={{ flex: 1, minWidth: '80px', padding: '8px' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    disabled={!editNameInput.trim() || !editIdInput.trim() || (editNameInput.trim() === editingEmployee.employee_name && editIdInput.trim() === editingEmployee.employee_id)}
                  >
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Message banners */}
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

            {/* Change PIN Form */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Reset Register PIN (6 Digits)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                    placeholder="Enter 6-digit PIN"
                    required
                    style={{ flexGrow: 1, padding: '8px' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-success"
                    style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                    disabled={newPin.length !== 6}
                  >
                    <ShieldCheck size={16} />
                    <span>Save PIN</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Color Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Roster / Schedule Color
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {[
                  { name: "Neon Green", hex: "#26DE81" },
                  { name: "Rose Pink", hex: "#E29393" },
                  { name: "Olive Green", hex: "#6C9B50" },
                  { name: "Soft Blue", hex: "#4A86E8" },
                  { name: "Fuchsia", hex: "#E84393" },
                  { name: "Peach", hex: "#F9CB9C" },
                  { name: "Bright Yellow", hex: "#FFEB3B" },
                  { name: "Purple", hex: "#8E7CC3" },
                  { name: "Orange", hex: "#FF9900" },
                  { name: "Gray", hex: "#B7B7B7" },
                  { name: "Gold", hex: "#F1C232" },
                  { name: "Plum", hex: "#A64D79" },
                  { name: "Ice Blue", hex: "#9FC5E8" },
                  { name: "Bright Red", hex: "#FF3838" },
                  { name: "Soft Sage", hex: "#B6D7A8" },
                  { name: "Terracotta", hex: "#C05030" },
                  { name: "Teal", hex: "#1ABC9C" }
                ].map(c => {
                  const isCurrent = (editingEmployee.color || '').toUpperCase() === c.hex.toUpperCase() || 
                    (!editingEmployee.color && getEmployeeAvatarStyle(editingEmployee.employee_name).backgroundColor.toUpperCase() === c.hex.toUpperCase());
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={async () => {
                        try {
                          await updateEmployeeColor(editingEmployee.employee_id, c.hex);
                          setManagerMessage(`Updated color for ${editingEmployee.employee_name}.`);
                          setEditingEmployee(prev => ({ ...prev, color: c.hex }));
                          await loadData();
                        } catch (err) {
                          setManagerError("Failed to update employee color.");
                        }
                      }}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: c.hex,
                        border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        transform: isCurrent ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.1s ease',
                        boxShadow: isCurrent ? '0 0 6px rgba(79, 70, 229, 0.5)' : 'none'
                      }}
                      title={c.name}
                    />
                  );
                })}
                
                {/* Custom Color input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                  <input
                    type="color"
                    value={editingEmployee.color || getEmployeeAvatarStyle(editingEmployee.employee_name).backgroundColor}
                    onChange={async (e) => {
                      const newColor = e.target.value;
                      try {
                        await updateEmployeeColor(editingEmployee.employee_id, newColor);
                        setEditingEmployee(prev => ({ ...prev, color: newColor }));
                        await loadData();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      padding: 0,
                      background: 'none'
                    }}
                    title="Choose Custom Color"
                  />
                </div>
              </div>
            </div>

            {/* Guideline Violations List */}
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', marginTop: '10px' }}>
              <h4 style={{ 
                fontFamily: 'var(--font-display)', 
                fontWeight: 600, 
                fontSize: '0.95rem', 
                color: 'var(--text-primary)', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} className="text-danger" style={{ color: 'var(--accent-red)' }} />
                  <span>Guideline Violations</span>
                </span>
                <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                  {flaggedInstances.length} Total
                </span>
              </h4>

              {loadingShifts ? (
                <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                  <div style={{ width: '24px', height: '24px', border: '2.5px solid var(--glass-border)', borderTopColor: 'var(--accent-red)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : flaggedInstances.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '32px 16px', 
                  background: 'rgba(34, 197, 94, 0.03)', 
                  border: '1px dashed rgba(34, 197, 94, 0.2)', 
                  borderRadius: '8px',
                  color: 'var(--accent-green)',
                  fontSize: '0.85rem'
                }}>
                  <ShieldCheck size={28} style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>No guideline violations recorded.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', opacity: 0.75 }}>This staff member meets all standard guidelines.</p>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  overflowY: 'auto', 
                  paddingRight: '4px',
                  flexGrow: 1
                }}>
                  {flaggedInstances.map((item, idx) => (
                    <div 
                      key={`${item.shift_id}-${item.task_id}-${idx}`}
                      style={{
                        background: 'rgba(239, 68, 68, 0.02)',
                        border: '1px solid rgba(239, 68, 68, 0.12)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ maxWidth: '70%' }}>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'block', wordBreak: 'break-word' }}>
                            {item.task_name || item.name}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Category: {item.category || item.cat || 'General'}
                          </span>
                        </div>
                        <span className="badge badge-open" style={{ fontSize: '0.6rem', padding: '1px 4px', textTransform: 'capitalize' }}>
                          {item.shift_type}
                        </span>
                      </div>

                      <div style={{ 
                        background: 'rgba(0,0,0,0.01)', 
                        padding: '8px 10px', 
                        borderRadius: '6px', 
                        borderLeft: '3px solid var(--accent-red)',
                        fontSize: '0.8rem',
                        color: 'var(--text-primary)',
                        fontStyle: 'italic',
                        wordBreak: 'break-word'
                      }}>
                        "{item.flag.reason}"
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '0.7rem', 
                        color: 'var(--text-muted)',
                        marginTop: '2px'
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          {new Date(item.shift_date).toLocaleDateString()}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: getEmployeeAvatarStyle(item.flag.flagged_by_name).backgroundColor,
                            color: getEmployeeAvatarStyle(item.flag.flagged_by_name).color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.55rem',
                            fontWeight: 700,
                            lineHeight: 1
                          }}>
                            {item.flag.flagged_by_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <span>Flagged by {item.flag.flagged_by_name}</span>
                        </div>
                      </div>

                      {item.flag.photo && (
                        <div style={{ marginTop: '4px' }}>
                          <img 
                            src={item.flag.photo} 
                            alt="Audit proof" 
                            style={{ 
                              width: '60px', 
                              height: '45px', 
                              objectFit: 'cover', 
                              borderRadius: '4px', 
                              cursor: 'pointer',
                              border: '1px solid var(--glass-border)',
                              transition: 'transform 0.15s ease'
                            }}
                            onClick={() => setLightboxPhoto(item.flag.photo)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Standard Add Employee View */}
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
              Add New Employee
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

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Register PIN (6 Digits)</label>
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

              <button
                type="submit"
                className="btn btn-success w-full"
                style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                disabled={!newName.trim() || newPin.length !== 6}
              >
                <Plus size={18} />
                <span>Add Employee</span>
              </button>
            </form>
          </>
        )}
      </div>

      {/* Lightbox modal overlay */}
      {lightboxPhoto && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            animation: 'fade-in 0.2s ease-out'
          }}
          onClick={() => setLightboxPhoto(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              style={{
                position: 'absolute',
                top: '-45px',
                right: '0',
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <X size={20} />
            </button>
            <img 
              src={lightboxPhoto} 
              alt="Violation proof" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManager;
