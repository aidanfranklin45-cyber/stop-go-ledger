import { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';

const PinNumpad = ({ title = "Enter PIN", pinLength = 4, onPinComplete, onCancel, error }) => {
  const [pin, setPin] = useState("");

  // Clear PIN when an error occurs
  useEffect(() => {
    if (error) {
      setPin("");
    }
  }, [error]);

  // Reset PIN when the target title changes (meaning context changed to a different employee)
  useEffect(() => {
    setPin("");
  }, [title]);

  const handleNumberPress = (num) => {
    if (pin.length < pinLength) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === pinLength) {
        onPinComplete(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin("");
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div className="glass-panel p-6 w-full max-w-sm mx-auto flex flex-col items-center justify-center text-center animate-fade-in">
      {title && (
        <h3 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 600, 
            fontSize: '1.25rem',
            color: 'var(--text-primary)',
            marginBottom: '16px'
          }}
        >
          {title}
        </h3>
      )}
      
      {/* Dots Indicator */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
        {Array.from({ length: pinLength }).map((_, i) => (
          <div
            key={i}
            className={`numpad-dot ${i < pin.length ? 'active' : ''}`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div 
          style={{ 
            color: 'var(--accent-red)', 
            fontSize: '0.875rem', 
            marginBottom: '16px',
            fontWeight: 500,
            animation: 'pulseGlow 2s infinite'
          }}
        >
          {error}
        </div>
      )}

      {/* Numpad Grid */}
      <div className="numpad-container">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            className="numpad-btn"
            onClick={() => handleNumberPress(num.toString())}
            disabled={pin.length >= pinLength}
          >
            {num}
          </button>
        ))}
        {/* Clear Button (X) */}
        <button
          type="button"
          className="numpad-btn"
          style={{ color: 'var(--accent-red)' }}
          onClick={handleClear}
          aria-label="Clear PIN"
        >
          <X size={24} />
        </button>
        {/* Zero */}
        <button
          type="button"
          className="numpad-btn"
          onClick={() => handleNumberPress("0")}
          disabled={pin.length >= pinLength}
        >
          0
        </button>
        {/* Backspace Button (<-) */}
        <button
          type="button"
          className="numpad-btn"
          style={{ color: 'var(--text-secondary)' }}
          onClick={handleBackspace}
          aria-label="Backspace"
        >
          <Delete size={24} />
        </button>
      </div>

      {/* Cancel Button */}
      {onCancel && (
        <button
          type="button"
          className="btn btn-secondary mt-6 w-full"
          style={{ marginTop: '24px', width: '100%' }}
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
};

export default PinNumpad;
