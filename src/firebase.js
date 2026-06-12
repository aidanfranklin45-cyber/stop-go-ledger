import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// ==============================================================================
// 1. MASTER SEED DATA
// ==============================================================================
export const SEED_EMPLOYEES = [
  { id: "EMP_01", name: "Alice Smith", pin: "1111", role: "manager", is_active: true },
  { id: "EMP_02", name: "Bob Jones", pin: "2222", role: "manager", is_active: true },
  { id: "EMP_03", name: "Charlie Brown", pin: "3333", role: "operator", is_active: true },
  { id: "EMP_04", name: "David Miller", pin: "4444", role: "operator", is_active: true },
  { id: "EMP_05", name: "Eva Davis", pin: "5555", role: "operator", is_active: true }
];

export const OPENING_TASKS = [
  { id: "OP_01", cat: "Equipment", name: "Turn on Ice Cream Machine" },
  { id: "OP_02", cat: "Heavy Clean", name: "Wipe underneath and behind fryers and Grille with De-Greaser" },
  { id: "OP_03", cat: "Equipment", name: "Turn on Fryers at 30 minutes prior to Opening" },
  { id: "OP_04", cat: "Equipment", name: "Turn on Grille and Hood Fan at 30 minutes prior to Opening" },
  { id: "OP_05", cat: "Facilities", name: "Water grass and Flowers" },
  { id: "OP_06", cat: "Sanitation", name: "Prepare a bleach bucket with a cap full of bleach and 2/3 full of water" },
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
  { id: "OP_23", cat: "Financial", name: "Open Till at $300 and put some money in Till" },
  { id: "OP_24", cat: "Front of House", name: "At 10:30 turn on open signs and bring out Sandwich Board" }
];

export const CLOSING_TASKS = [
  { id: "CL_01", cat: "Front of House", name: "At Closing Time turn off open signs and bring in sandwich board" },
  { id: "CL_02", cat: "Heavy Clean", name: "Clean Grille - Empty and Scrape Grease Trap into Oil Bins outside" },
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
  { id: "CL_15", cat: "Sanitation", name: "Clean Bathroom - Cleanser and rubber gloves are in there" },
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

export function getFirebaseConfig() {
  const cfg = localStorage.getItem('stop_go_firebase_config');
  return cfg ? JSON.parse(cfg) : null;
}

export function saveFirebaseConfig(config) {
  localStorage.setItem('stop_go_firebase_config', JSON.stringify(config));
  return initializeFirebaseConnection(config);
}

export function clearFirebaseConfig() {
  localStorage.removeItem('stop_go_firebase_config');
  db = null;
  if (currentApp) {
    deleteApp(currentApp);
    currentApp = null;
  }
}

export function isLiveMode() {
  return db !== null;
}

export async function initializeFirebaseConnection(config = null) {
  const activeConfig = config || getFirebaseConfig();
  if (!activeConfig) {
    db = null;
    return false;
  }
  try {
    const apps = getApps();
    if (apps.length > 0) {
      await deleteApp(apps[0]);
    }
    currentApp = initializeApp(activeConfig);
    db = getFirestore(currentApp);
    return true;
  } catch (error) {
    console.error("Firebase Initialization Failed:", error);
    db = null;
    return false;
  }
}

// Initialize on load if config exists
initializeFirebaseConnection();

// ==============================================================================
// 4. MOCK DATABASE (LOCAL STORAGE STATE MANAGER)
// ==============================================================================
const MOCK_KEY_EMPLOYEES = 'stop_go_mock_employees';
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
      const snap = await getDocs(collection(db, 'employees'));
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
      const docSnap = await getDoc(shiftDocRef);
      if (!docSnap.exists()) return null;

      const shiftData = docSnap.data();
      
      // Fetch tasks subcollection
      const tasksSnap = await getDocs(collection(db, 'active_shifts', shiftId, 'tasks'));
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
    }
  }

  // Mock
  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  return shifts[shiftId] || null;
}

export async function startShift(shiftId, shiftType, date, activeTeamPids) {
  const taskTemplate = shiftType === 'opening' ? OPENING_TASKS : CLOSING_TASKS;
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
      requires_verification: false
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
  const taskTemplate = shiftType === 'opening' ? OPENING_TASKS : CLOSING_TASKS;
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

    initialTasks[t.id] = {
      task_id: t.id,
      task_name: t.name,
      category: t.cat,
      is_completed: shouldComplete,
      completed_by_id: completedBy ? completedBy.id : null,
      completed_by_name: completedBy ? completedBy.name : null,
      timestamp: timestamp,
      requires_verification: false
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

export async function updateTask(shiftId, taskId, isCompleted, completedById, completedByName) {
  const timestamp = isCompleted ? new Date().toISOString() : null;

  if (isLiveMode()) {
    try {
      // Update task in subcollection
      const taskDocRef = doc(db, 'active_shifts', shiftId, 'tasks', taskId);
      await updateDoc(taskDocRef, {
        is_completed: isCompleted,
        completed_by_id: completedById,
        completed_by_name: completedByName,
        timestamp: isCompleted ? serverTimestamp() : null
      });

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

export async function submitShiftSignatures(shiftId, signatures) {
  if (isLiveMode()) {
    try {
      const shiftDocRef = doc(db, 'active_shifts', shiftId);
      await updateDoc(shiftDocRef, {
        status: "submitted",
        signatures: signatures,
        submitted_at: serverTimestamp()
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
    shifts[shiftId] = shift;
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return shift;
  }
  return null;
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
