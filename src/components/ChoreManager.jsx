import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Lock, 
  ShieldCheck, 
  ClipboardList,
  Wrench,
  Sparkles,
  ChefHat,
  Droplets,
  Home,
  ShieldAlert,
  DollarSign,
  Store,
  Pencil,
  X
} from 'lucide-react';
import { getEmployees, validateEmployeePin, getChoreTemplates, addChoreTemplate, deleteChoreTemplate, updateChoreTemplate } from '../firebase';
import PinNumpad from './PinNumpad';

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

const ChoreManager = ({ onBack, defaultAuthenticated }) => {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(defaultAuthenticated || false);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [pinError, setPinError] = useState("");

  // Editor states
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterShiftType, setFilterShiftType] = useState('opening');
  const [editingChore, setEditingChore] = useState(null);
  
  // Form input states
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Equipment");
  const [newShiftType, setNewShiftType] = useState("opening");

  const loadData = useCallback(async () => {
    try {
      const emps = await getEmployees();
      setAllEmployees(emps.filter(e => e.role === 'manager' && e.is_active));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getChoreTemplates();
      setTemplates(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTemplates();
    }
  }, [isAuthenticated, loadTemplates]);

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
    if (!newName.trim()) return;

    try {
      if (editingChore) {
        await updateChoreTemplate(editingChore.id, {
          name: newName.trim(),
          cat: newCategory,
          shift_type: newShiftType
        });
        setEditingChore(null);
      } else {
        await addChoreTemplate({
          name: newName.trim(),
          cat: newCategory,
          shift_type: newShiftType
        });
      }
      setNewName("");
      await loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (chore) => {
    setEditingChore(chore);
    setNewName(chore.name);
    setNewCategory(chore.cat);
    setNewShiftType(chore.shift_type);
  };

  const handleCancelEdit = () => {
    setEditingChore(null);
    setNewName("");
    setNewCategory("Equipment");
    setNewShiftType(filterShiftType);
  };

  const handleDeleteChore = async (id, name) => {
    if (editingChore && editingChore.id === id) {
      handleCancelEdit();
    }
    if (window.confirm(`Are you sure you want to delete the chore "${name}"?`)) {
      try {
        await deleteChoreTemplate(id);
        await loadTemplates();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'equipment': return <Wrench size={16} />;
      case 'heavy clean': return <Sparkles size={16} />;
      case 'prep': return <ChefHat size={16} />;
      case 'sanitation': return <Droplets size={16} />;
      case 'facilities': return <Home size={16} />;
      case 'food safety': return <ShieldAlert size={16} />;
      case 'financial': return <DollarSign size={16} />;
      case 'front of house': return <Store size={16} />;
      default: return <ClipboardList size={16} />;
    }
  };

  // Filter templates list
  const filteredTemplates = templates.filter(t => t.shift_type === filterShiftType);

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
          Please verify your manager authorization PIN code to access chore settings.
        </p>

        {selectedManagerId === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {managers.length === 0 ? (
              <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '16px' }}>
                No active managers registered. Please add a manager profile.
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

  // --- RENDERING MANAGER EDITOR DASHBOARD ---
  return (
    <div className="main-layout animate-fade-in" style={{ gridTemplateColumns: '1fr 400px' }}>
      
      {/* Left Column: Chore List */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
            <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>Chore Manager</h2>
          </div>

          {/* Toggle opening / closing chores */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn ${filterShiftType === 'opening' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem' }}
              onClick={() => {
                setFilterShiftType('opening');
                if (editingChore && editingChore.shift_type !== 'opening') {
                  handleCancelEdit();
                }
              }}
            >
              Opening Chores
            </button>
            <button
              type="button"
              className={`btn ${filterShiftType === 'closing' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem' }}
              onClick={() => {
                setFilterShiftType('closing');
                if (editingChore && editingChore.shift_type !== 'closing') {
                  handleCancelEdit();
                }
              }}
            >
              Closing Chores
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 10px', color: 'var(--text-secondary)', flexGrow: 1 }}>
            <ClipboardList size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <h3>No Chores Seeded</h3>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Use the form on the right to add chores to the {filterShiftType} shift.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flexGrow: 1, paddingRight: '4px' }}>
            {filteredTemplates.map(t => (
              <div 
                key={t.id} 
                className="member-item" 
                style={{ 
                  background: '#ffffff', 
                  borderColor: editingChore?.id === t.id ? 'var(--primary)' : 'rgba(15,23,42,0.06)',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                    {getCategoryIcon(t.cat)}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)', display: 'block' }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      Category: {t.cat}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(t)}
                    style={{ 
                      background: 'transparent',
                      border: 'none',
                      color: editingChore?.id === t.id ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '50%',
                      transition: 'all 0.2s',
                      backgroundColor: editingChore?.id === t.id ? 'var(--primary-glow)' : 'transparent'
                    }}
                    onMouseEnter={(e) => { 
                      if (editingChore?.id !== t.id) {
                        e.currentTarget.style.color = 'var(--primary)'; 
                        e.currentTarget.style.background = 'var(--primary-glow)'; 
                      }
                    }}
                    onMouseLeave={(e) => { 
                      if (editingChore?.id !== t.id) {
                        e.currentTarget.style.color = 'var(--text-muted)'; 
                        e.currentTarget.style.background = 'transparent'; 
                      }
                    }}
                    title="Edit Chore"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteChore(t.id, t.name)}
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
                    title="Delete Chore"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Column: Add/Edit Chore Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px' }}>
          {editingChore ? 'Edit Chore' : 'Add New Chore'}
        </h3>

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chore Description</label>
            <textarea
              className="form-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Wipe down the counter tops"
              required
              rows={3}
              style={{ resize: 'none', fontFamily: 'inherit', padding: '10px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
            <select
              className="form-input"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{ padding: '8px', cursor: 'pointer' }}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Shift Assignment</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${newShiftType === 'opening' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '8px' }}
                onClick={() => setNewShiftType('opening')}
              >
                Opening
              </button>
              <button
                type="button"
                className={`btn ${newShiftType === 'closing' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem', padding: '8px' }}
                onClick={() => setNewShiftType('closing')}
              >
                Closing
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            <button
              type="submit"
              className="btn btn-success w-full"
              style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              disabled={!newName.trim()}
            >
              {editingChore ? <ShieldCheck size={18} /> : <Plus size={18} />}
              <span>{editingChore ? 'Save Changes' : 'Add Chore'}</span>
            </button>
            {editingChore && (
              <button
                type="button"
                className="btn btn-secondary w-full"
                style={{ padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={handleCancelEdit}
              >
                <X size={14} />
                <span>Cancel Edit</span>
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};

export default ChoreManager;
