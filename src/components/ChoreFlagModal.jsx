import { useState, useEffect } from 'react';
import { X, Upload, Camera, Check } from 'lucide-react';
import { getEmployees, validateEmployeePin } from '../firebase';

const ChoreFlagModal = ({ chore, shiftId, onClose, onSave }) => {
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const loadManagersList = async () => {
      try {
        const emps = await getEmployees();
        setManagers(emps.filter(e => e.role === 'manager' && e.is_active));
      } catch (err) {
        console.error("Failed to load managers:", err);
      }
    };
    loadManagersList();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result);
      setError("");
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setVerifying(true);

    if (!selectedManagerId) {
      setError("Please select your manager profile.");
      setVerifying(false);
      return;
    }

    if (!reason.trim()) {
      setError("Please explain the quality issue or reason for flagging.");
      setVerifying(false);
      return;
    }

    if (!pin || pin.length !== 6) {
      setError("Please enter your 6-digit PIN.");
      setVerifying(false);
      return;
    }

    try {
      const isValid = await validateEmployeePin(selectedManagerId, pin);
      if (!isValid) {
        setError("Invalid manager PIN code.");
        setVerifying(false);
        return;
      }

      const mgr = managers.find(m => m.id === selectedManagerId || m.employee_id === selectedManagerId);
      const flagData = {
        flagged_by_name: mgr?.employee_name || mgr?.name || "Manager",
        flagged_by_id: selectedManagerId,
        reason: reason.trim(),
        photo: photoBase64,
        flagged_at: new Date().toISOString()
      };

      await onSave(flagData);
    } catch (err) {
      console.error(err);
      setError("Failed to authorize and save flag.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '24px',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Accountability Flag
            </span>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              Flag Substandard Chore
            </h2>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Chore Summary Info */}
        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Chore details:</span>
          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{chore.task_name || chore.name}</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
            Completed by {chore.completed_by_name}
          </span>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Manager Picker */}
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Audited By (Manager)</label>
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="form-input"
              style={{ padding: '10px', fontSize: '0.85rem' }}
              required
            >
              <option value="">-- Select Manager Profile --</option>
              {managers.map(m => (
                <option key={m.employee_id || m.id} value={m.employee_id || m.id}>
                  {m.employee_name || m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reason text area */}
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quality Issue / Deficit Details</label>
            <textarea
              className="form-input"
              placeholder="Explain exactly what did not meet standards (e.g. 'Corners of floor not swept, trash bag was not replaced...')"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              style={{ padding: '10px', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical' }}
              required
            />
          </div>

          {/* Picture Upload Area */}
          <div className="form-group">
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Upload Audit Photo (Optional)</label>
            
            {!photoBase64 ? (
              <div 
                style={{
                  border: '2px dashed var(--glass-border)',
                  borderRadius: '8px',
                  padding: '24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
                <Camera size={32} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Tap or drag an image here to upload
                </p>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Max file size: 2MB</span>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                <img 
                  src={photoBase64} 
                  alt="Audit Preview" 
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={() => setPhotoBase64("")}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    border: 'none',
                    color: '#ffffff',
                    padding: '4px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Authorization PIN */}
          <div className="form-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Manager Verification PIN</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="form-input"
              style={{ letterSpacing: '0.3em', textAlign: 'center', fontSize: '1rem', padding: '8px' }}
              required
            />
          </div>

          {error && (
            <p style={{ color: 'var(--accent-red)', fontSize: '0.8rem', margin: 0, fontWeight: 500 }}>
              ⚠️ {error}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
              disabled={verifying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={verifying}
            >
              {verifying ? "Verifying..." : (
                <>
                  <Check size={16} />
                  <span>Flag Chore</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChoreFlagModal;
