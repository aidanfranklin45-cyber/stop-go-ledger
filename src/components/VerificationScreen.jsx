import { useState } from 'react';
import { Shield, Check, Lock, AlertTriangle, RotateCcw } from 'lucide-react';
import PinNumpad from './PinNumpad';
import { validateEmployeePin } from '../firebase';

const VerificationScreen = ({
  activeTeam = [],
  onSubmitSignatures,
  onResetShift
}) => {
  const [signature1, setSignature1] = useState(null);
  const [signature2, setSignature2] = useState(null);
  const [currentSigningIndex, setCurrentSigningIndex] = useState(null); // null, 1, or 2
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [pinError, setPinError] = useState("");

  const handleStartSigning = (index) => {
    setCurrentSigningIndex(index);
    setSelectedEmployeeId(null);
    setPinError("");
  };

  const handleCancelSigning = () => {
    setCurrentSigningIndex(null);
    setSelectedEmployeeId(null);
    setPinError("");
  };

  const handlePinComplete = async (pin) => {
    setPinError("");
    const signer = activeTeam.find(
      e => (e.employee_id || e.id) === selectedEmployeeId
    );
    const id = signer?.employee_id || signer?.id;
    const name = signer?.employee_name || signer?.name;

    if (!id) {
      setPinError("Invalid signer selection.");
      return;
    }

    try {
      const isValid = await validateEmployeePin(id, pin);
      if (isValid) {
        const sig = {
          employeeId: id,
          name: name,
          timestamp: new Date().toISOString()
        };

        if (currentSigningIndex === 1) {
          setSignature1(sig);
          setCurrentSigningIndex(null);
          setSelectedEmployeeId(null);
          // Auto-submit immediately if this is a single-operator shift
          if (activeTeam.length === 1) {
            onSubmitSignatures([sig]);
          }
        } else if (currentSigningIndex === 2) {
          setSignature2(sig);
          setCurrentSigningIndex(null);
          setSelectedEmployeeId(null);
          setPinError("");
          // Trigger the submission callback with both signatures
          onSubmitSignatures([signature1, sig]);
        }
      } else {
        setPinError("Invalid PIN. Verification failed.");
      }
    } catch {
      setPinError("PIN verification error occurred.");
    }
  };

  const handleResetSignatures = () => {
    setSignature1(null);
    setSignature2(null);
    setCurrentSigningIndex(null);
    setSelectedEmployeeId(null);
    setPinError("");
  };

  // Second signer MUST be different from the first signer
  const eligibleSigners = activeTeam.filter(member => {
    const id = member.employee_id || member.id;
    if (currentSigningIndex === 2 && signature1) {
      return id !== signature1.employeeId;
    }
    return true;
  });

  return (
    <div className="glass-panel sig-pad max-w-lg mx-auto w-full text-center p-8 animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div 
          style={{ 
            background: signature1 && signature2 ? 'var(--accent-green-glow)' : 'var(--primary-glow)',
            color: signature1 && signature2 ? 'var(--accent-green)' : 'var(--primary)',
            padding: '12px',
            borderRadius: '50%'
          }}
        >
          <Shield size={32} />
        </div>
      </div>

      <h2 
        style={{ 
          fontFamily: 'var(--font-display)', 
          fontWeight: 700, 
          fontSize: '1.6rem',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}
      >
        Shift Verification Seal
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
        Dual authentication is required to lock and submit this shift log.
      </p>

      {/* Signature Status Indicators */}
      <div className="sig-status-indicator" style={{ marginBottom: '28px' }}>
        <div className={`sig-pill ${signature1 ? 'signed' : ''}`}>
          {signature1 ? <Check size={16} /> : <Lock size={16} />}
          <span>
            {signature1 ? `Sig 1: ${signature1.name}` : "Signature 1: Pending"}
          </span>
        </div>
        {activeTeam.length >= 2 && (
          <div className={`sig-pill ${signature2 ? 'signed' : ''}`}>
            {signature2 ? <Check size={16} /> : <Lock size={16} />}
            <span>
              {signature2 ? `Sig 2: ${signature2.name}` : "Signature 2: Pending"}
            </span>
          </div>
        )}
      </div>

      {/* Main Flow Controller */}
      {currentSigningIndex === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
          {!signature1 && (
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => handleStartSigning(1)}
            >
              Verify Signature 1
            </button>
          )}
          {activeTeam.length >= 2 && signature1 && !signature2 && (
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => handleStartSigning(2)}
            >
              Verify Signature 2
            </button>
          )}
          {(signature1 || signature2) && (
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={handleResetSignatures}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <RotateCcw size={16} />
              Clear Signatures
            </button>
          )}

          {onResetShift && (
            <button
              type="button"
              className="btn btn-danger w-full"
              style={{ marginTop: '16px' }}
              onClick={() => {
                if (window.confirm("Are you sure you want to reset this shift? This will wipe the active checklists!")) {
                  onResetShift();
                }
              }}
            >
              Reset Shift Checklist
            </button>
          )}
        </div>
      ) : (
        /* Signing Sub-View */
        <div style={{ padding: '8px' }}>
          {selectedEmployeeId === null ? (
            <div className="glass-panel" style={{ padding: '20px', maxWidth: '360px', margin: '0 auto' }}>
              <h3 
                style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontWeight: 600, 
                  fontSize: '1.1rem',
                  color: 'var(--text-primary)',
                  marginBottom: '16px'
                }}
              >
                Select Signer for Signature {currentSigningIndex}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {eligibleSigners.map(member => {
                  const id = member.employee_id || member.id;
                  const name = member.employee_name || member.name;
                  const role = member.role || "operator";
                  return (
                    <button
                      key={id}
                      type="button"
                      className="btn btn-secondary text-left w-full"
                      style={{ justifyContent: 'space-between', display: 'flex' }}
                      onClick={() => setSelectedEmployeeId(id)}
                    >
                      <span>{name}</span>
                      <span className="badge badge-open" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                        {role}
                      </span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="btn btn-danger mt-4"
                  onClick={handleCancelSigning}
                  style={{ marginTop: '16px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <PinNumpad
              title={`Verify Signature ${currentSigningIndex} for ${
                eligibleSigners.find(e => (e.employee_id || e.id) === selectedEmployeeId)?.employee_name ||
                eligibleSigners.find(e => (e.employee_id || e.id) === selectedEmployeeId)?.name
              }`}
              onPinComplete={handlePinComplete}
              onCancel={() => setSelectedEmployeeId(null)}
              error={pinError}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationScreen;
