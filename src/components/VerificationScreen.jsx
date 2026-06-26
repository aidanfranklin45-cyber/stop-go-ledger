import { useState } from 'react';
import { Shield, Check, Lock, RotateCcw, ArrowRight } from 'lucide-react';
import PinNumpad from './PinNumpad';
import { validateEmployeePin, getEmployeeAvatarStyle } from '../firebase';

const VerificationScreen = ({
  activeTeam = [],
  onSubmitSignatures,
  onResetShift,
  shift
}) => {
  const isClosing = shift?.shift_type === 'closing';

  // Till Discrepancy Form States
  const [tillStatus, setTillStatus] = useState(null); // 'balanced', 'over', 'under'
  const [tillAmount, setTillAmount] = useState("");
  const [tillReportLocked, setTillReportLocked] = useState(!isClosing);

  // Signature States
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

        const currentTillReport = isClosing ? {
          till_status: tillStatus,
          till_discrepancy_amount: tillStatus === 'balanced' ? 0 : parseFloat(tillAmount || "0")
        } : null;

        if (currentSigningIndex === 1) {
          setSignature1(sig);
          setCurrentSigningIndex(null);
          setSelectedEmployeeId(null);
          // Auto-submit immediately if this is a single-operator shift
          if (activeTeam.length === 1) {
            onSubmitSignatures([sig], currentTillReport);
          }
        } else if (currentSigningIndex === 2) {
          setSignature2(sig);
          setCurrentSigningIndex(null);
          setSelectedEmployeeId(null);
          setPinError("");
          // Trigger the submission callback with both signatures
          onSubmitSignatures([signature1, sig], currentTillReport);
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

  const handleLockTillReport = () => {
    if (tillStatus === 'balanced') {
      setTillAmount("0");
      setTillReportLocked(true);
    } else if (tillStatus && tillAmount && parseFloat(tillAmount) > 0) {
      setTillReportLocked(true);
    }
  };

  const handleUnlockTillReport = () => {
    setTillReportLocked(false);
    handleResetSignatures();
  };

  // Numpad handlers for discrepancy amount
  const handleAmountNumberPress = (num) => {
    setTillAmount(prev => {
      // Prevent multiple dots
      if (num === '.' && prev.includes('.')) return prev;
      // Prevent more than 2 decimal places
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return prev;
      }
      return prev + num;
    });
  };

  const handleAmountBackspace = () => {
    setTillAmount(prev => prev.slice(0, -1));
  };

  const handleAmountClear = () => {
    setTillAmount("");
  };

  // Second signer MUST be different from the first signer
  const eligibleSigners = activeTeam.filter(member => {
    const id = member.employee_id || member.id;
    if (currentSigningIndex === 2 && signature1) {
      return id !== signature1.employeeId;
    }
    return true;
  });

  const isTillFormValid = tillStatus === 'balanced' || (tillStatus && tillAmount && parseFloat(tillAmount) > 0);

  return (
    <div className="glass-panel sig-pad max-w-lg mx-auto w-full text-center p-8 animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div 
          style={{ 
            background: signature1 && (activeTeam.length === 1 || signature2) ? 'var(--accent-green-glow)' : 'var(--primary-glow)',
            color: signature1 && (activeTeam.length === 1 || signature2) ? 'var(--accent-green)' : 'var(--primary)',
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
        {activeTeam.length === 1 
          ? "Single authentication is required to lock and submit this shift log."
          : "Dual authentication is required to lock and submit this shift log."}
      </p>

      {/* STEP 1: Till Closing Report (For Closing Shift and Unlocked) */}
      {isClosing && !tillReportLocked ? (
        <div className="animate-fade-in" style={{ textAlign: 'left', maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>1. Till Closing Report</span>
            <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>Required</span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4' }}>
            How did the cash register balance compare to the expected till amount ($300.00)?
          </p>

          {/* Till Status Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              className={`btn ${tillStatus === 'balanced' ? 'btn-success' : 'btn-secondary'}`}
              onClick={() => { setTillStatus('balanced'); setTillAmount("0"); }}
              style={{ fontSize: '0.85rem', padding: '12px 6px' }}
            >
              Balanced
            </button>
            <button
              type="button"
              className={`btn ${tillStatus === 'over' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setTillStatus('over'); setTillAmount(""); }}
              style={{ fontSize: '0.85rem', padding: '12px 6px' }}
            >
              Over
            </button>
            <button
              type="button"
              className={`btn ${tillStatus === 'under' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={() => { setTillStatus('under'); setTillAmount(""); }}
              style={{ fontSize: '0.85rem', padding: '12px 6px' }}
            >
              Under
            </button>
          </div>

          {/* Amount Numpad for Over/Under */}
          {tillStatus && tillStatus !== 'balanced' && (
            <div className="glass-panel animate-fade-in" style={{ padding: '16px', marginBottom: '20px', background: 'rgba(0,0,0,0.01)' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Discrepancy Amount (USD)
              </label>
              
              <div 
                style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  color: tillStatus === 'over' ? 'var(--primary)' : 'var(--accent-red)',
                  textAlign: 'center',
                  marginBottom: '16px',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--glass-border)'
                }}
              >
                ${tillAmount || "0.00"}
              </div>

              {/* Grid of keys */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', maxWidth: '240px', margin: '0 auto' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    className="numpad-btn"
                    style={{ padding: '8px', fontSize: '1.1rem' }}
                    onClick={() => handleAmountNumberPress(num.toString())}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  className="numpad-btn"
                  style={{ padding: '8px', fontSize: '1.1rem' }}
                  onClick={() => handleAmountNumberPress(".")}
                >
                  .
                </button>
                <button
                  type="button"
                  className="numpad-btn"
                  style={{ padding: '8px', fontSize: '1.1rem' }}
                  onClick={() => handleAmountNumberPress("0")}
                >
                  0
                </button>
                <button
                  type="button"
                  className="numpad-btn"
                  style={{ padding: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}
                  onClick={handleAmountBackspace}
                >
                  DEL
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}
                  onClick={handleAmountClear}
                >
                  Clear Amount
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary w-full"
            style={{ padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            disabled={!isTillFormValid}
            onClick={handleLockTillReport}
          >
            <span>Confirm & Lock Till Report</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        /* STEP 2: Signatures (Lock mode active or not closing) */
        <div className="animate-fade-in">
          {/* Header indicating Till status */}
          {isClosing && tillReportLocked && (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '12px 16px', 
                marginBottom: '24px', 
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: tillStatus === 'balanced' ? 'var(--accent-green-glow)' : tillStatus === 'over' ? 'var(--primary-glow)' : 'var(--accent-red-glow)',
                borderColor: tillStatus === 'balanced' ? 'var(--accent-green)' : tillStatus === 'over' ? 'var(--primary)' : 'var(--accent-red)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>Till closing status</span>
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {tillStatus === 'balanced' && `✅ Balanced ($0.00)`}
                  {tillStatus === 'over' && `📈 Over (+$${Number(tillAmount).toFixed(2)})`}
                  {tillStatus === 'under' && `📉 Under (-$${Number(tillAmount).toFixed(2)})`}
                </span>
              </div>
              {currentSigningIndex === null && !signature1 && !signature2 && (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.4)', color: 'var(--text-primary)' }}
                  onClick={handleUnlockTillReport}
                >
                  Edit Report
                </button>
              )}
            </div>
          )}

          {/* Signature Status Indicators */}
          <div className="sig-status-indicator" style={{ marginBottom: '28px' }}>
            <div className={`sig-pill ${signature1 ? 'signed' : ''}`} style={{ gap: '8px' }}>
              {signature1 ? (
                <>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: getEmployeeAvatarStyle(signature1.name, activeTeam.find(e => (e.employee_id || e.id) === signature1.employeeId)?.color).backgroundColor,
                    color: getEmployeeAvatarStyle(signature1.name, activeTeam.find(e => (e.employee_id || e.id) === signature1.employeeId)?.color).color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    fontWeight: 700
                  }}>
                    {signature1.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <span>Sig 1: {signature1.name}</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Signature 1: Pending</span>
                </>
              )}
            </div>
            {activeTeam.length >= 2 && (
              <div className={`sig-pill ${signature2 ? 'signed' : ''}`} style={{ gap: '8px' }}>
                {signature2 ? (
                  <>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: getEmployeeAvatarStyle(signature2.name, activeTeam.find(e => (e.employee_id || e.id) === signature2.employeeId)?.color).backgroundColor,
                      color: getEmployeeAvatarStyle(signature2.name, activeTeam.find(e => (e.employee_id || e.id) === signature2.employeeId)?.color).color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 700
                    }}>
                      {signature2.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span>Sig 2: {signature2.name}</span>
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Signature 2: Pending</span>
                  </>
                )}
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
                  style={{ marginTop: '24px' }}
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
                      const avatarStyle = getEmployeeAvatarStyle(name, member.color);
                      return (
                        <button
                          key={id}
                          type="button"
                          className="btn btn-secondary text-left w-full"
                          style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
                          onClick={() => setSelectedEmployeeId(id)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: avatarStyle.backgroundColor,
                              color: avatarStyle.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 700
                            }}>
                              {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span>{name}</span>
                          </div>
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
      )}
    </div>
  );
};

export default VerificationScreen;
