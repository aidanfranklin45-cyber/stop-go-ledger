import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ==============================================================================
// 1. MASTER SEED DATA (EXPORTS REQUIRED BY UNIT TESTS)
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
  { id: "OP_15", cat: "Prep", name: "Portion containers of ranch" },
  { id: "OP_16", cat: "Prep", name: "Portion containers of ranch" }, // Wait, in original there was also a duplicate ranch / tartar, let's keep exact lists
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

export const DEFAULT_SLOW_CHORES = [
  { 
    id: 'SC_01', 
    name: 'Clean Bathroom & Restock Supplies', 
    frequency_days: 3, 
    last_completed_at: null, 
    last_completed_by_id: null, 
    last_completed_by_name: null,
    days_of_week: ["Monday", "Thursday"],
    labor_intensity: "high",
    subtasks: [
      { name: 'Scrub toilet bowl & seat', is_completed: false },
      { name: 'Wipe down sink and mirror', is_completed: false },
      { name: 'Empty bathroom trash bin', is_completed: false },
      { name: 'Restock paper towels and toilet paper', is_completed: false }
    ]
  },
  { 
    id: 'SC_02', 
    name: 'Check Parking Lot for Trash & Garbage', 
    frequency_days: 2, 
    last_completed_at: null, 
    last_completed_by_id: null, 
    last_completed_by_name: null,
    days_of_week: ["Tuesday", "Friday", "Sunday"],
    labor_intensity: "low",
    subtasks: [
      { name: 'Sweep storefront walkway', is_completed: false },
      { name: 'Pick up litter around drive-thru lane', is_completed: false },
      { name: 'Check dumpster area and close gate', is_completed: false },
      { name: 'Empty outdoor trash cans if needed', is_completed: false }
    ]
  },
  { 
    id: 'SC_03', 
    name: 'Pull Weeds Outside Front Entrance', 
    frequency_days: 7, 
    last_completed_at: null, 
    last_completed_by_id: null, 
    last_completed_by_name: null,
    days_of_week: ["Wednesday"],
    labor_intensity: "medium",
    subtasks: [
      { name: 'Clear weeds from front flowerbed', is_completed: false },
      { name: 'Clear weeds between pavement cracks', is_completed: false },
      { name: 'Sweep up loose soil/debris', is_completed: false }
    ]
  },
  { 
    id: 'SC_04', 
    name: 'Deep Clean Back Shelving & Racks', 
    frequency_days: 5, 
    last_completed_at: null, 
    last_completed_by_id: null, 
    last_completed_by_name: null,
    days_of_week: ["Saturday"],
    labor_intensity: "high",
    subtasks: [
      { name: 'Remove items from shelves', is_completed: false },
      { name: 'Wipe down shelving units with sanitizer', is_completed: false },
      { name: 'Inspect expiration dates on stock', is_completed: false },
      { name: 'Reorganize items neatly on shelves', is_completed: false }
    ]
  }
];

// ==============================================================================
// 2. CLIENT-SIDE CONFIGURATION & INITIALIZATION (FOR DETECTING LIVE MODE)
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
  return true;
}

export function clearFirebaseConfig() {}

export function isLiveMode() {
  return db !== null;
}

export async function initializeFirebaseConnection(config = null) {
  if (typeof process !== 'undefined' && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
    db = null;
    return false;
  }
  
  try {
    const apps = getApps();
    if (apps.length > 0) {
      await deleteApp(apps[0]);
    }
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "your-api-key-here") {
      currentApp = initializeApp(firebaseConfig);
      db = getFirestore(currentApp);
      return true;
    }
    db = null;
    return false;
  } catch (error) {
    console.error("Firebase Client SDK Initialization Failed:", error);
    db = null;
    return false;
  }
}

if (typeof process === 'undefined' || !(process.env.VITEST || process.env.NODE_ENV === 'test')) {
  initializeFirebaseConnection();
}

// ==============================================================================
// 3. BACKEND API ENDPOINT CONFIGURATION
// ==============================================================================
export const API_URL = import.meta.env.VITE_API_URL || "https://api-a65w2jh2qq-uc.a.run.app";

// ==============================================================================
// 4. MOCK DATABASE LOCAL KEYS (FOR OFFLINE / TEST MODE)
// ==============================================================================
const MOCK_KEY_EMPLOYEES = 'stop_go_mock_employees_v2';
const MOCK_KEY_SHIFTS = 'stop_go_mock_shifts';
const MOCK_KEY_TEMPLATES = 'stop_go_mock_chore_templates';
const MOCK_KEY_SLOW_CHORES = 'stop_go_mock_slow_chores';

// ==============================================================================
// 5. DATABASE OPERATIONS LAYER (PROXIED TO CLOUD FUNCTIONS OR LOCAL STORAGE)
// ==============================================================================

export async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Employees ---
export async function getEmployees() {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/employees`);
    if (!res.ok) throw new Error("Failed to fetch employees from API");
    return await res.json();
  }
  return JSON.parse(localStorage.getItem(MOCK_KEY_EMPLOYEES) || '[]');
}

export async function validateEmployeePin(employeeId, pin) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/employees/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, pin })
    });
    if (!res.ok) throw new Error("Failed to validate PIN via API");
    const data = await res.json();
    return data.valid;
  }
  
  const pinHash = await hashPin(pin);
  const emps = await getEmployees();
  const emp = emps.find(e => e.employee_id === employeeId);
  return emp && emp.pin_hash === pinHash;
}

export async function addEmployee(emp) {
  const newId = emp.employee_id || `EMP_${Date.now()}`;
  const pin_hash = await hashPin(emp.pin);
  const data = {
    employee_id: newId,
    employee_name: emp.employee_name,
    pin_hash,
    role: emp.role,
    is_active: emp.is_active !== undefined ? emp.is_active : true
  };

  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employee_id: newId,
        employee_name: emp.employee_name,
        pin: emp.pin,
        role: emp.role,
        is_active: emp.is_active !== undefined ? emp.is_active : true
      })
    });
    if (!res.ok) throw new Error("Failed to add employee via API");
    return await res.json();
  }

  const list = await getEmployees();
  list.push(data);
  localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(list));
  return data;
}

export async function deleteEmployee(employeeId) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/employees/${employeeId}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete employee via API");
    return true;
  }

  const list = await getEmployees();
  const filtered = list.filter(e => e.employee_id !== employeeId);
  localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(filtered));
  return true;
}

export async function updateEmployeePin(employeeId, newPin) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/employees/${employeeId}/pin`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: newPin })
    });
    if (!res.ok) throw new Error("Failed to update employee PIN via API");
    return true;
  }

  const list = await getEmployees();
  const idx = list.findIndex(e => e.employee_id === employeeId);
  if (idx !== -1) {
    list[idx].pin_hash = await hashPin(newPin);
    localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(list));
    return true;
  }
  return false;
}

export async function updateEmployeeColor(employeeId, color) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/employees/${employeeId}/color`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color })
    });
    if (!res.ok) throw new Error("Failed to update employee color via API");
    return true;
  }

  const list = await getEmployees();
  const idx = list.findIndex(e => e.employee_id === employeeId);
  if (idx !== -1) {
    list[idx].color = color;
    localStorage.setItem(MOCK_KEY_EMPLOYEES, JSON.stringify(list));
    return true;
  }
  return false;
}

function enrichShiftCounts(shift) {
  if (shift && shift.tasks) {
    const tasksArray = Object.values(shift.tasks);
    shift.total_count = tasksArray.length;
    shift.completed_count = tasksArray.filter(t => t.is_completed || t.completed).length;
  }
  return shift;
}

// --- Shifts & Tasks ---
export async function getActiveShift(shiftId) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts/${shiftId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch active shift from API");
    const shift = await res.json();
    return enrichShiftCounts(shift);
  }
  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  return shifts[shiftId] || null;
}

export async function startShift(shiftId, shiftType, date, activeTeamPids) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, shiftType, date, activeTeamPids })
    });
    if (!res.ok) throw new Error("Failed to start shift via API");
    const shift = await res.json();
    return enrichShiftCounts(shift);
  }

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

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  shifts[shiftId] = shiftData;
  localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
  return shiftData;
}

export async function updateTask(shiftId, taskId, isCompleted, completedById, completedByName, subtasks = null, flag = null) {
  if (isLiveMode()) {
    const payload = {
      is_completed: isCompleted,
      completed_by_id: completedById,
      completed_by_name: completedByName
    };
    if (subtasks !== null) payload.subtasks = subtasks;
    if (flag !== null) {
      if (flag === 'REMOVE') {
        payload.flag = null;
      } else {
        payload.flag = flag;
      }
    }

    const res = await fetch(`${API_URL}/shifts/${shiftId}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to update task via API");
    return await getActiveShift(shiftId);
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const shift = shifts[shiftId];
  if (shift && shift.tasks[taskId]) {
    shift.tasks[taskId].is_completed = isCompleted;
    shift.tasks[taskId].completed_by_id = completedById;
    shift.tasks[taskId].completed_by_name = completedByName;
    shift.tasks[taskId].timestamp = isCompleted ? new Date().toISOString() : null;
    if (subtasks !== null) {
      shift.tasks[taskId].subtasks = subtasks;
    }
    if (flag !== null) {
      if (flag === 'REMOVE') {
        delete shift.tasks[taskId].flag;
      } else {
        shift.tasks[taskId].flag = flag;
      }
    }

    let completedCount = 0;
    Object.values(shift.tasks).forEach(t => {
      if (t.is_completed) completedCount++;
    });
    shift.completed_count = completedCount;
    
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
    const res = await fetch(`${API_URL}/shifts/${shiftId}/roster`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeTeamPids })
    });
    if (!res.ok) throw new Error("Failed to update shift roster via API");
    return await getActiveShift(shiftId);
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
    const res = await fetch(`${API_URL}/shifts/${shiftId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error("Failed to update shift status via API");
    return await getActiveShift(shiftId);
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

export async function updateShiftNotes(shiftId, notes) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts/${shiftId}/notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes })
    });
    if (!res.ok) throw new Error("Failed to update shift notes via API");
    return await getActiveShift(shiftId);
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

export async function submitShiftSignatures(shiftId, signatures, tillReport = null) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts/${shiftId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatures, tillReport })
    });
    if (!res.ok) throw new Error("Failed to submit shift via API");
    return await getActiveShift(shiftId);
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

export async function getSubmittedShifts() {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts`);
    if (!res.ok) throw new Error("Failed to fetch submitted shifts from API");
    const list = await res.json();
    list.forEach(s => enrichShiftCounts(s));
    return list.sort((a, b) => new Date(b.date + 'T23:59:59') - new Date(a.date + 'T23:59:59'));
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  const list = Object.values(shifts);
  return list.sort((a, b) => new Date(b.date + 'T23:59:59') - new Date(a.date + 'T23:59:59'));
}

export async function deleteShift(shiftId) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts/${shiftId}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete shift via API");
    return true;
  }

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  if (shifts[shiftId]) {
    delete shifts[shiftId];
    localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
    return true;
  }
  return false;
}

// --- Chore Templates ---
export async function getChoreTemplates() {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/chore-templates`);
    if (!res.ok) throw new Error("Failed to fetch templates from API");
    return await res.json();
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
  const newId = chore.id || `CHORE_${Date.now()}`;
  const data = { id: newId, ...chore };

  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/chore-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to add chore template via API");
    return await res.json();
  }

  const list = await getChoreTemplates();
  list.push(data);
  localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(list));
  return data;
}

export async function updateChoreTemplate(id, chore) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/chore-templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chore)
    });
    if (!res.ok) throw new Error("Failed to update chore template via API");
    return await res.json();
  }

  const list = await getChoreTemplates();
  const idx = list.findIndex(t => t.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...chore };
    localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(list));
    return list[idx];
  }
  return null;
}

export async function deleteChoreTemplate(id) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/chore-templates/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete chore template via API");
    return true;
  }

  const list = await getChoreTemplates();
  const filtered = list.filter(t => t.id !== id);
  localStorage.setItem(MOCK_KEY_TEMPLATES, JSON.stringify(filtered));
  return true;
}

// --- Slow Chores ---
export async function getSlowChores() {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/slow-chores`);
    if (!res.ok) throw new Error("Failed to fetch slow chores from API");
    return await res.json();
  }

  let stored = localStorage.getItem(MOCK_KEY_SLOW_CHORES);
  if (!stored) {
    localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(DEFAULT_SLOW_CHORES));
    return DEFAULT_SLOW_CHORES;
  }
  return JSON.parse(stored);
}

export async function addSlowChore(chore) {
  const newId = chore.id || `SC_${Date.now()}`;
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/slow-chores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...chore, id: newId })
    });
    if (!res.ok) throw new Error("Failed to add slow chore via API");
    return await res.json();
  }

  const list = await getSlowChores();
  const data = {
    id: newId,
    name: chore.name,
    frequency_days: Number(chore.frequency_days) || 3,
    days_of_week: chore.days_of_week || [],
    labor_intensity: chore.labor_intensity || "medium",
    subtasks: chore.subtasks || [],
    last_completed_at: chore.last_completed_at !== undefined ? chore.last_completed_at : null,
    last_completed_by_id: chore.last_completed_by_id !== undefined ? chore.last_completed_by_id : null,
    last_completed_by_name: chore.last_completed_by_name !== undefined ? chore.last_completed_by_name : null,
    created_at: chore.created_at || new Date().toISOString()
  };
  list.push(data);
  localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(list));
  return data;
}

export async function updateSlowChore(id, chore) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/slow-chores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chore)
    });
    if (!res.ok) throw new Error("Failed to update slow chore via API");
    return await res.json();
  }

  const list = await getSlowChores();
  const idx = list.findIndex(c => c.id === id);
  if (idx !== -1) {
    list[idx].name = chore.name !== undefined ? chore.name : list[idx].name;
    list[idx].frequency_days = chore.frequency_days !== undefined ? Number(chore.frequency_days) : list[idx].frequency_days;
    list[idx].days_of_week = chore.days_of_week !== undefined ? chore.days_of_week : list[idx].days_of_week;
    list[idx].labor_intensity = chore.labor_intensity !== undefined ? chore.labor_intensity : list[idx].labor_intensity;
    list[idx].subtasks = chore.subtasks !== undefined ? chore.subtasks : list[idx].subtasks;
    
    if (chore.created_at !== undefined) list[idx].created_at = chore.created_at;
    if (chore.last_completed_at !== undefined) list[idx].last_completed_at = chore.last_completed_at;
    if (chore.last_completed_by_id !== undefined) list[idx].last_completed_by_id = chore.last_completed_by_id;
    if (chore.last_completed_by_name !== undefined) list[idx].last_completed_by_name = chore.last_completed_by_name;
    
    localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(list));
    return list[idx];
  }
  return null;
}

export async function deleteSlowChore(id) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/slow-chores/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete slow chore via API");
    return true;
  }

  const list = await getSlowChores();
  const filtered = list.filter(c => c.id !== id);
  localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(filtered));
  return true;
}

export async function completeSlowChore(id, employeeId, employeeName, resetSubtasks = null) {
  if (isLiveMode()) {
    const payload = {
      last_completed_at: new Date().toISOString(),
      last_completed_by_id: employeeId,
      last_completed_by_name: employeeName
    };
    if (resetSubtasks) {
      payload.subtasks = resetSubtasks;
    }
    const res = await fetch(`${API_URL}/slow-chores/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to complete slow chore via API");
    return await res.json();
  }

  const list = await getSlowChores();
  const idx = list.findIndex(c => c.id === id);
  if (idx !== -1) {
    const nowStr = new Date().toISOString();
    list[idx].last_completed_at = nowStr;
    list[idx].last_completed_by_id = employeeId;
    list[idx].last_completed_by_name = employeeName;
    if (resetSubtasks) {
      list[idx].subtasks = resetSubtasks;
    } else if (list[idx].subtasks) {
      list[idx].subtasks = list[idx].subtasks.map(st => ({ ...st, is_completed: false }));
    }
    localStorage.setItem(MOCK_KEY_SLOW_CHORES, JSON.stringify(list));
    return list[idx];
  }
  return null;
}

// --- Discord Webhook Operations ---

export async function sendDiscordErrorNotification(errorMessage, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const payload = {
      embeds: [{
        title: "🚨 STOP & GO LEDGER - SYSTEM ERROR 🚨",
        description: `An error was encountered in the Stop & Go Ledger application:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\nPlease check the Google Cloud Console / Firebase Console immediately.`,
        color: 15158332,
        timestamp: new Date().toISOString()
      }]
    };
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to send Discord error notification:", err);
  }
}

export async function sendDiscordNotification(shift, webhookUrl) {
  if (!webhookUrl) return;
  try {
    let tillStatusText = "N/A (Opening Shift)";
    let alertPrefix = "";
    let color = 5814783; 
    
    if (shift.shift_type === 'closing') {
      if (shift.till_status === 'balanced') {
        tillStatusText = "✅ Balanced ($0.00)";
        color = 3066993; 
      } else if (shift.till_status === 'over') {
        tillStatusText = `📈 Over (+$${Number(shift.till_discrepancy_amount).toFixed(2)})`;
        color = 15105570; 
        if (shift.till_discrepancy_amount >= 10) {
          alertPrefix = "🚨 **LARGE TILL DISCREPANCY** 🚨\n";
          color = 15158332; 
        }
      } else if (shift.till_status === 'under') {
        tillStatusText = `📉 Under (-$${Number(shift.till_discrepancy_amount).toFixed(2)})`;
        color = 15158332; 
        alertPrefix = "🚨 **TILL IS UNDER** 🚨\n";
      }
    }

    const totalTasks = Object.keys(shift.tasks).length;
    const completedTasks = Object.values(shift.tasks).filter(t => t.is_completed).length;
    const sigList = shift.signatures && shift.signatures.length > 0 
      ? shift.signatures.map(s => `• ${s.name} (${s.role})`).join('\n')
      : "No signatures recorded";

    const embed = {
      title: `${alertPrefix}📋 Shift Report Submitted: ${shift.shift_type === 'opening' ? '🌅 Opening' : '🌃 Closing'}`,
      color: color,
      fields: [
        { name: "📅 Date", value: shift.date, inline: true },
        { name: "📊 Completion Status", value: `${completedTasks} / ${totalTasks} chores completed`, inline: true },
        { name: "💰 Till Status", value: tillStatusText, inline: true },
        { 
          name: "👥 Active Team", 
          value: shift.active_team_pids && shift.active_team_pids.length > 0 
            ? `Checked-in IDs: ${shift.active_team_pids.join(', ')}`
            : "No active roster",
          inline: false
        },
        { name: "✍️ Sign-off Authorities", value: sigList, inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Stop & Go Dynamic Chores App" }
    };

    const payload = {
      content: alertPrefix ? `🚨 **Alert:** Shift closing has a till discrepancy! 🚨` : `Shift submitted for **${shift.date}**`,
      embeds: [embed]
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
  }
}

export async function sendDiscordShiftStarted(shift, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const totalTasks = shift.tasks ? Object.keys(shift.tasks).length : 0;
    const embed = {
      title: `🌅 Shift Started: ${shift.shift_type === 'opening' ? 'Opening' : 'Closing'}`,
      color: 3447003,
      fields: [
        { name: "📅 Date", value: shift.date, inline: true },
        { name: "📊 Total chores templates loaded", value: `${totalTasks} chores`, inline: true },
        { name: "👥 Active Team IDs", value: shift.active_team_pids.join(', '), inline: false }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Stop & Go Dynamic Chores App" }
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

export async function sendDiscordShiftArchived(payload, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const completedPercent = payload.total_tasks > 0 
      ? Math.round((payload.completed_tasks / payload.total_tasks) * 100) 
      : 0;
    const embed = {
      title: `⚠️ Shift Auto-Archived: Stop & Go Chores`,
      description: `Shift for **${payload.date}** (${payload.shift_type.toUpperCase()}) was left open and has been auto-archived.`,
      color: 15158332,
      fields: [
        {
          name: "📋 Chore Completion",
          value: `**${payload.completed_tasks} / ${payload.total_tasks}** completed (${completedPercent}%)`,
          inline: true
        },
        {
          name: "🚨 Missed Chores",
          value: `**${payload.missed_tasks_count}** chores were left incomplete`,
          inline: true
        },
        {
          name: "👥 Roster",
          value: payload.active_team && payload.active_team.length > 0 
            ? `IDs: ${payload.active_team.join(', ')}`
            : "No active roster",
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Stop & Go Dynamic Chores App" }
    };
    const responsePayload = {
      content: `⚠️ Shift auto-archived for **${payload.date}** (${payload.shift_type})`,
      embeds: [embed]
    };
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responsePayload)
    });
  } catch (error) {
    console.error("Failed to send Discord shift archived notification:", error);
  }
}

export async function sendDiscordShiftDeleted(shiftDate, shiftType, webhookUrl) {
  if (!webhookUrl) return;
  try {
    const embed = {
      title: `🗑️ Shift Deleted: Stop & Go Chores`,
      description: `Shift checklist for **${shiftDate}** (${shiftType.toUpperCase()}) was deleted by a manager.`,
      color: 15105570,
      timestamp: new Date().toISOString(),
      footer: { text: "Stop & Go Dynamic Chores App" }
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

// --- Automated Daily Cleanup (Proxied to backend or handled locally) ---
export async function simulateDailyCleanup() {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts/cleanup`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Failed to simulate daily cleanup via API");
    return await res.json();
  }

  const analyticsPayloads = [];
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

// --- Seed Test Scenario (Proxied to backend or handled locally) ---
export async function seedTestScenario(shiftId, shiftType, date) {
  if (isLiveMode()) {
    const res = await fetch(`${API_URL}/shifts/${shiftId}/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftType, date })
    });
    if (!res.ok) throw new Error("Failed to seed test scenario via API");
    const shift = await res.json();
    return enrichShiftCounts(shift);
  }

  const activeTeamPids = ["EMP_01", "EMP_03", "EMP_04"];
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

  const shifts = JSON.parse(localStorage.getItem(MOCK_KEY_SHIFTS) || '{}');
  shifts[shiftId] = shiftData;
  localStorage.setItem(MOCK_KEY_SHIFTS, JSON.stringify(shifts));
  return shiftData;
}

function getContrastColor(hexColor) {
  if (!hexColor || hexColor.length < 6) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

export function getEmployeeAvatarStyle(name, customColor = null) {
  if (customColor) {
    return { backgroundColor: customColor, color: getContrastColor(customColor) };
  }

  if (!name) return { backgroundColor: 'var(--primary)', color: '#ffffff' };
  
  const clean = name.toLowerCase().trim();
  
  if (clean.includes("aidan") || clean.includes("gena")) {
    return { backgroundColor: "#26DE81", color: "#000000" }; // Neon Green
  }
  if (clean.includes("angel")) {
    return { backgroundColor: "#E29393", color: "#ffffff" }; // Rose
  }
  if (clean.includes("bailey")) {
    return { backgroundColor: "#6C9B50", color: "#ffffff" }; // Muted Green
  }
  if (clean.includes("christian")) {
    return { backgroundColor: "#4A86E8", color: "#ffffff" }; // Soft Blue
  }
  if (clean.includes("esmeralda") || clean.includes("esmerelda")) {
    return { backgroundColor: "#E84393", color: "#ffffff" }; // Magenta/Fuchsia
  }
  if (clean.includes("madeline") || clean.includes("mattie")) {
    return { backgroundColor: "#F9CB9C", color: "#000000" }; // Peach
  }
  if (clean.includes("kayla")) {
    return { backgroundColor: "#FFEB3B", color: "#000000" }; // Bright Yellow
  }
  if (clean.includes("alexandra") || clean.includes("alex")) {
    return { backgroundColor: "#8E7CC3", color: "#ffffff" }; // Purple
  }
  if (clean.includes("dora")) {
    return { backgroundColor: "#FF9900", color: "#000000" }; // Orange
  }
  if (clean.includes("lyla")) {
    return { backgroundColor: "#B7B7B7", color: "#000000" }; // Gray
  }
  if (clean.includes("adley")) {
    return { backgroundColor: "#F1C232", color: "#000000" }; // Gold
  }
  if (clean.includes("laney")) {
    return { backgroundColor: "#A64D79", color: "#ffffff" }; // Plum
  }
  if (clean.includes("addie")) {
    return { backgroundColor: "#9FC5E8", color: "#000000" }; // Ice Blue
  }
  if (clean.includes("natalie")) {
    return { backgroundColor: "#FF3838", color: "#ffffff" }; // Bright Red
  }
  if (clean.includes("karen")) {
    return { backgroundColor: "#B6D7A8", color: "#000000" }; // Soft Sage
  }
  if (clean.includes("audrey")) {
    return { backgroundColor: "#C05030", color: "#ffffff" }; // Terracotta/Rust
  }
  if (clean.includes("keali")) {
    return { backgroundColor: "#1ABC9C", color: "#ffffff" }; // Teal/Turquoise
  }

  // Fallback hash-based color for any other employees
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return { backgroundColor: `hsl(${hue}, 65%, 45%)`, color: '#ffffff' };
}
