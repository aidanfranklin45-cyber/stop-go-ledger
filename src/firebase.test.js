import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';

// 1. Mock LocalStorage before importing firebase
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

globalThis.localStorage = new LocalStorageMock();

// Dynamically import firebase to ensure localStorage mock is in place before initialization
let firebaseModule;
beforeAll(async () => {
  firebaseModule = await import('./firebase.js');
  // Wait a small amount of time to let the async initMockDatabase run
  await new Promise(resolve => setTimeout(resolve, 50));
});

describe('Firebase Service Unit Tests', () => {

  describe('hashPin', () => {
    it('should generate correct SHA-256 hash for PIN "1111"', async () => {
      const { hashPin } = firebaseModule;
      const hash = await hashPin('1111');
      expect(hash).toBe('0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c');
    });

    it('should generate different hashes for different PINs', async () => {
      const { hashPin } = firebaseModule;
      const hash1 = await hashPin('1111');
      const hash2 = await hashPin('2222');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('startShift', () => {
    beforeEach(() => {
      globalThis.localStorage.clear();
      // Re-initialize mock database after clear to ensure employees/shifts are set up
      const mockEmployees = firebaseModule.SEED_EMPLOYEES.map(emp => ({
        employee_id: emp.id,
        employee_name: emp.name,
        pin_hash: 'mock_hash',
        role: emp.role,
        is_active: emp.is_active
      }));
      globalThis.localStorage.setItem('stop_go_mock_employees_v2', JSON.stringify(mockEmployees));
      globalThis.localStorage.setItem('stop_go_mock_shifts', JSON.stringify({}));
    });

    it('should initialize opening shift and seed tasks verbatim', async () => {
      const { startShift, OPENING_TASKS } = firebaseModule;
      const shiftId = 'shift_open_01';
      const activeTeam = ['EMP_01', 'EMP_03'];
      const date = '2026-06-12';

      const shift = await startShift(shiftId, 'opening', date, activeTeam);

      expect(shift).toBeDefined();
      expect(shift.shift_id).toBe(shiftId);
      expect(shift.shift_type).toBe('opening');
      expect(shift.date).toBe(date);
      expect(shift.active_team_pids).toEqual(activeTeam);
      expect(shift.status).toBe('open');
      expect(shift.completed_count).toBe(0);
      expect(shift.total_count).toBe(OPENING_TASKS.length);
      expect(Object.keys(shift.tasks).length).toBe(OPENING_TASKS.length);

      // Verify a task is seeded verbatim
      const firstTaskTemplate = OPENING_TASKS[0];
      const seededTask = shift.tasks[firstTaskTemplate.id];
      expect(seededTask).toBeDefined();
      expect(seededTask.task_id).toBe(firstTaskTemplate.id);
      expect(seededTask.task_name).toBe(firstTaskTemplate.name);
      expect(seededTask.category).toBe(firstTaskTemplate.cat);
      expect(seededTask.is_completed).toBe(false);
      expect(seededTask.completed_by_id).toBeNull();
      expect(seededTask.completed_by_name).toBeNull();
      expect(seededTask.timestamp).toBeNull();
    });

    it('should initialize closing shift and seed tasks verbatim', async () => {
      const { startShift, CLOSING_TASKS } = firebaseModule;
      const shiftId = 'shift_close_01';
      const activeTeam = ['EMP_02', 'EMP_04'];
      const date = '2026-06-12';

      const shift = await startShift(shiftId, 'closing', date, activeTeam);

      expect(shift.shift_type).toBe('closing');
      expect(shift.total_count).toBe(CLOSING_TASKS.length);
      expect(Object.keys(shift.tasks).length).toBe(CLOSING_TASKS.length);

      const firstTaskTemplate = CLOSING_TASKS[0];
      const seededTask = shift.tasks[firstTaskTemplate.id];
      expect(seededTask).toBeDefined();
      expect(seededTask.task_id).toBe(firstTaskTemplate.id);
      expect(seededTask.task_name).toBe(firstTaskTemplate.name);
      expect(seededTask.category).toBe(firstTaskTemplate.cat);
    });
  });

  describe('updateTask', () => {
    let shiftId = 'shift_update_test';

    beforeEach(async () => {
      globalThis.localStorage.clear();
      const { startShift } = firebaseModule;
      await startShift(shiftId, 'opening', '2026-06-12', ['EMP_01']);
    });

    it('should mark a task as completed and update count and flags', async () => {
      const { updateTask, OPENING_TASKS } = firebaseModule;
      const taskId = OPENING_TASKS[0].id;
      const employeeId = 'EMP_01';
      const employeeName = 'Alice Smith';

      const updatedShift = await updateTask(shiftId, taskId, true, employeeId, employeeName);

      expect(updatedShift.tasks[taskId].is_completed).toBe(true);
      expect(updatedShift.tasks[taskId].completed_by_id).toBe(employeeId);
      expect(updatedShift.tasks[taskId].completed_by_name).toBe(employeeName);
      expect(updatedShift.tasks[taskId].timestamp).not.toBeNull();
      expect(updatedShift.completed_count).toBe(1);
    });

    it('should unmark a task as completed and reset count and flags', async () => {
      const { updateTask, OPENING_TASKS } = firebaseModule;
      const taskId = OPENING_TASKS[0].id;

      // Complete first
      await updateTask(shiftId, taskId, true, 'EMP_01', 'Alice Smith');
      // Then uncomplete
      const updatedShift = await updateTask(shiftId, taskId, false, null, null);

      expect(updatedShift.tasks[taskId].is_completed).toBe(false);
      expect(updatedShift.tasks[taskId].completed_by_id).toBeNull();
      expect(updatedShift.tasks[taskId].completed_by_name).toBeNull();
      expect(updatedShift.tasks[taskId].timestamp).toBeNull();
      expect(updatedShift.completed_count).toBe(0);
    });

    it('should auto-advance status to pending_signatures when all tasks completed', async () => {
      const { startShift, updateTask, OPENING_TASKS } = firebaseModule;
      const testShiftId = 'shift_complete_all';
      await startShift(testShiftId, 'opening', '2026-06-12', ['EMP_01']);

      let finalShift;
      for (const t of OPENING_TASKS) {
        finalShift = await updateTask(testShiftId, t.id, true, 'EMP_01', 'Alice Smith');
      }

      expect(finalShift.completed_count).toBe(OPENING_TASKS.length);
      expect(finalShift.status).toBe('pending_signatures');
    });

    it('should regress status to open if a task is uncompleted from pending_signatures', async () => {
      const { startShift, updateTask, OPENING_TASKS } = firebaseModule;
      const testShiftId = 'shift_regress';
      await startShift(testShiftId, 'opening', '2026-06-12', ['EMP_01']);

      let finalShift;
      for (const t of OPENING_TASKS) {
        finalShift = await updateTask(testShiftId, t.id, true, 'EMP_01', 'Alice Smith');
      }
      expect(finalShift.status).toBe('pending_signatures');

      // Uncomplete one task
      const regressedShift = await updateTask(testShiftId, OPENING_TASKS[0].id, false, null, null);
      expect(regressedShift.status).toBe('open');
    });
  });

  describe('updateShiftRoster', () => {
    const shiftId = 'shift_roster_test';

    beforeEach(async () => {
      globalThis.localStorage.clear();
      const { startShift } = firebaseModule;
      await startShift(shiftId, 'opening', '2026-06-12', ['EMP_01']);
    });

    it('should update the active team members list correctly', async () => {
      const { updateShiftRoster } = firebaseModule;
      const newTeam = ['EMP_01', 'EMP_02', 'EMP_03'];

      const updatedShift = await updateShiftRoster(shiftId, newTeam);

      expect(updatedShift.active_team_pids).toEqual(newTeam);
    });
  });

  describe('submitShiftSignatures', () => {
    const shiftId = 'shift_signatures_test';

    beforeEach(async () => {
      globalThis.localStorage.clear();
      const { startShift } = firebaseModule;
      await startShift(shiftId, 'opening', '2026-06-12', ['EMP_01', 'EMP_02']);
    });

    it('should submit shift signatures and update status to submitted', async () => {
      const { submitShiftSignatures } = firebaseModule;
      const signatures = {
        manager_id: 'EMP_01',
        manager_name: 'Alice Smith',
        operator_id: 'EMP_03',
        operator_name: 'Charlie Brown'
      };

      const updatedShift = await submitShiftSignatures(shiftId, signatures);

      expect(updatedShift.status).toBe('submitted');
      expect(updatedShift.signatures).toEqual(signatures);
      expect(updatedShift.submitted_at).toBeDefined();
      expect(new Date(updatedShift.submitted_at).getTime()).not.toBeNaN();
    });

    it('should submit shift signatures with tillReport and save till status and discrepancy', async () => {
      const { submitShiftSignatures } = firebaseModule;
      const signatures = [
        { employeeId: 'EMP_01', name: 'Alice Smith', timestamp: new Date().toISOString() }
      ];
      const tillReport = {
        till_status: 'under',
        till_discrepancy_amount: 12.50
      };

      const updatedShift = await submitShiftSignatures(shiftId, signatures, tillReport);

      expect(updatedShift.status).toBe('submitted');
      expect(updatedShift.signatures).toEqual(signatures);
      expect(updatedShift.till_status).toBe('under');
      expect(updatedShift.till_discrepancy_amount).toBe(12.50);
    });
  });

  describe('simulateDailyCleanup', () => {
    beforeEach(() => {
      globalThis.localStorage.clear();
    });

    it('should perform 04:00 AM auto-lock, mark incomplete tasks as missed, and return correct analytics payload', async () => {
      const { startShift, updateTask, simulateDailyCleanup, OPENING_TASKS } = firebaseModule;
      
      const shiftId1 = 'shift_cleanup_01';
      const shiftId2 = 'shift_cleanup_02';
      const shiftIdSubmitted = 'shift_cleanup_submitted';

      // Start shift 1: open with 0 completed tasks
      await startShift(shiftId1, 'opening', '2026-06-11', ['EMP_01']);

      // Start shift 2: open with some completed tasks
      await startShift(shiftId2, 'opening', '2026-06-11', ['EMP_02']);
      await updateTask(shiftId2, OPENING_TASKS[0].id, true, 'EMP_02', 'Bob Jones');

      // Start shift 3: submitted shift
      await startShift(shiftIdSubmitted, 'opening', '2026-06-11', ['EMP_01']);
      // Complete all tasks and submit signatures
      for (const t of OPENING_TASKS) {
        await updateTask(shiftIdSubmitted, t.id, true, 'EMP_01', 'Alice Smith');
      }
      await firebaseModule.submitShiftSignatures(shiftIdSubmitted, {
        manager_id: 'EMP_01',
        manager_name: 'Alice Smith',
        operator_id: 'EMP_03',
        operator_name: 'Charlie Brown'
      });

      // Run cleanup
      const payloads = await simulateDailyCleanup();

      // Verify that shift 1 and shift 2 were processed, but shift 3 (submitted) was not
      expect(payloads.length).toBe(2);

      const payload1 = payloads.find(p => p.shift_id === shiftId1);
      const payload2 = payloads.find(p => p.shift_id === shiftId2);
      const payloadSubmitted = payloads.find(p => p.shift_id === shiftIdSubmitted);

      expect(payload1).toBeDefined();
      expect(payload2).toBeDefined();
      expect(payloadSubmitted).toBeUndefined();

      // Check structure and values of payload 1
      expect(payload1.date).toBe('2026-06-11');
      expect(payload1.shift_type).toBe('opening');
      expect(payload1.status_before_cleanup).toBe('open');
      expect(payload1.completed_tasks).toBe(0);
      expect(payload1.total_tasks).toBe(OPENING_TASKS.length);
      expect(payload1.missed_tasks_count).toBe(OPENING_TASKS.length);
      expect(payload1.active_team).toEqual(['EMP_01']);

      // Check structure and values of payload 2
      expect(payload2.status_before_cleanup).toBe('open');
      expect(payload2.completed_tasks).toBe(1);
      expect(payload2.total_tasks).toBe(OPENING_TASKS.length);
      expect(payload2.missed_tasks_count).toBe(OPENING_TASKS.length - 1);

      // Verify changes persisted in localStorage for shift 1
      const activeShift1 = await firebaseModule.getActiveShift(shiftId1);
      expect(activeShift1.status).toBe('missed_cleanup');
      expect(activeShift1.missed_count).toBe(OPENING_TASKS.length);
      expect(activeShift1.cleaned_up_at).toBeDefined();
      
      // All tasks in shift 1 should have missed: true
      Object.values(activeShift1.tasks).forEach(task => {
        expect(task.missed).toBe(true);
      });

      // Verify changes persisted for shift 2
      const activeShift2 = await firebaseModule.getActiveShift(shiftId2);
      expect(activeShift2.status).toBe('missed_cleanup');
      expect(activeShift2.missed_count).toBe(OPENING_TASKS.length - 1);
      
      // The completed task should not have missed: true
      const completedTask = activeShift2.tasks[OPENING_TASKS[0].id];
      expect(completedTask.is_completed).toBe(true);
      expect(completedTask.missed).toBeUndefined();

      // The incomplete tasks should have missed: true
      const incompleteTask = activeShift2.tasks[OPENING_TASKS[1].id];
      expect(incompleteTask.is_completed).toBe(false);
      expect(incompleteTask.missed).toBe(true);

      // Verify shift 3 was untouched
      const activeShiftSubmitted = await firebaseModule.getActiveShift(shiftIdSubmitted);
      expect(activeShiftSubmitted.status).toBe('submitted');
      expect(activeShiftSubmitted.missed_count).toBeUndefined();
    });
  });

  describe('seedTestScenario', () => {
    beforeEach(() => {
      globalThis.localStorage.clear();
      const mockEmployees = firebaseModule.SEED_EMPLOYEES.map(emp => ({
        employee_id: emp.id,
        employee_name: emp.name,
        pin_hash: 'mock_hash',
        role: emp.role,
        is_active: emp.is_active
      }));
      globalThis.localStorage.setItem('stop_go_mock_employees_v2', JSON.stringify(mockEmployees));
      globalThis.localStorage.setItem('stop_go_mock_shifts', JSON.stringify({}));
    });

    it('should pre-populate active team with EMP_01, EMP_03, EMP_04 and complete 14 tasks with assignees', async () => {
      const { seedTestScenario, OPENING_TASKS } = firebaseModule;
      const shiftId = 'test_seeded_scenario';
      const date = '2026-06-12';
      
      const shift = await seedTestScenario(shiftId, 'opening', date);

      expect(shift).toBeDefined();
      expect(shift.shift_id).toBe(shiftId);
      expect(shift.shift_type).toBe('opening');
      expect(shift.active_team_pids).toEqual(['EMP_01', 'EMP_03', 'EMP_04']);
      expect(shift.status).toBe('open');
      expect(shift.completed_count).toBe(14);
      expect(shift.total_count).toBe(OPENING_TASKS.length);

      // Verify that the first 14 tasks are completed
      for (let i = 0; i < 14; i++) {
        const tId = OPENING_TASKS[i].id;
        const task = shift.tasks[tId];
        expect(task.is_completed).toBe(true);
        expect(task.completed_by_id).not.toBeNull();
        expect(task.completed_by_name).not.toBeNull();
        expect(task.timestamp).not.toBeNull();
      }

      // Verify that task 15 is not completed
      const tId15 = OPENING_TASKS[14].id;
      const task15 = shift.tasks[tId15];
      expect(task15.is_completed).toBe(false);
      expect(task15.completed_by_id).toBeNull();
      expect(task15.completed_by_name).toBeNull();
      expect(task15.timestamp).toBeNull();
    });
  });

  describe('Chore Templates CRUD & Shift History Queries', () => {
    beforeEach(() => {
      globalThis.localStorage.clear();
      globalThis.localStorage.setItem('stop_go_mock_shifts', JSON.stringify({}));
      globalThis.localStorage.removeItem('stop_go_mock_chore_templates');
    });

    it('should fetch default templates when unseeded and filter by shift type', async () => {
      const { getChoreTemplates } = firebaseModule;
      const templates = await getChoreTemplates();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      const opening = templates.filter(t => t.shift_type === 'opening');
      const closing = templates.filter(t => t.shift_type === 'closing');
      expect(opening.length).toBe(24);
      expect(closing.length).toBe(27);
    });

    it('should support adding and deleting chore templates', async () => {
      const { getChoreTemplates, addChoreTemplate, deleteChoreTemplate } = firebaseModule;
      
      const initial = await getChoreTemplates();
      const initialLength = initial.length;

      const newChore = await addChoreTemplate({
        name: "Test Custom Task",
        cat: "Facilities",
        shift_type: "opening"
      });

      expect(newChore).toBeDefined();
      expect(newChore.id).toBeDefined();
      expect(newChore.name).toBe("Test Custom Task");
      expect(newChore.cat).toBe("Facilities");

      const afterAdd = await getChoreTemplates();
      expect(afterAdd.length).toBe(initialLength + 1);
      expect(afterAdd.find(t => t.id === newChore.id)).toBeDefined();

      const success = await deleteChoreTemplate(newChore.id);
      expect(success).toBe(true);

      const afterDelete = await getChoreTemplates();
      expect(afterDelete.length).toBe(initialLength);
      expect(afterDelete.find(t => t.id === newChore.id)).toBeUndefined();
    });

    it('should support updating chore templates', async () => {
      const { getChoreTemplates, addChoreTemplate, updateChoreTemplate } = firebaseModule;

      const newChore = await addChoreTemplate({
        name: "Update Test Task",
        cat: "Facilities",
        shift_type: "opening"
      });

      const updated = await updateChoreTemplate(newChore.id, {
        name: "Renamed Test Task",
        cat: "Heavy Clean",
        shift_type: "closing"
      });

      expect(updated).toBeDefined();
      expect(updated.id).toBe(newChore.id);
      expect(updated.name).toBe("Renamed Test Task");
      expect(updated.cat).toBe("Heavy Clean");
      expect(updated.shift_type).toBe("closing");

      const afterUpdate = await getChoreTemplates();
      const fetched = afterUpdate.find(t => t.id === newChore.id);
      expect(fetched).toBeDefined();
      expect(fetched.name).toBe("Renamed Test Task");
      expect(fetched.cat).toBe("Heavy Clean");
      expect(fetched.shift_type).toBe("closing");
    });

    it('should return submitted shifts sorted descending', async () => {
      const { startShift, submitShiftSignatures, getSubmittedShifts } = firebaseModule;
      
      await startShift('shift_hist_01', 'opening', '2026-06-11', ['EMP_01']);
      await startShift('shift_hist_02', 'closing', '2026-06-12', ['EMP_01']);
      
      await submitShiftSignatures('shift_hist_01', [{ name: "Alice" }]);
      await submitShiftSignatures('shift_hist_02', [{ name: "Bob" }]);

      const history = await getSubmittedShifts();
      expect(history.length).toBe(2);
      expect(history[0].shift_id).toBe('shift_hist_02');
      expect(history[1].shift_id).toBe('shift_hist_01');
    });

    it('should support deleting shifts', async () => {
      const { startShift, submitShiftSignatures, getSubmittedShifts, deleteShift } = firebaseModule;

      await startShift('shift_delete_test_id', 'opening', '2026-06-12', ['EMP_01']);
      await submitShiftSignatures('shift_delete_test_id', [{ name: "Alice" }]);

      const beforeDelete = await getSubmittedShifts();
      expect(beforeDelete.find(s => s.shift_id === 'shift_delete_test_id')).toBeDefined();

      const success = await deleteShift('shift_delete_test_id');
      expect(success).toBe(true);

      const afterDelete = await getSubmittedShifts();
      expect(afterDelete.find(s => s.shift_id === 'shift_delete_test_id')).toBeUndefined();
    });
  });

  describe('Employee CRUD Operations', () => {
    beforeEach(async () => {
      globalThis.localStorage.clear();
      // Seed employees into the current database key
      const { SEED_EMPLOYEES, hashPin } = firebaseModule;
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
      globalThis.localStorage.setItem('stop_go_mock_employees_v2', JSON.stringify(hashedEmployees));
    });

    it('should retrieve seeded employees and validate their 6-digit PINs', async () => {
      const { getEmployees, validateEmployeePin } = firebaseModule;
      const emps = await getEmployees();
      expect(emps.length).toBe(5);
      
      const emp1 = emps.find(e => e.employee_id === 'EMP_01');
      expect(emp1).toBeDefined();
      expect(emp1.employee_name).toBe('Alice Smith');
      expect(emp1.role).toBe('manager');

      // Validate correct PIN
      const isValid = await validateEmployeePin('EMP_01', '111111');
      expect(isValid).toBe(true);

      // Validate incorrect PIN
      const isInvalid = await validateEmployeePin('EMP_01', '123456');
      expect(isInvalid).toBe(false);
    });

    it('should add a new employee and hash their 6-digit PIN', async () => {
      const { getEmployees, addEmployee, validateEmployeePin } = firebaseModule;
      
      const newEmp = await addEmployee({
        employee_name: 'Jordan Belfort',
        role: 'operator',
        pin: '654321'
      });

      expect(newEmp).toBeDefined();
      expect(newEmp.employee_id).toBeDefined();
      expect(newEmp.employee_name).toBe('Jordan Belfort');
      expect(newEmp.role).toBe('operator');

      const emps = await getEmployees();
      expect(emps.length).toBe(6);
      expect(emps.find(e => e.employee_name === 'Jordan Belfort')).toBeDefined();

      const isValid = await validateEmployeePin(newEmp.employee_id, '654321');
      expect(isValid).toBe(true);
    });

    it('should update an existing employee PIN code', async () => {
      const { updateEmployeePin, validateEmployeePin } = firebaseModule;

      const success = await updateEmployeePin('EMP_03', '999999');
      expect(success).toBe(true);

      // New PIN should work
      const isNewValid = await validateEmployeePin('EMP_03', '999999');
      expect(isNewValid).toBe(true);

      // Old PIN should not work
      const isOldValid = await validateEmployeePin('EMP_03', '333333');
      expect(isOldValid).toBe(false);
    });

    it('should delete an employee by ID', async () => {
      const { getEmployees, deleteEmployee } = firebaseModule;

      const success = await deleteEmployee('EMP_05');
      expect(success).toBe(true);

      const emps = await getEmployees();
      expect(emps.length).toBe(4);
      expect(emps.find(e => e.employee_id === 'EMP_05')).toBeUndefined();
    });
  });

  describe('Phase 4: Discord Webhook and Shift Notes', () => {
    let originalFetch;

    beforeAll(() => {
      originalFetch = globalThis.fetch;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    beforeEach(() => {
      globalThis.localStorage.clear();
    });

    it('should write and update shift notes successfully', async () => {
      const { startShift, updateShiftNotes, getActiveShift } = firebaseModule;
      const shiftId = 'notes_test_shift';
      await startShift(shiftId, 'opening', '2026-06-14', ['EMP_01']);

      const updated = await updateShiftNotes(shiftId, 'This is a test note');
      expect(updated).toBeDefined();
      expect(updated.notes).toBe('This is a test note');

      const retrieved = await getActiveShift(shiftId);
      expect(retrieved.notes).toBe('This is a test note');
    });

    it('should invoke sendDiscordShiftStarted and make POST fetch request', async () => {
      const { sendDiscordShiftStarted } = firebaseModule;
      let calledUrl = null;
      let calledOptions = null;

      globalThis.fetch = async (url, options) => {
        calledUrl = url;
        calledOptions = options;
        return { ok: true };
      };

      const mockShift = {
        date: '2026-06-14',
        shift_type: 'opening',
        active_team_pids: ['EMP_01', 'EMP_02']
      };

      await sendDiscordShiftStarted(mockShift, 'https://discord.com/api/webhooks/test');

      expect(calledUrl).toBe('https://discord.com/api/webhooks/test');
      expect(calledOptions.method).toBe('POST');
      const payload = JSON.parse(calledOptions.body);
      expect(payload.content).toContain('Shift started');
      expect(payload.embeds[0].title).toContain('Shift Started');
    });

    it('should invoke sendDiscordShiftArchived and make POST fetch request', async () => {
      const { sendDiscordShiftArchived } = firebaseModule;
      let calledUrl = null;
      let calledOptions = null;

      globalThis.fetch = async (url, options) => {
        calledUrl = url;
        calledOptions = options;
        return { ok: true };
      };

      const mockPayload = {
        date: '2026-06-14',
        shift_type: 'closing',
        completed_tasks: 10,
        total_tasks: 12,
        missed_tasks_count: 2,
        active_team: ['EMP_01']
      };

      await sendDiscordShiftArchived(mockPayload, 'https://discord.com/api/webhooks/test');

      expect(calledUrl).toBe('https://discord.com/api/webhooks/test');
      expect(calledOptions.method).toBe('POST');
      const payload = JSON.parse(calledOptions.body);
      expect(payload.content).toContain('Shift auto-archived');
      expect(payload.embeds[0].title).toContain('Shift Auto-Archived');
    });

    it('should invoke sendDiscordShiftDeleted and make POST fetch request', async () => {
      const { sendDiscordShiftDeleted } = firebaseModule;
      let calledUrl = null;
      let calledOptions = null;

      globalThis.fetch = async (url, options) => {
        calledUrl = url;
        calledOptions = options;
        return { ok: true };
      };

      await sendDiscordShiftDeleted('2026-06-14', 'closing', 'https://discord.com/api/webhooks/test');

      expect(calledUrl).toBe('https://discord.com/api/webhooks/test');
      expect(calledOptions.method).toBe('POST');
      const payload = JSON.parse(calledOptions.body);
      expect(payload.content).toContain('Shift deleted');
      expect(payload.embeds[0].title).toContain('Shift Deleted');
    });
  });

  describe('Phase 4 Extension: Slow Chores Scheduler', () => {
    beforeEach(() => {
      globalThis.localStorage.clear();
    });

    it('should retrieve seeded slow chores by default', async () => {
      const { getSlowChores } = firebaseModule;
      const chores = await getSlowChores();
      expect(chores).toBeDefined();
      expect(chores.length).toBe(4);
      expect(chores[0].name).toContain('Clean Bathroom');
      expect(chores[0].frequency_days).toBe(3);
      expect(chores[0].last_completed_at).toBeNull();
    });

    it('should support CRUD operations for slow chores', async () => {
      const { addSlowChore, getSlowChores, updateSlowChore, deleteSlowChore } = firebaseModule;

      // 1. Add
      const newChore = await addSlowChore({
        name: 'Clean Sidewalk Windows',
        frequency_days: 4
      });
      expect(newChore).toBeDefined();
      expect(newChore.id).toBeDefined();
      expect(newChore.name).toBe('Clean Sidewalk Windows');
      expect(newChore.frequency_days).toBe(4);

      let list = await getSlowChores();
      expect(list.length).toBe(5);
      expect(list.find(c => c.name === 'Clean Sidewalk Windows')).toBeDefined();

      // 2. Update
      const updated = await updateSlowChore(newChore.id, {
        name: 'Clean Sidewalk Windows (Deep)',
        frequency_days: 6
      });
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Clean Sidewalk Windows (Deep)');
      expect(updated.frequency_days).toBe(6);

      // 3. Delete
      const success = await deleteSlowChore(newChore.id);
      expect(success).toBe(true);
      list = await getSlowChores();
      expect(list.length).toBe(4);
      expect(list.find(c => c.id === newChore.id)).toBeUndefined();
    });

    it('should complete a slow chore and reset its last_completed_at timestamp', async () => {
      const { getSlowChores, completeSlowChore } = firebaseModule;
      const chores = await getSlowChores();
      const targetChore = chores[0];

      expect(targetChore.last_completed_at).toBeNull();

      const completed = await completeSlowChore(targetChore.id, 'EMP_01', 'Alice Smith');
      expect(completed).toBeDefined();
      expect(completed.last_completed_at).not.toBeNull();
      expect(completed.last_completed_by_id).toBe('EMP_01');
      expect(completed.last_completed_by_name).toBe('Alice Smith');

      const refreshed = (await getSlowChores()).find(c => c.id === targetChore.id);
      expect(refreshed.last_completed_at).toBe(completed.last_completed_at);
    });
  });
});
