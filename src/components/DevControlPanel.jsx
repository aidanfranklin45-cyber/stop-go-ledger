import { useState, useEffect } from 'react';
import { X, RefreshCw, Terminal } from 'lucide-react';

const DevControlPanel = ({
  onCronSimulate,
  onSeedTestScenario,
  isLive = false,
  firebaseConfig = null,
  onSaveConfig,
  onClearConfig,
  isOpen = false,
  onClose
}) => {
  const [inputs, setInputs] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  });
  const [consoleLogs, setConsoleLogs] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(() => {
    return localStorage.getItem('stop_go_discord_webhook_url') || "";
  });
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleDiscordWebhookChange = (val) => {
    setDiscordWebhookUrl(val);
    localStorage.setItem('stop_go_discord_webhook_url', val);
  };

  const handleTestDiscordNotification = async () => {
    if (!discordWebhookUrl) {
      alert("Please enter a Discord Webhook URL first.");
      return;
    }
    setIsSendingTest(true);
    setConsoleLogs(prev => prev + `[${new Date().toLocaleTimeString()}] Sending test Discord notification...\n`);
    try {
      const payload = {
        content: "🔔 **Stop & Go Chores Notification Test** 🔔",
        embeds: [{
          title: "Webhook Configuration Test",
          description: "If you see this message, your Stop & Go webhook configuration is working perfectly!",
          color: 3066993, // Green
          timestamp: new Date().toISOString()
        }]
      };
      const response = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setConsoleLogs(prev => prev + `[${new Date().toLocaleTimeString()}] Test notification sent successfully!\n`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      setConsoleLogs(prev => prev + `[ERROR] Failed to send test notification: ${err?.message || err}\n`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Sync inputs with config if it changes
  useEffect(() => {
    if (firebaseConfig) {
      setInputs({
        apiKey: firebaseConfig.apiKey || "",
        authDomain: firebaseConfig.authDomain || "",
        projectId: firebaseConfig.projectId || "",
        storageBucket: firebaseConfig.storageBucket || "",
        messagingSenderId: firebaseConfig.messagingSenderId || "",
        appId: firebaseConfig.appId || ""
      });
    } else {
      setInputs({
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
      });
    }
  }, [firebaseConfig]);

  const handleInputChange = (field, val) => {
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveConfig(inputs);
  };

  const handleClear = () => {
    onClearConfig();
    setInputs({
      apiKey: "",
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    });
  };

  const handleCronSimulate = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setConsoleLogs(`[${new Date().toLocaleTimeString()}] Initializing daily shift cleanup simulation (04:00 AM Cron)...\n`);
    
    try {
      const payload = await onCronSimulate();
      
      let formattedOutput = `[${new Date().toLocaleTimeString()}] Simulation successful.\n`;
      if (!payload || payload.length === 0) {
        formattedOutput += `No open or pending shifts required cleanup.\n`;
      } else {
        formattedOutput += `Processed ${payload.length} shift(s):\n\n`;
        payload.forEach((shift, index) => {
          formattedOutput += `Shift #${index + 1}:\n`;
          formattedOutput += `  - ID: ${shift.shift_id}\n`;
          formattedOutput += `  - Type: ${shift.shift_type?.toUpperCase()}\n`;
          formattedOutput += `  - Date: ${shift.date}\n`;
          formattedOutput += `  - Status Prior: ${shift.status_before_cleanup}\n`;
          formattedOutput += `  - Completed Tasks: ${shift.completed_tasks}/${shift.total_tasks}\n`;
          formattedOutput += `  - Missed Tasks Sealed: ${shift.missed_tasks_count}\n`;
          formattedOutput += `  - Checked-In Operators: [${(shift.active_team || []).join(', ')}]\n\n`;
        });
      }
      
      setConsoleLogs(prev => prev + formattedOutput);
    } catch (err) {
      setConsoleLogs(prev => prev + `[ERROR] Simulation failed: ${err?.message || err}\n`);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className={`drawer ${isOpen ? 'open' : ''}`}>
      <div className="drawer-header">
        <h3 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 600, 
            fontSize: '1.25rem',
            color: 'var(--text-primary)'
          }}
        >
          Dev Control Panel
        </h3>
        <button 
          type="button" 
          className="drawer-close" 
          onClick={onClose}
          aria-label="Close Dev Panel"
        >
          <X size={24} />
        </button>
      </div>

      {/* Database Mode Status */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: isLive ? 'var(--accent-green)' : 'var(--accent-amber)',
              boxShadow: isLive ? '0 0 10px var(--accent-green)' : '0 0 10px var(--accent-amber)'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isLive ? "Live Connection (Firestore)" : "Mock Connection (Local Storage)"}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {isLive ? "Connected to Google Cloud Console" : "Running offline inside local browser database"}
            </span>
          </div>
        </div>
      </div>

      {/* Firebase Configurations */}
      <div>
        <h4 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 500, 
            fontSize: '1rem',
            color: 'var(--text-primary)',
            marginBottom: '12px'
          }}
        >
          Firestore Config
        </h4>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '0.7rem' }}>API Key</label>
            <input
              type="text"
              className="form-input"
              value={inputs.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="AIzaSy..."
            />
          </div>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '0.7rem' }}>Auth Domain</label>
            <input
              type="text"
              className="form-input"
              value={inputs.authDomain}
              onChange={(e) => handleInputChange('authDomain', e.target.value)}
              placeholder="stop-go-ledger.firebaseapp.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '0.7rem' }}>Project ID</label>
            <input
              type="text"
              className="form-input"
              value={inputs.projectId}
              onChange={(e) => handleInputChange('projectId', e.target.value)}
              placeholder="stop-go-ledger"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '0.7rem' }}>Storage Bucket</label>
            <input
              type="text"
              className="form-input"
              value={inputs.storageBucket}
              onChange={(e) => handleInputChange('storageBucket', e.target.value)}
              placeholder="stop-go-ledger.appspot.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '0.7rem' }}>Messaging Sender ID</label>
            <input
              type="text"
              className="form-input"
              value={inputs.messagingSenderId}
              onChange={(e) => handleInputChange('messagingSenderId', e.target.value)}
              placeholder="1234567890"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '0.7rem' }}>App ID</label>
            <input
              type="text"
              className="form-input"
              value={inputs.appId}
              onChange={(e) => handleInputChange('appId', e.target.value)}
              placeholder="1:12345:web:abcdef"
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            >
              Save & Link
            </button>
            {(firebaseConfig || isLive) && (
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                onClick={handleClear}
              >
                Go Offline
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Discord Webhook Setup */}
      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 500, 
            fontSize: '1rem',
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}
        >
          Discord Webhook Notification
        </h4>
        <div className="form-group">
          <label style={{ fontSize: '0.7rem' }}>Webhook URL</label>
          <input
            type="text"
            className="form-input"
            value={discordWebhookUrl}
            onChange={(e) => handleDiscordWebhookChange(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>
        <button
          type="button"
          className="btn btn-secondary w-full"
          style={{ fontSize: '0.8rem', padding: '6px 12px', marginTop: '4px' }}
          onClick={handleTestDiscordNotification}
          disabled={isSendingTest || !discordWebhookUrl}
        >
          {isSendingTest ? "Sending..." : "Send Test Notification"}
        </button>
      </div>

      {/* Simulated Cron Actions */}
      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 
          style={{ 
            fontFamily: 'var(--font-display)', 
            fontWeight: 500, 
            fontSize: '1rem',
            color: 'var(--text-primary)'
          }}
        >
          Cron Simulations
        </h4>
        <button
          type="button"
          className="btn btn-secondary w-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handleCronSimulate}
          disabled={isSimulating}
        >
          <RefreshCw size={16} className={isSimulating ? 'animate-spin' : ''} />
          {isSimulating ? "Running Cron..." : "Simulate 04:00 AM Clean"}
        </button>

        <button
          type="button"
          className="btn btn-success w-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
          onClick={async () => {
            setConsoleLogs(prev => prev + `[${new Date().toLocaleTimeString()}] Seeding active shift test scenario (14/24 chores completed)...\n`);
            try {
              await onSeedTestScenario();
              setConsoleLogs(prev => prev + `[${new Date().toLocaleTimeString()}] Test scenario seeded successfully! Active team: Alice, Charlie, David. Drawer closing.\n`);
            } catch (err) {
              setConsoleLogs(prev => prev + `[ERROR] Seeding failed: ${err?.message || err}\n`);
            }
          }}
        >
          Seed Active Shift Scenario
        </button>

        {/* Console logs */}
        {consoleLogs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Terminal size={14} />
              <span>Simulation Console Log</span>
            </div>
            <pre className="console-output">{consoleLogs}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevControlPanel;
