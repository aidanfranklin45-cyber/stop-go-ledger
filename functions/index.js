const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ==============================================================================
// MASTER DATA
// ==============================================================================
const SEED_EMPLOYEES = [
  { id: "101", name: "Aidan", pin: "610287", role: "manager", is_active: true },
  { id: "107", name: "Lyla", pin: "893412", role: "operator", is_active: true },
  { id: "108", name: "Esmeralda", pin: "267503", role: "operator", is_active: true },
  { id: "112", name: "Gena", pin: "410972", role: "operator", is_active: true },
  { id: "113", name: "Angel", pin: "285194", role: "operator", is_active: true },
  { id: "115", name: "Christian", pin: "913850", role: "operator", is_active: true },
  { id: "116", name: "Audrey", pin: "574639", role: "operator", is_active: true },
  { id: "118", name: "Bailey", pin: "384621", role: "operator", is_active: true },
  { id: "119", name: "Keali", pin: "750392", role: "operator", is_active: true },
  { id: "123", name: "Adley", pin: "629425", role: "operator", is_active: true },
  { id: "124", name: "Madeline", pin: "728363", role: "operator", is_active: true },
  { id: "125", name: "Kayla", pin: "425673", role: "operator", is_active: true },
  { id: "126", name: "Alexandra", pin: "843695", role: "operator", is_active: true },
  { id: "128", name: "Dora", pin: "576435", role: "operator", is_active: true },
  { id: "129", name: "Laney", pin: "936481", role: "operator", is_active: true },
  { id: "130", name: "Addie", pin: "545358", role: "operator", is_active: true },
  { id: "131", name: "Karen", pin: "831402", role: "operator", is_active: true },
  { id: "132", name: "Natalie", pin: "259716", role: "operator", is_active: true }
];

const OPENING_TASKS = [
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

const CLOSING_TASKS = [
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

const DEFAULT_SLOW_CHORES = [
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
// HELPERS
// ==============================================================================
function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

async function seedLiveEmployees() {
  for (const emp of SEED_EMPLOYEES) {
    const pin_hash = hashPin(emp.pin);
    const docRef = db.collection("employees").doc(emp.id);
    await docRef.set({
      employee_id: emp.id,
      employee_name: emp.name,
      pin_hash,
      role: emp.role,
      is_active: emp.is_active
    });
  }
}

// ==============================================================================
// API ROUTES
// ==============================================================================

// --- Employees ---
app.get("/employees", async (req, res) => {
  try {
    const snap = await db.collection("employees").get();
    const list = [];
    snap.forEach(doc => list.push(doc.data()));
    
    if (list.length === 0) {
      await seedLiveEmployees();
      const reSnap = await db.collection("employees").get();
      const reList = [];
      reSnap.forEach(doc => reList.push(doc.data()));
      return res.status(200).json(reList);
    }
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/employees/validate", async (req, res) => {
  const { employeeId, pin } = req.body;
  if (!employeeId || !pin) return res.status(400).json({ error: "Missing parameters" });
  try {
    const docRef = db.collection("employees").doc(employeeId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(200).json({ valid: false });
    const emp = docSnap.data();
    const match = emp.pin_hash === hashPin(pin);
    res.status(200).json({ valid: match });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Shifts ---
app.get("/shifts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = db.collection("active_shifts").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).json({ error: "Shift not found" });

    const shiftData = docSnap.data();
    const tasks = {};
    const subTasksSnap = await db.collection("active_shifts").doc(id).collection("tasks").get();
    subTasksSnap.forEach(tDoc => {
      tasks[tDoc.id] = tDoc.data();
    });

    res.status(200).json({
      ...shiftData,
      tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/shifts", async (req, res) => {
  const { shiftId, shiftType, date, activeTeamPids } = req.body;
  try {
    const templatesSnap = await db.collection("chore_templates").get();
    let templates = [];
    templatesSnap.forEach(doc => templates.push(doc.data()));

    // Seed templates if empty
    if (templates.length === 0) {
      const seeded = [];
      for (const t of OPENING_TASKS) {
        const docRef = db.collection("chore_templates").doc(t.id);
        const data = { id: t.id, name: t.name, cat: t.cat, shift_type: 'opening', subtasks: t.subtasks || [] };
        await docRef.set(data);
        seeded.push(data);
      }
      for (const t of CLOSING_TASKS) {
        const docRef = db.collection("chore_templates").doc(t.id);
        const data = { id: t.id, name: t.name, cat: t.cat, shift_type: 'closing', subtasks: t.subtasks || [] };
        await docRef.set(data);
        seeded.push(data);
      }
      templates = seeded;
    }

    const taskTemplates = templates.filter(t => t.shift_type === shiftType);

    const shiftDocRef = db.collection("active_shifts").doc(shiftId);
    const shiftData = {
      shift_id: shiftId,
      shift_type: shiftType,
      date,
      active_team_pids: activeTeamPids,
      status: "open",
      created_at: new Date().toISOString(),
      submitted_at: null,
      signatures: [],
      till_status: null,
      till_discrepancy_amount: null
    };

    await shiftDocRef.set(shiftData);

    const tasks = {};
    for (const t of taskTemplates) {
      const taskData = {
        task_id: t.id,
        task_name: t.name,
        category: t.cat,
        is_completed: false,
        completed_by_id: null,
        completed_by_name: null,
        timestamp: null,
        requires_verification: false,
        subtasks: (t.subtasks || []).map(stName => ({
          name: stName,
          is_completed: false
        }))
      };
      await shiftDocRef.collection("tasks").doc(t.id).set(taskData);
      tasks[t.id] = taskData;
    }

    res.status(200).json({
      ...shiftData,
      tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/shifts/:id/tasks/:taskId", async (req, res) => {
  const { id, taskId } = req.params;
  const taskData = req.body;
  try {
    const docRef = db.collection("active_shifts").doc(id).collection("tasks").doc(taskId);
    await docRef.set(taskData, { merge: true });
    res.status(200).json(taskData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/shifts/:id/submit", async (req, res) => {
  const { id } = req.params;
  const { signatures, tillReport } = req.body;
  try {
    const docRef = db.collection("active_shifts").doc(id);
    const updateData = {
      status: "submitted",
      signatures,
      submitted_at: new Date().toISOString()
    };
    if (tillReport) {
      updateData.till_status = tillReport.till_status;
      updateData.till_discrepancy_amount = tillReport.till_discrepancy_amount;
    }
    await docRef.update(updateData);
    
    // Fetch full updated shift details
    const docSnap = await docRef.get();
    const tasksSnap = await docRef.collection("tasks").get();
    const tasks = {};
    tasksSnap.forEach(tDoc => {
      tasks[tDoc.id] = tDoc.data();
    });

    res.status(200).json({
      ...docSnap.data(),
      tasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/shifts/:id/roster", async (req, res) => {
  const { id } = req.params;
  const { activeTeamPids } = req.body;
  try {
    const docRef = db.collection("active_shifts").doc(id);
    await docRef.update({ active_team_pids: activeTeamPids });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/shifts/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const docRef = db.collection("active_shifts").doc(id);
    await docRef.update({ status });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/shifts", async (req, res) => {
  try {
    const snap = await db.collection("active_shifts").get();
    const list = [];
    for (const doc of snap.docs) {
      const shiftData = doc.data();
      const tasksSnap = await doc.ref.collection("tasks").get();
      const tasks = {};
      tasksSnap.forEach(tDoc => {
        tasks[tDoc.id] = tDoc.data();
      });
      list.push({
        ...shiftData,
        tasks
      });
    }
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Chore Templates ---
app.get("/chore-templates", async (req, res) => {
  try {
    const snap = await db.collection("chore_templates").get();
    const list = [];
    snap.forEach(doc => list.push(doc.data()));
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/chore-templates", async (req, res) => {
  const template = req.body;
  try {
    await db.collection("chore_templates").doc(template.id).set(template);
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/chore-templates/:id", async (req, res) => {
  const { id } = req.params;
  const template = req.body;
  try {
    await db.collection("chore_templates").doc(id).set(template, { merge: true });
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/chore-templates/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection("chore_templates").doc(id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Slow Chores ---
app.get("/slow-chores", async (req, res) => {
  try {
    const snap = await db.collection("slow_chores").get();
    const list = [];
    snap.forEach(doc => list.push(doc.data()));
    
    if (list.length === 0) {
      for (const sc of DEFAULT_SLOW_CHORES) {
        await db.collection("slow_chores").doc(sc.id).set(sc);
      }
      return res.status(200).json(DEFAULT_SLOW_CHORES);
    }
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/slow-chores", async (req, res) => {
  const chore = req.body;
  if (!chore.id) {
    chore.id = `SC_${Date.now()}`;
  }
  try {
    await db.collection("slow_chores").doc(chore.id).set(chore);
    res.status(200).json(chore);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/slow-chores/:id", async (req, res) => {
  const { id } = req.params;
  const chore = req.body;
  try {
    await db.collection("slow_chores").doc(id).set(chore, { merge: true });
    res.status(200).json(chore);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/slow-chores/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection("slow_chores").doc(id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Shift Extra Operations ---
app.delete("/shifts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const tasksSnap = await db.collection("active_shifts").doc(id).collection("tasks").get();
    const batch = db.batch();
    tasksSnap.forEach(tDoc => {
      batch.delete(tDoc.ref);
    });
    await batch.commit();

    await db.collection("active_shifts").doc(id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/shifts/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    await db.collection("active_shifts").doc(id).update({ notes });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Employee Management ---
app.post("/employees", async (req, res) => {
  const emp = req.body;
  try {
    const pin_hash = hashPin(emp.pin);
    const data = {
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      pin_hash,
      role: emp.role,
      is_active: emp.is_active
    };
    await db.collection("employees").doc(emp.employee_id).set(data);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.collection("employees").doc(id).delete();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/employees/:id/pin", async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;
  try {
    const pin_hash = hashPin(pin);
    await db.collection("employees").doc(id).update({ pin_hash });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/employees/:id/color", async (req, res) => {
  const { id } = req.params;
  const { color } = req.body;
  try {
    await db.collection("employees").doc(id).update({ color });
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/shifts/:id/seed", async (req, res) => {
  const { id } = req.params;
  const { shiftType, date } = req.body;
  const activeTeamPids = ["EMP_01", "EMP_03", "EMP_04"];
  
  try {
    const templatesSnap = await db.collection("chore_templates").get();
    let templates = [];
    templatesSnap.forEach(doc => templates.push(doc.data()));

    if (templates.length === 0) {
      const seeded = [];
      for (const t of OPENING_TASKS) {
        const docRef = db.collection("chore_templates").doc(t.id);
        const data = { id: t.id, name: t.name, cat: t.cat, shift_type: 'opening', subtasks: t.subtasks || [] };
        await docRef.set(data);
        seeded.push(data);
      }
      for (const t of CLOSING_TASKS) {
        const docRef = db.collection("chore_templates").doc(t.id);
        const data = { id: t.id, name: t.name, cat: t.cat, shift_type: 'closing', subtasks: t.subtasks || [] };
        await docRef.set(data);
        seeded.push(data);
      }
      templates = seeded;
    }

    const taskTemplates = templates.filter(t => t.shift_type === shiftType);
    const teamList = [
      { id: "EMP_01", name: "Alice Smith" },
      { id: "EMP_03", name: "Charlie Brown" },
      { id: "EMP_04", name: "David Miller" }
    ];

    let completedCount = 0;
    const tasksToCompleteCount = Math.min(14, taskTemplates.length);
    const initialTasks = {};

    taskTemplates.forEach((t, index) => {
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

    const shiftDocRef = db.collection("active_shifts").doc(id);
    const shiftData = {
      shift_id: id,
      shift_type: shiftType,
      date: date,
      initialized_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      active_team_pids: activeTeamPids,
      status: "open",
      completed_count: completedCount,
      total_count: taskTemplates.length
    };

    await shiftDocRef.set(shiftData);

    for (const tId in initialTasks) {
      await shiftDocRef.collection("tasks").doc(tId).set(initialTasks[tId]);
    }

    res.status(200).json({
      ...shiftData,
      tasks: initialTasks
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/shifts/cleanup", async (req, res) => {
  try {
    const querySnapshot = await db.collection("active_shifts").get();
    const analyticsPayloads = [];

    for (const docSnapshot of querySnapshot.docs) {
      const shiftData = docSnapshot.data();
      if (shiftData.status === "open" || shiftData.status === "pending_signatures") {
        const shiftId = docSnapshot.id;
        const tasksSnap = await docSnapshot.ref.collection("tasks").get();
        let missedCount = 0;

        for (const tDoc of tasksSnap.docs) {
          const task = tDoc.data();
          if (!task.is_completed) {
            missedCount++;
            await tDoc.ref.update({ missed: true });
          }
        }

        await docSnapshot.ref.update({
          status: "missed_cleanup",
          missed_count: missedCount,
          cleaned_up_at: new Date().toISOString()
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

    res.status(200).json(analyticsPayloads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Billing Kill Switch ---
// Triggered by Pub/Sub message from budget alarm.
exports.stopBilling = onRequest({ maxInstances: 1, cors: false }, async (req, res) => {
  // Budget Pub/Sub messages are sent as POST requests with the data in the body
  console.log("STOP BILLING FUNCTION TRIGGERED:", JSON.stringify(req.body));
  try {
    const projectName = `projects/${process.env.GCLOUD_PROJECT}`;
    
    // Initialize the billing client
    const { BillingAccountServiceClient } = require("@google-cloud/billing");
    const client = new BillingAccountServiceClient();
    
    // Retrieve project billing info
    const [billingInfo] = await client.getProjectBillingInfo({ name: projectName });
    
    if (billingInfo.billingEnabled) {
      console.log(`Billing is enabled for project ${projectName}. Disabling now...`);
      
      // Disable billing by setting the billing account name to empty string
      await client.updateProjectBillingInfo({
        name: projectName,
        projectBillingInfo: {
          billingAccountName: "" // Unlinks the billing account
        }
      });
      console.log(`Billing successfully disabled for ${projectName}.`);
      return res.status(200).send("Billing successfully disabled.");
    } else {
      console.log(`Billing is already disabled for project ${projectName}.`);
      return res.status(200).send("Billing already disabled.");
    }
  } catch (err) {
    console.error("Failed to disable billing:", err);
    return res.status(500).send("Failed to disable billing: " + err.message);
  }
});

// Main Express API endpoint with strict scaling cap
exports.api = onRequest({ maxInstances: 1, cors: true }, app);
