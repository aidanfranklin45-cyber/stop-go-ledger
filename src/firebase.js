import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

// ==============================================================================
// 1. MASTER SEED DATA
// ==============================================================================
export const SEED_EMPLOYEES = [
  { id: "EMP_01", name: "Alice Smith", pin: "111111", role: "manager", is_active: true },
  { id: "EMP_02", name: "Bob Jones", pin: "222222", role: "manager", is_active: true },
  { id: "EMP_03", name: "Charlie Brown", pin: "333333", role: "operator", is_active: true },
  { id: "EMP_04", name: "David Miller", pin: "444444", role: "operator", is_active: true },
  { id: "EMP_05", name: "Eva Davis", pin: "555555", role: "operator", is_active: true }
];

export const OPENING_TASKS = [
  { id: "OP_01", cat: "Equipment", name: "Turn on Ice Cream Machine" },
  { id: "OP_02", cat: "Heavy Clean", name: "Wipe underneath and behind fryers and Grille with De-Greaser" },
  { id: "OP_03", cat: "Equipment", name: "Turn on Fryers at 30 minutes prior to Opening" },
  { id: "OP_04", cat: "Equipment", name: "Turn on Grille and Hood Fan at 30 minutes prior to Opening" },
  { id: "OP_05", cat: "Facilities", name: "Water grass and Flowers" },
  { 
    id: "OP_06", 
    cat: "Sanitation", 
    name: "Prepare a bleach bucket with a cap full of bleach and 2/3 full of water",
    subtasks: [
      "Fill bucket 2/3 full of water",
      "Add cap full of bleach",
      "Test sanitizer concentration (100ppm)",
      "Distribute clean rags to stations"
    ]
  },
  { id: "OP_07", cat: "Prep", name: "Need three full half-inserts of sliced tomatoes - see what you have and cut what you need to make three total" },
  { id: "OP_08", cat: "Prep", name: "Need three full inserts of lettuce - Cored, Quartered and shredded thin - Wash lettuce after coring" },
  { id: "OP_09", cat: "Prep", name: "Need two full half-inserts of pickles" },
  { id: "OP_10", cat: "Prep", name: "Need two full half-inserts of onions" },
  { id: "OP_11", cat: "Prep", name: "Prep two half-inserts of mayonnaise" },
  { id: "OP_12", cat: "Prep", name: "Prep one half-insert of mustard" },
  { id: "OP_13", cat: "Prep", name: "Prep one half-insert of relish" },
  { id: "OP_14", cat: "Prep", name: "Portion containers of fry sauce" },
  { id: "OP_15", cat: "Prep", name: "Portion containers of tartar sauce" },
  { id: "OP_16", cat: "Prep", name: "Portion containers of ranch" },
  { id: "OP_17", cat: "Facilities", name: "Spray inside and outside of windows with Windex" },
  { id: "OP_18", cat: "Facilities", name: "Make sure all window wells are wiped free of gnats and counters look ready" },
  { id: "OP_19", cat: "Equipment", name: "Fill Soda Machine with Ice" },
  { id: "OP_20", cat: "Facilities", name: "Wipe down picnic tables with soapy water and rag (rag to dirty hamper after)" },
  { id: "OP_21", cat: "Equipment", name: "Scoop Fryers" },
  { id: "OP_22", cat: "Equipment", name: "Check Pop Machine Bags and CO2 Levels" },
  { 
    id: "OP_23", 
    cat: "Financial", 
    name: "Open Till at $300 and put some money in Till",
    subtasks: [
      "Verify starting cash register till balance is $300.00",
      "Separate bills and coins neatly by denomination",
      "Confirm coin rolls are in drawer backup"
    ]
  },
  { id: "OP_24", cat: "Front of House", name: "At 10:30 turn on open signs and bring out Sandwich Board" }
];

export const CLOSING_TASKS = [
  { id: "CL_01", cat: "Front of House", name: "At Closing Time turn off open signs and bring in sandwich board" },
  { 
    id: "CL_02", 
    cat: "Heavy Clean", 
    name: "Clean Grille - Empty and Scrape Grease Trap into Oil Bins outside",
    subtasks: [
      "Scrape flat top grill surface with grill brick",
      "Clean grease gutters and troughs",
      "Empty grease collection drawers",
      "Dispose of grease in external oil bin"
    ]
  },
  { id: "CL_03", cat: "Heavy Clean", name: "Empty above grille grease trap" },
  { id: "CL_04", cat: "Equipment", name: "Turn off Grille and Fryers" },
  { id: "CL_05", cat: "Heavy Clean", name: "Wipe around Grille and Fryers as best you can (Be careful, hot!)" },
  { id: "CL_06", cat: "Facilities", name: "Wipe down all Counters and Sweep all floors - Including underneath things" },
  { id: "CL_07", cat: "Food Safety", name: "Empty out drawers below grille and put that food in the walk-in (Ensure covered)" },
  { id: "CL_08", cat: "Food Safety", name: "Clean sandwich spread station and make sure all food is covered" },
  { id: "CL_09", cat: "Sanitation", name: "Clean dessert station, wash all utensils, and clean up lids" },
  { id: "CL_10", cat: "Food Safety", name: "Check Reach-in Freezer: bag/close food, clean up spilled food" },
  { id: "CL_11", cat: "Food Safety", name: "Check Walk-in Refrig and Freezer and make sure all food is covered" },
  { id: "CL_12", cat: "Equipment", name: "Ice in pop machine" },
  { id: "CL_13", cat: "Facilities", name: "Empty all garbages - Inside" },
  { id: "CL_14", cat: "Facilities", name: "Empty outside garbages that are over 1/2 full" },
  { 
    id: "CL_15", 
    cat: "Sanitation", 
    name: "Clean Bathroom - Cleanser and rubber gloves are in there",
    subtasks: [
      "Scrub toilet bowl, seat, and exterior surfaces",
      "Wipe down mirror, sink basin, and faucet fixture",
      "Empty bathroom waste receptacle",
      "Restock paper towels, toilet tissue rolls, and hand soap"
    ]
  },
  { id: "CL_16", cat: "Facilities", name: "Bring rug outside and shake" },
  { id: "CL_17", cat: "Facilities", name: "Mop and Scrub following detailed directions (includes bathroom, rug back when dry)" },
  { id: "CL_18", cat: "Equipment", name: "Fill Ice Cream Machine to Line" },
  { id: "CL_19", cat: "Equipment", name: "Clean pop machine, tray, back walls, spouts, scoop, and insert" },
  { id: "CL_20", cat: "Equipment", name: "Soak pop heads once per week overnight in light bleach solution" },
  { id: "CL_21", cat: "Equipment", name: "Clean bread tray and wipe down toaster" },
  { id: "CL_22", cat: "Inventory", name: "Take stock of supplies inventory" },
  { id: "CL_23", cat: "Facilities", name: "Lock the windows" },
  { id: "CL_24", cat: "Food Safety", name: "Put all Bread in the walk-in" },
  { id: "CL_25", cat: "Front of House", name: "Bring in Sandwich Board" },
  { id: "CL_26", cat: "Facilities", name: "Turn off Drive Thru, Menu Lights and Pepsi Signs" },
  { id: "CL_27", cat: "Financial", name: "Close out the Till" }
];

// ==============================================================================
// 2. HELPER: SHA-256 HASHING
// ==============================================================================
export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==============================================================================
// 3. FIREBASE CONFIGURATION MANAGEMENT
// ==============================================================================
let db = null;
let currentApp = null;

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function saveFirebaseConfig(config) {
  // Config is now hardcoded; this function is a no-op
  return true;
}

export function clearFirebaseConfig() {
  // Config is now hardcoded; this function is a no-op
}

let liveDisabled = false;

export function isLiveMode() {
  return db !== null && !liveDisabled;
}

function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
  ]);
}

export async function initializeFirebaseConnection(config = null) {
  // If running in a test environment, force mock mode (db = null)
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
    db = null;
    return false;
  }
  
  try {
    const apps = getApps();
    if (apps.length > 0) {
      await deleteApp(apps[0]);
    }
    currentApp = initializeApp(firebaseConfig);
    db = getFirestore(currentApp);
    return true;
  } catch (error) {
    console.error("Firebase Initialization Failed:", error);
    db = null;
    return false;
  }
}

// Initialize on load if not in test environment
if (typeof process === 'undefined' || !(process.env.VITEST || process.env.NODE_ENV === 'test')) {
  initializeFirebaseConnection();
}

// ==============================================================================
// 4. MOCK DATABASE (LOCAL STORAGE STATE MANAGER)
// ==============================================================================
const MOCK_KEY_EMPLOYEES = 'stop_go_mock_employees_v2';
const MOCK_KEY_SHIFTS = 'stop_go_mock_shifts';

async function initMockDatabase() {
  if (!localStorage.getItem(MOCK_KEY_EMPLOYEES)) {
    const hashedEmployees = [];
    for (const emp of SEED_EMPLOYEES) {
      const pin_hash = await hashPin(emp.pin);
      hashedEmployees.push({
        employee_id: emp.id,
        employee_name: emp.name,
        pin_hash,
        role: emp.role,
        is_active: emp.is_active
      });
    }
    localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(hashedEmployees));
  }
  if (!localStorage.getItem(MOCK_KEY_SHIFTS)) {
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify({}));
  }
}

// Call on startup
initMockDatabase();

// ==============================================================================
// 5. DATABASE OPERATIONS LAYER (UNI-INTERFACE)
// ==============================================================================

// --- Employees ---
export async function getEmployees() {
  if (isLiveMode()) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'employees')), 4000);
      const list = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      if (list.length === 0) {
        // Automatically seed live db if empty
        await seedLiveEmployees();
        return getEmployees();
      }
      return list;
    } catch (e) {
      console.error("Firestore getEmployees error, falling back to mock:", e);
      if (e.message === "Timeout") {
        console.warn("Firestore connection timed out. Disabling live mode and falling back to mock.");
        liveDisabled = true;
      }
    }
  }
  
  // Mock fallback
  return JSON.parse(localStorage.getItem(MOCK_KEY_EMPLOYEES) || '[]');
}

async function seedLiveEmployees() {
  if (!db) return;
  for (const emp of SEED_EMPLOYEES) {
    const pin_hash = await hashPin(emp.pin);
    const docRef = doc(db, 'employees', emp.id);
    await setDoc(docRef, {
      employee_id: emp.id,
      employee_name: emp.name,
      pin_hash,
      role: emp.role,
      is_active: emp.is_active
    });
  }
}

export async function validateEmployeePin(employeeId, pin) {
  const pinHash = await hashPin(pin);
  const emps = await getEmployees();
  const emp = emps.find(e => e.employee_id === employeeId);
  return emp && emp.pin_hash === pinHash;
}

// --- Shifts & Tasks ---
export async function getActiveShift(shiftId) {
  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      const docSnap = await withTimeout(getDoc(shiftDocRef), 4000);
      if (!docSnap.exists()) return null;

      const shiftData = docSnap.data();
      
      // Fetch tasks subcollection
      const tasksSnap = await withTimeout(getDocs(collection(db, 'active_shifts', shiftId, 'tasks')), 4000);
      const tasks = {};
      tasksSnap.forEach(tDoc => {
        tasks[tDoc.id] = tDoc.data();
      });
      
      return {
        ...shiftData,
        tasks
      };
    } catch (e) {
      console.error("Firestore getActiveShift error:", e);
      if (e.message === "Timeout") {
        console.warn("Firestore connection timed out. Disabling live mode and falling back to mock.");
        liveDisabled = true;
      }
    }
  }

  // Mock
  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  return shifts[shiftId] || null;
}

export async function startShift(shiftId, shiftType, date, activeTeamPids) {
  const allTemplates = await getChoreTemplates();
  const taskTemplate = allTemplates.filter(t => t.shift_type === shiftType);
  const initialTasks = {};
  
  taskTemplate.forEach(t => {
    initialTasks[t.id] = {
      task_id: t.id,
      task_name: t.name,
      category: t.cat,
      is_completed: false,
      completed_by_id: null,
      completed_by_name: null,
      timestamp: null,
      requires_verification: false,
      subtasks: t.subtasks ? t.subtasks.map(stName => ({ name: stName, is_completed: false })) : []
    };
  });

  const shiftData = {
    shift_id: shiftId,
    shift_type: shiftType,
    date: date,
    initialized_at: new Date().toISOString(),
    active_team_pids: activeTeamPids,
    status: "open",
    completed_count: 0,
    total_count: taskTemplate.length,
    tasks: initialTasks
  };

  if (isLiveMode()) {
    try {
      // 1. Write the main shift document
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await setDoc(shiftDocRef, {
        shift_id: shiftId,
        shift_type: shiftType,
        date: date,
        initialized_at: serverTimestamp(),
        active_team_pids: activeTeamPids,
        status: "open",
        completed_count: 0,
        total_count: taskTemplate.length
      });

      // 2. Write all task subcollection documents
      for (const tId in initialTasks) {
        const taskDocRef = doc(db, 'active_shifts', shiftId, 'tasks', tId);
        await setDoc(taskDocRef, initialTasks[tId]);
      }

      return shiftData;
    } catch (e) {
      console.error("Firestore startShift error:", e);
    }
  }

  // Mock write
  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  shifts[shiftId] = shiftData;
  localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
  return shiftData;
}

export async function seedTestScenario(shiftId, shiftType, date) {
  const activeTeamPids = ["EMP_01", "EMP_03", "EMP_04"]; // Alice, Charlie, David
  const allTemplates = await getChoreTemplates();
  const taskTemplate = allTemplates.filter(t => t.shift_type === shiftType);
  const initialTasks = {};
  
  const teamList = [
    { id: "EMP_01", name: "Alice Smith" },
    { id: "EMP_03", name: "Charlie Brown" },
    { id: "EMP_04", name: "David Miller" }
  ];

  let completedCount = 0;
  const tasksToCompleteCount = Math.min(14, taskTemplate.length);

  taskTemplate.forEach((t, index) => {
    const shouldComplete = index < tasksToCompleteCount;
    const completedBy = shouldComplete ? teamList[index % teamList.length] : null;
    const timeOffset = (tasksToCompleteCount - index) * 2 * 60 * 1000;
    const timestamp = shouldComplete ? new Date(Date.now() - timeOffset).toISOString() : null;

    if (shouldComplete) completedCount++;

    const subtasks = t.subtasks 
      ? t.subtasks.map(stName => ({ name: stName, is_completed: shouldComplete })) 
      : [];

    initialTasks[t.id] = {
      task_id: t.id,
      task_name: t.name,
      category: t.cat,
      is_completed: shouldComplete,
      completed_by_id: completedBy ? completedBy.id : null,
      completed_by_name: completedBy ? completedBy.name : null,
      timestamp: timestamp,
      requires_verification: false,
      subtasks: subtasks
    };
  });

  const shiftData = {
    shift_id: shiftId,
    shift_type: shiftType,
    date: date,
    initialized_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    active_team_pids: activeTeamPids,
    status: "open",
    completed_count: completedCount,
    total_count: taskTemplate.length,
    tasks: initialTasks
  };

  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await setDoc(shiftDocRef, {
        shift_id: shiftId,
        shift_type: shiftType,
        date: date,
        initialized_at: serverTimestamp(),
        active_team_pids: activeTeamPids,
        status: "open",
        completed_count: completedCount,
        total_count: taskTemplate.length
      });

      for (const tId in initialTasks) {
        const taskDocRef = doc(db, 'active_shifts', shiftId, 'tasks', tId);
        await setDoc(taskDocRef, initialTasks[tId]);
      }

      return shiftData;
    } catch (e) {
      console.error("Firestore seedTestScenario error:", e);
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  shifts[shiftId] = shiftData;
  localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
  return shiftData;
}

export async function updateTask(shiftId, taskId, isCompleted, completedById, completedByName, subtasks = null) {
  const timestamp = isCompleted ? new Date().toISOString() : null;

  if (isLiveMode()) {
    try {
      // Update task in subcollection
      const taskDocRef = doc(db, 'active_shifts', shiftId, 'tasks', taskId);
      const updateData = {
        is_completed: isCompleted,
        completed_by_id: completedById,
        completed_by_name: completedByName,
        timestamp: isCompleted ? serverTimestamp() : null
      };
      if (subtasks !== null) {
        updateData.subtasks = subtasks;
      }
      await updateDoc(taskDocRef, updateData);

      // Recalculate completed count on Firestore
      const tasksSnap = await getDocs(collection(db, 'active_shifts', shiftId, 'tasks'));
      let completedCount = 0;
      tasksSnap.forEach(tDoc => {
        if (tDoc.data().is_completed) completedCount++;
      });

      // Update shift stats
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await updateDoc(shiftDocRef, {
        completed_count: completedCount
      });

      // Return local representation
      const fullShift = await getActiveShift(shiftId);
      return fullShift;
    } catch (e) {
      console.error("Firestore updateTask error:", e);
    }
  }

  // Mock update
  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const shift = shifts[shiftId];
  if (shift && shift.tasks[taskId]) {
    shift.tasks[taskId].is_completed = isCompleted;
    shift.tasks[taskId].completed_by_id = completedById;
    shift.tasks[taskId].completed_by_name = completedByName;
    shift.tasks[taskId].timestamp = timestamp;
    if (subtasks !== null) {
      shift.tasks[taskId].subtasks = subtasks;
    }

    // Recalculate completion
    let completedCount = 0;
    Object.values(shift.tasks).forEach(t => {
      if (t.is_completed) completedCount++;
    });
    shift.completed_count = completedCount;
    
    // Auto status advance if finished all tasks
    if (completedCount === shift.total_count && shift.status === 'open') {
      shift.status = 'pending_signatures';
    } else if (completedCount < shift.total_count && shift.status === 'pending_signatures') {
      shift.status = 'open';
    }

    shifts[shiftId] = shift;
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return shift;
  }
  return null;
}

export async function updateShiftRoster(shiftId, activeTeamPids) {
  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await updateDoc(shiftDocRef, {
        active_team_pids: activeTeamPids
      });
      return await getActiveShift(shiftId);
    } catch (e) {
      console.error("Firestore updateShiftRoster error:", e);
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const shift = shifts[shiftId];
  if (shift) {
    shift.active_team_pids = activeTeamPids;
    shifts[shiftId] = shift;
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return shift;
  }
  return null;
}

export async function updateShiftStatus(shiftId, status) {
  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await updateDoc(shiftDocRef, {
        status: status
      });
      return await getActiveShift(shiftId);
    } catch (e) {
      console.error("Firestore updateShiftStatus error:", e);
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const shift = shifts[shiftId];
  if (shift) {
    shift.status = status;
    shifts[shiftId] = shift;
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return shift;
  }
  return null;
}

export async function submitShiftSignatures(shiftId, signatures, tillReport = null) {
  const tillData = tillReport ? {
    till_status: tillReport.till_status,
    till_discrepancy_amount: tillReport.till_discrepancy_amount
  } : {};

  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await updateDoc(shiftDocRef, {
        status: "submitted",
        signatures: signatures,
        submitted_at: serverTimestamp(),
        ...tillData
      });
      return await getActiveShift(shiftId);
    } catch (e) {
      console.error("Firestore submitShift error:", e);
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const shift = shifts[shiftId];
  if (shift) {
    shift.status = 'submitted';
    shift.signatures = signatures;
    shift.submitted_at = new Date().toISOString();
    if (tillReport) {
      shift.till_status = tillReport.till_status;
      shift.till_discrepancy_amount = tillReport.till_discrepancy_amount;
    }
    shifts[shiftId] = shift;
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return shift;
  }
  return null;
}

export async function sendDiscordNotification(shift, webhookUrl) {
  if (!webhookUrl) return;

  try {
    let tillStatusText = "N/A (Opening Shift)";
    let alertPrefix = "";
    let color = 5814783; // Blueish color (Decimal for Hex: 58B9FF)
    
    if (shift.shift_type === 'closing') {
      if (shift.till_status === 'balanced') {
        tillStatusText = "✅ Balanced ($0.00)";
        color = 3066993; // Green
      } else if (shift.till_status === 'over') {
        tillStatusText = `📈 Over (+$${Number(shift.till_discrepancy_amount).toFixed(2)})`;
        color = 15105570; // Orange
        if (shift.till_discrepancy_amount >= 10) {
          alertPrefix = "🚨 **LARGE TILL DISCREPANCY** 🚨\n";
          color = 15158332; // Red
        }
      } else if (shift.till_status === 'under') {
        tillStatusText = `📉 Under (-$${Number(shift.till_discrepancy_amount).toFixed(2)})`;
        color = 15158332; // Red
        alertPrefix = "🚨 **TILL IS UNDER** 🚨\n";
      }
    }

    const completedPercent = shift.total_count > 0 
      ? Math.round((shift.completed_count / shift.total_count) * 100) 
      : 0;

    // Build the employee names list from signatures if available, otherwise fallback to team pids
    let sigList = "No signatures";
    if (shift.signatures) {
      if (Array.isArray(shift.signatures)) {
        sigList = shift.signatures.map(s => s.name).join(' & ');
      } else {
        // Handle object format in tests
        const sigObj = shift.signatures;
        const names = [];
        if (sigObj.manager_name) names.push(sigObj.manager_name);
        if (sigObj.operator_name) names.push(sigObj.operator_name);
        if (names.length > 0) sigList = names.join(' & ');
      }
    }

    const embed = {
      title: `${shift.shift_type === 'opening' ? '☀️' : '🌙'} Shift Submitted: Stop & Go Chores`,
      description: `${alertPrefix}Shift date: **${shift.date}** (${shift.shift_type.toUpperCase()})`,
      color: color,
      fields: [
        {
          name: "📋 Chore Completion",
          value: `**${shift.completed_count} / ${shift.total_count}** completed (${completedPercent}%)`,
          inline: true
        },
        {
          name: "💰 Till Closing Report",
          value: tillStatusText,
          inline: true
        },
        {
          name: "👥 Active Roster",
          value: shift.active_team_pids && shift.active_team_pids.length > 0 
            ? `Checked-in IDs: ${shift.active_team_pids.join(', ')}`
            : "No active roster",
          inline: false
        },
        {
          name: "✍️ Sign-off Authorities",
          value: sigList,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Stop & Go Dynamic Chores App"
      }
    };

    const payload = {
      content: alertPrefix ? `🚨 **Alert:** Shift closing has a till discrepancy! 🚨` : `Shift submitted for **${shift.date}**`,
      embeds: [embed]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

// --- Simulated Daily CRON Cleanup (04:00 AM) ---
export async function simulateDailyCleanup() {
  const analyticsPayloads = [];

  if (isLiveMode()) {
    try {
      const querySnapshot = await getDocs(collection(db, 'active_shifts'));
      for (const docSnapshot of querySnapshot.docs) {
        const shiftData = docSnapshot.data();
        if (shiftData.status === 'open' || shiftData.status === 'pending_signatures') {
          const shiftId = docSnapshot.id;
          
          // Get tasks
          const tasksSnap = await getDocs(collection(db, 'active_shifts', shiftId, 'tasks'));
          let missedCount = 0;
          const taskUpdates = [];

          tasksSnap.forEach(tDoc => {
            const task = tDoc.data();
            if (!task.is_completed) {
              missedCount++;
              taskUpdates.push({
                id: tDoc.id,
                data: { missed: true }
              });
            }
          });

          // Run writes
          for (const update of taskUpdates) {
            const taskRef = doc(db, 'active_shifts', shiftId, 'tasks', update.id);
            await updateDoc(taskRef, update.data);
          }

          // Update shift status
          const shiftRef = doc(db, 'active_shifts', shiftId);
          await updateDoc(shiftRef, {
            status: "missed_cleanup",
            missed_count: missedCount,
            cleaned_up_at: serverTimestamp()
          });

          analyticsPayloads.push({
            shift_id: shiftId,
            date: shiftData.date,
            shift_type: shiftData.shift_type,
            status_before_cleanup: shiftData.status,
            completed_tasks: shiftData.completed_count,
            total_tasks: shiftData.total_count,
            missed_tasks_count: missedCount,
            active_team: shiftData.active_team_pids
          });
        }
      }
    } catch (e) {
      console.error("Firestore cleanup simulation error:", e);
    }
  }

  // Always apply to mock shifts
  const mockShifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  Object.keys(mockShifts).forEach(shiftId => {
    const shift = mockShifts[shiftId];
    if (shift.status === 'open' || shift.status === 'pending_signatures') {
      let missedCount = 0;
      Object.keys(shift.tasks).forEach(taskId => {
        const t = shift.tasks[taskId];
        if (!t.is_completed) {
          t.missed = true;
          missedCount++;
        }
      });
      const oldStatus = shift.status;
      shift.status = 'missed_cleanup';
      shift.missed_count = missedCount;
      shift.cleaned_up_at = new Date().toISOString();

      analyticsPayloads.push({
        shift_id: shiftId,
        date: shift.date,
        shift_type: shift.shift_type,
        status_before_cleanup: oldStatus,
        completed_tasks: shift.completed_count,
        total_tasks: shift.total_count,
        missed_tasks_count: missedCount,
        active_team: shift.active_team_pids
      });
    }
  });

  localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(mockShifts));
  return analyticsPayloads;
}

const MOCK_KEY_TEMPLATES = 'stop_go_mock_chore_templates';

export async function getChoreTemplates() {
  if (isLiveMode()) {
    try {
      const snap = await getDocs(collection(db, 'chore_templates'));
      const list = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      if (list.length === 0) {
        const seeded = [];
        for (const t of OPENING_TASKS) {
          const docRef = doc(db, 'chore_templates', t.id);
          const data = { id: t.id, name: t.name, cat: t.cat, shift_type: 'opening', subtasks: t.subtasks || [] };
          await setDoc(docRef, data);
          seeded.push(data);
        }
        for (const t of CLOSING_TASKS) {
          const docRef = doc(db, 'chore_templates', t.id);
          const data = { id: t.id, name: t.name, cat: t.cat, shift_type: 'closing', subtasks: t.subtasks || [] };
          await setDoc(docRef, data);
          seeded.push(data);
        }
        return seeded;
      }
      return list;
    } catch (e) {
      console.error("Firestore getChoreTemplates error, falling back to mock:", e);
    }
  }

  let stored = localStorage.getItem(MOCK_KEY_TEMPLATES);
  if (!stored) {
    const defaultTemplates = [];
    OPENING_TASKS.forEach(t => {
      defaultTemplates.push({ id: t.id, name: t.name, cat: t.cat, shift_type: 'opening', subtasks: t.subtasks || [] });
    });
    CLOSING_TASKS.forEach(t => {
      defaultTemplates.push({ id: t.id, name: t.name, cat: t.cat, shift_type: 'closing', subtasks: t.subtasks || [] });
    });
    localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(defaultTemplates));
    return defaultTemplates;
  }
  return JSON.parse(stored);
}

export async function addChoreTemplate(chore) {
  const newId = `CT_${Date.now()}`;
  const data = {
    id: newId,
    name: chore.name,
    cat: chore.cat,
    shift_type: chore.shift_type,
    subtasks: chore.subtasks || []
  };

  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'chore_templates', newId);
      await setDoc(docRef, data);
      return data;
    } catch (e) {
      console.error("Firestore addChoreTemplate error:", e);
    }
  }

  const list = await getChoreTemplates();
  list.push(data);
  localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(list));
  return data;
}

export async function deleteChoreTemplate(id) {
  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'chore_templates', id);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Firestore deleteChoreTemplate error:", e);
      return false;
    }
  }

  const list = await getChoreTemplates();
  const filtered = list.filter(t => t.id !== id);
  localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(filtered));
  return true;
}
export async function updateChoreTemplate(id, chore) {
  const data = {
    id: id,
    name: chore.name,
    cat: chore.cat,
    shift_type: chore.shift_type,
    subtasks: chore.subtasks || []
  };

  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'chore_templates', id);
      await setDoc(docRef, data);
      return data;
    } catch (e) {
      console.error("Firestore updateChoreTemplate error:", e);
    }
  }

  const list = await getChoreTemplates();
  const idx = list.findIndex(t => t.id === id);
  if (idx !== -1) {
    list[idx] = data;
    localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(list));
    return data;
  }
  return null;
}

export async function getSubmittedShifts() {
  if (isLiveMode()) {
    try {
      const snap = await getDocs(collection(db, 'active_shifts'));
      const list = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'submitted' || data.status === 'missed_cleanup') {
          list.push(data);
        }
      });
      return list.sort((a, b) => new Date(b.date + 'T23:59:59') - new Date(a.date + 'T23:59:59'));
    } catch (e) {
      console.error("Firestore getSubmittedShifts error:", e);
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const list = Object.values(shifts).filter(s => s.status === 'submitted' || s.status === 'missed_cleanup');
  return list.sort((a, b) => new Date(b.date + 'T23:59:59') - new Date(a.date + 'T23:59:59'));
}

export async function deleteShift(shiftId) {
  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await deleteDoc(shiftDocRef);
      return true;
    } catch (e) {
      console.error("Firestore deleteShift error:", e);
      return false;
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  if (shifts[shiftId]) {
    delete shifts[shiftId];
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return true;
  }
  return false;
}

export async function addEmployee(emp) {
  const newId = emp.employee_id || `EMP_${Date.now()}`;
  const pin_hash = await hashPin(emp.pin);
  const data = {
    employee_id: newId,
    employee_name: emp.employee_name,
    pin_hash,
    role: emp.role,
    is_active: true
  };

  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'employees', newId);
      await setDoc(docRef, data);
      return data;
    } catch (e) {
      console.error("Firestore addEmployee error:", e);
    }
  }

  const list = await getEmployees();
  list.push(data);
  localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(list));
  return data;
}

export async function deleteEmployee(employeeId) {
  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'employees', employeeId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Firestore deleteEmployee error:", e);
      return false;
    }
  }

  const list = await getEmployees();
  const filtered = list.filter(e => e.employee_id !== employeeId);
  localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(filtered));
  return true;
}

export async function updateEmployeePin(employeeId, newPin) {
  const pin_hash = await hashPin(newPin);

  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'employees', employeeId);
      await updateDoc(docRef, { pin_hash });
      return true;
    } catch (e) {
      console.error("Firestore updateEmployeePin error:", e);
      return false;
    }
  }

  const list = await getEmployees();
  const idx = list.findIndex(e => e.employee_id === employeeId);
  if (idx !== -1) {
    list[idx].pin_hash = pin_hash;
    localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(list));
    return true;
  }
  return false;
}

export async function sendDiscordShiftStarted(shift, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const color = 5814783; // Blue
    const embed = {
      title: `🚀 Shift Started: Stop & Go Chores`,
      description: `A new shift has been initialized for **${shift.date}** (${shift.shift_type.toUpperCase()})`,
      color: color,
      fields: [
        {
          name: "👥 Active Team Roster",
          value: shift.active_team_pids && shift.active_team_pids.length > 0
            ? `Checked-in IDs: ${shift.active_team_pids.join(', ')}`
            : "No active roster",
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Stop & Go Dynamic Chores App"
      }
    };
    const payload = {
      content: `🚀 Shift started for **${shift.date}** (${shift.shift_type})`,
      embeds: [embed]
    };
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Failed to send Discord shift started notification:", error);
  }
}

export async function sendDiscordShiftArchived(shift, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const color = 15158332; // Red
    const completedPercent = shift.total_tasks > 0 
      ? Math.round((shift.completed_tasks / shift.total_tasks) * 100) 
      : 0;
    const embed = {
      title: `⚠️ Shift Auto-Archived: Stop & Go Chores`,
      description: `Shift for **${shift.date}** (${shift.shift_type.toUpperCase()}) was left open and has been auto-archived.`,
      color: color,
      fields: [
        {
          name: "📋 Chore Completion",
          value: `**${shift.completed_tasks} / ${shift.total_tasks}** completed (${completedPercent}%)`,
          inline: true
        },
        {
          name: "🚨 Missed Chores",
          value: `**${shift.missed_tasks_count}** chores were left incomplete`,
          inline: true
        },
        {
          name: "👥 Roster",
          value: shift.active_team && shift.active_team.length > 0 
            ? `IDs: ${shift.active_team.join(', ')}`
            : "No active roster",
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Stop & Go Dynamic Chores App"
      }
    };
    const payload = {
      content: `⚠️ Shift auto-archived for **${shift.date}** (${shift.shift_type})`,
      embeds: [embed]
    };
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Failed to send Discord shift archived notification:", error);
  }
}

export async function sendDiscordShiftDeleted(shiftDate, shiftType, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const color = 15105570; // Amber
    const embed = {
      title: `🗑️ Shift Deleted: Stop & Go Chores`,
      description: `Shift checklist for **${shiftDate}** (${shiftType.toUpperCase()}) was deleted by a manager.`,
      color: color,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Stop & Go Dynamic Chores App"
      }
    };
    const payload = {
      content: `🗑️ Shift deleted for **${shiftDate}** (${shiftType})`,
      embeds: [embed]
    };
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Failed to send Discord shift deleted notification:", error);
  }
}

export async function updateShiftNotes(shiftId, notes) {
  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await updateDoc(shiftDocRef, {
        notes: notes
      });
      return await getActiveShift(shiftId);
    } catch (e) {
      console.error("Firestore updateShiftNotes error:", e);
    }
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const shift = shifts[shiftId];
  if (shift) {
    shift.notes = notes;
    shifts[shiftId] = shift;
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return shift;
  }
  return null;
}

const DEFAULT_SLOW_CHORES = [
  { id: 'SC_01', name: 'Clean Bathroom & Restock Supplies', frequency_days: 3, last_completed_at: null, last_completed_by_id: null, last_completed_by_name: null },
  { id: 'SC_02', name: 'Check Parking Lot for Trash & Garbage', frequency_days: 2, last_completed_at: null, last_completed_by_id: null, last_completed_by_name: null },
  { id: 'SC_03', name: 'Pull Weeds Outside Front Entrance', frequency_days: 7, last_completed_at: null, last_completed_by_id: null, last_completed_by_name: null },
  { id: 'SC_04', name: 'Deep Clean Back Shelving & Racks', frequency_days: 5, last_completed_at: null, last_completed_by_id: null, last_completed_by_name: null }
];

const MOCK_KEY_SLOW_CHORES = 'stop_go_mock_slow_chores';

export async function getSlowChores() {
  if (isLiveMode()) {
    try {
      const snap = await getDocs(collection(db, 'slow_chores'));
      const list = [];
      snap.forEach(doc => {
        list.push(doc.data());
      });
      if (list.length === 0) {
        for (const sc of DEFAULT_SLOW_CHORES) {
          await setDoc(doc(db, 'slow_chores', sc.id), sc);
        }
        return DEFAULT_SLOW_CHORES;
      }
      return list;
    } catch (e) {
      console.error("Firestore getSlowChores error, falling back to mock:", e);
    }
  }

  let stored = localStorage.getItem(MOCK_KEY_SLOW_CHORES);
  if (!stored) {
    localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(DEFAULT_SLOW_CHORES));
    return DEFAULT_SLOW_CHORES;
  }
  return JSON.parse(stored);
}

export async function addSlowChore(chore) {
  const newId = `SC_${Date.now()}`;
  const data = {
    id: newId,
    name: chore.name,
    frequency_days: Number(chore.frequency_days),
    last_completed_at: null,
    last_completed_by_id: null,
    last_completed_by_name: null
  };

  if (isLiveMode()) {
    try {
      await setDoc(doc(db, 'slow_chores', newId), data);
      return data;
    } catch (e) {
      console.error("Firestore addSlowChore error:", e);
    }
  }

  const list = await getSlowChores();
  list.push(data);
  localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(list));
  return data;
}

export async function updateSlowChore(id, chore) {
  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'slow_chores', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const existing = docSnap.data();
        const updated = {
          ...existing,
          name: chore.name,
          frequency_days: Number(chore.frequency_days)
        };
        await setDoc(docRef, updated);
        return updated;
      }
    } catch (e) {
      console.error("Firestore updateSlowChore error:", e);
    }
  }

  const list = await getSlowChores();
  const idx = list.findIndex(c => c.id === id);
  if (idx !== -1) {
    list[idx].name = chore.name;
    list[idx].frequency_days = Number(chore.frequency_days);
    localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(list));
    return list[idx];
  }
  return null;
}

export async function deleteSlowChore(id) {
  if (isLiveMode()) {
    try {
      await deleteDoc(doc(db, 'slow_chores', id));
      return true;
    } catch (e) {
      console.error("Firestore deleteSlowChore error:", e);
      return false;
    }
  }

  const list = await getSlowChores();
  const filtered = list.filter(c => c.id !== id);
  localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(filtered));
  return true;
}

export async function completeSlowChore(id, employeeId, employeeName) {
  const nowStr = new Date().toISOString();
  if (isLiveMode()) {
    try {
      const docRef = doc(db, 'slow_chores', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const existing = docSnap.data();
        const updated = {
          ...existing,
          last_completed_at: nowStr,
          last_completed_by_id: employeeId,
          last_completed_by_name: employeeName
        };
        await setDoc(docRef, updated);
        return updated;
      }
    } catch (e) {
      console.error("Firestore completeSlowChore error:", e);
    }
  }

  const list = await getSlowChores();
  const idx = list.findIndex(c => c.id === id);
  if (idx !== -1) {
    list[idx].last_completed_at = nowStr;
    list[idx].last_completed_by_id = employeeId;
    list[idx].last_completed_by_name = employeeName;
    localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(list));
    return list[idx];
  }
  return null;
}

