export type SyncStatus = 'LOCAL' | 'SYNCED' | 'FAILED';

export interface Project {
    id: string;
    name: string;
    number?: string;
}

export interface Activity {
    id: string;
    name: string;
}

export interface LeaveType {
    id: string;
    name: string;
}

export interface TimeEntry {
    id: string;
    projectId: string;
    activityId: string;
    start: string; // ISO
    end?: string;  // ISO
    latitudeIn?: number;
    longitudeIn?: number;
    latitudeOut?: number;
    longitudeOut?: number;
    checkinSynced: boolean;
    checkoutSynced: boolean;
    timesheetSynced: boolean;
    syncStatus: SyncStatus;
}

export interface LeaveRequestLocal {
    id: string;
    from: string; // ISO
    to: string;   // ISO
    leaveType: string;
    reason?: string;
    syncStatus: SyncStatus;
}

interface StoreShape {
    projects: Project[];
    activities: Activity[];
    leaveTypes: LeaveType[];
    timeEntries: TimeEntry[];
    leaveRequests: LeaveRequestLocal[];
}

const STORAGE_KEY = 'tta_offline_store_v1';

function uuid(): string {
    // simple uuid v4-ish
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        // eslint-disable-next-line no-mixed-operators
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function load(): StoreShape {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return emptyStore();
        const parsed = JSON.parse(raw) as StoreShape;

        return {
            projects: parsed.projects || [],
            activities: parsed.activities || [],
            leaveTypes: parsed.leaveTypes || [],
            timeEntries: parsed.timeEntries || [],
            leaveRequests: parsed.leaveRequests || [],
        };
    } catch {
        return emptyStore();
    }
}

function save(store: StoreShape) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function emptyStore(): StoreShape {
    return {
        projects: [],
        activities: [],
        leaveTypes: [],
        timeEntries: [],
        leaveRequests: [],
    };
}

function getStore(): StoreShape {
    return load();
}

// ----------------------
// Master data
// ----------------------

export function setProjects(items: Project[]) {
    const s = getStore();
    s.projects = items;
    save(s);
}

export function setActivities(items: Activity[]) {
    const s = getStore();
    s.activities = items;
    save(s);
}

export function setLeaveTypes(items: LeaveType[]) {
    const s = getStore();
    s.leaveTypes = items;
    save(s);
}

export function getProjects(): Project[] {
    return getStore().projects;
}

export function getActivities(): Activity[] {
    return getStore().activities;
}

export function getLeaveTypes(): LeaveType[] {
    return getStore().leaveTypes;
}

// ----------------------
// Time entries
// ----------------------

export function getTimeEntries(): TimeEntry[] {
    return getStore().timeEntries;
}

export function getTodaysEntries(): TimeEntry[] {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const prefix = `${yyyy}-${mm}-${dd}`;
    return getStore().timeEntries.filter((e) => e.start.startsWith(prefix));
}

export function getOpenEntry(): TimeEntry | undefined {
    return getStore().timeEntries.find((e) => !e.end);
}

export function addPunch(
    projectId: string,
    activityId: string,
    coords?: { lat: number; lng: number },
): TimeEntry {
    const s = getStore();

    const open = s.timeEntries.find((e) => !e.end);

    const nowIso = new Date().toISOString();

    if (!open) {
        const entry: TimeEntry = {
            id: uuid(),
            projectId,
            activityId,
            start: nowIso,

            latitudeIn: coords?.lat,
            longitudeIn: coords?.lng,

            checkinSynced: false,
            checkoutSynced: false,
            timesheetSynced: false,

            syncStatus: 'LOCAL',
        };

        s.timeEntries.unshift(entry);
        save(s);
        return entry;
    }

    // Stop
    open.end = nowIso;
    open.latitudeOut = coords?.lat;
    open.longitudeOut = coords?.lng;
    open.syncStatus = 'LOCAL';
    save(s);
    return open;
}

export function markCheckinSynced(id: string) {
    const s = getStore();
    const e = s.timeEntries.find((x) => x.id === id);
    if (!e) return;
    e.checkinSynced = true;
    e.syncStatus = 'LOCAL';
    save(s);
}

export function markCheckoutSynced(id: string) {
    const s = getStore();
    const e = s.timeEntries.find((x) => x.id === id);
    if (!e) return;
    e.checkoutSynced = true;
    e.syncStatus = 'LOCAL';
    save(s);
}

export function markTimesheetSynced(id: string) {
    const s = getStore();
    const e = s.timeEntries.find((x) => x.id === id);
    if (!e) return;
    e.timesheetSynced = true;
    e.syncStatus = 'LOCAL';
    save(s);
}

export function markEntryFailed(id: string) {
    const s = getStore();
    const e = s.timeEntries.find((x) => x.id === id);
    if (!e) return;
    e.syncStatus = 'FAILED';
    save(s);
}

export function markEntrySynced(id: string) {
    const s = getStore();
    const e = s.timeEntries.find((x) => x.id === id);
    if (!e) return;
    e.syncStatus = 'SYNCED';
    save(s);
}

export function removeTimeEntry(id: string) {
    const s = getStore();
    s.timeEntries = s.timeEntries.filter((x) => x.id !== id);
    save(s);
}

// ----------------------
// Leave requests (local queue)
// ----------------------

export function addLeaveRequest(from: string, to: string, leaveType: string, reason?: string) {
    const s = getStore();
    s.leaveRequests.unshift({
        id: uuid(),
        from,
        to,
        leaveType,
        reason,
        syncStatus: 'LOCAL',
    });
    save(s);
}

export function getLeaveRequests(): LeaveRequestLocal[] {
    return getStore().leaveRequests;
}

export function removeLeaveRequest(id: string) {
    const s = getStore();
    s.leaveRequests = s.leaveRequests.filter((x) => x.id !== id);
    save(s);
}

export function markLeaveRequestFailed(id: string) {
    const s = getStore();
    const r = s.leaveRequests.find((x) => x.id === id);
    if (!r) return;
    r.syncStatus = 'FAILED';
    save(s);
}

export function markLeaveRequestSynced(id: string) {
    const s = getStore();
    const r = s.leaveRequests.find((x) => x.id === id);
    if (!r) return;
    r.syncStatus = 'SYNCED';
    save(s);
}

// ----------------------
// Pending helpers 
// ----------------------

export function getPendingTimeEntries(): TimeEntry[] {
    const entries = getTimeEntries();

    return entries.filter((e) => {
        // Offen: nur IN muss ggf. noch raus
        if (!e.end) {
            return !e.checkinSynced;
        }

        // Geschlossen: alles muss ok sein
        return !e.checkinSynced || !e.checkoutSynced || !e.timesheetSynced;
    });
}

export function getPendingLeaveRequests(): LeaveRequestLocal[] {
    return getLeaveRequests().filter((r) => r.syncStatus !== 'SYNCED');
}