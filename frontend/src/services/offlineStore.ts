// src/services/offlineStore.ts
import { v4 as uuidv4 } from 'uuid';

export type SyncStatus = 'pending' | 'synced';

export interface Project {
    id: string;
    name: string;
    number?: string | null;
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
    syncStatus: SyncStatus;
    checkinLat?: number;
    checkinLng?: number;
    checkoutLat?: number;
    checkoutLng?: number;
}

export interface LeaveRequest {
    id: string;
    from: string;  // ISO
    to: string;    // ISO
    type: string;
    reason: string;
    syncStatus: SyncStatus;
}

const KEYS = {
    timeEntries: 'time_tracking_time_entries',
    leaveRequests: 'time_tracking_leave_requests',
    projects: 'time_tracking_projects',
    activities: 'time_tracking_activities',
    leaveTypes: 'time_tracking_leave_types',
};

function load<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        return JSON.parse(raw) as T[];
    } catch (e) {
        console.error(`Failed to load from localStorage[${key}]`, e);
        return [];
    }
}

function save<T>(key: string, data: T[]) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to save to localStorage[${key}]`, e);
    }
}

// ---------------------------
// Time Entries
// ---------------------------

export function getTimeEntries(): TimeEntry[] {
    return load<TimeEntry>(KEYS.timeEntries);
}

export function saveTimeEntries(list: TimeEntry[]) {
    save(KEYS.timeEntries, list);
}

/**
 * addPunch toggelt Start/Stop:
 * - wenn kein offener Eintrag → Start
 * - wenn offener Eintrag → Endzeit setzen (Stop)
 */
export function addPunch(
    projectId: string,
    activityId: string,
    coords?: { lat: number; lng: number },
) {
    const entries = getTimeEntries();
    const open = entries.find(e => !e.end);

    if (!open) {
        // Start
        entries.push({
            id: uuidv4(),
            projectId,
            activityId,
            start: new Date().toISOString(),
            syncStatus: 'pending',
            checkinLat: coords?.lat,
            checkinLng: coords?.lng,
        });
    } else {
        // Stop (Ende setzen)
        open.end = new Date().toISOString();
        open.syncStatus = 'pending';
        if (coords) {
            open.checkoutLat = coords.lat;
            open.checkoutLng = coords.lng;
        }
    }

    saveTimeEntries(entries);
}

export function getTodaysEntries(): TimeEntry[] {
    const today = new Date();
    return getTimeEntries().filter(e => {
        const d = new Date(e.start);
        return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
        );
    });
}

export function getPendingTimeEntries(): TimeEntry[] {
    return getTimeEntries().filter(e => e.syncStatus === 'pending');
}

export function markTimeEntrySynced(id: string) {
    const list = getTimeEntries();
    const updated = list.map(e =>
        e.id === id ? { ...e, syncStatus: 'synced' } : e,
    );
    saveTimeEntries(updated);
}

/**
 * Ein TimeEntry vollständig löschen (z.B. nach permanentem Sync-Fehler)
 */
export function removeTimeEntry(id: string) {
    const list = getTimeEntries().filter(e => e.id !== id);
    saveTimeEntries(list);
}

// ---------------------------
// Leave Requests
// ---------------------------

export function getLeaveRequests(): LeaveRequest[] {
    return load<LeaveRequest>(KEYS.leaveRequests);
}

export function saveLeaveRequests(list: LeaveRequest[]) {
    save(KEYS.leaveRequests, list);
}

export function addLeaveRequest(
    from: string,
    to: string,
    type: string,
    reason: string,
) {
    const list = getLeaveRequests();

    list.push({
        id: uuidv4(),
        from,
        to,
        type,
        reason,
        syncStatus: 'pending',
    });

    saveLeaveRequests(list);
}

export function getPendingLeaveRequests(): LeaveRequest[] {
    return getLeaveRequests().filter(r => r.syncStatus === 'pending');
}

export function markLeaveRequestSynced(id: string) {
    const list = getLeaveRequests();
    const updated = list.map(r =>
        r.id === id ? { ...r, syncStatus: 'synced' } : r,
    );
    saveLeaveRequests(updated);
}

/**
 * Einen LeaveRequest vollständig löschen (z.B. nach permanentem Sync-Fehler)
 */
export function removeLeaveRequest(id: string) {
    const list = getLeaveRequests().filter(r => r.id !== id);
    saveLeaveRequests(list);
}

// ---------------------------
// Stammdaten (Projects/Activities/LeaveTypes)
// ---------------------------

export function getProjects(): Project[] {
    return load<Project>(KEYS.projects);
}

export function saveProjects(list: Project[]) {
    save(KEYS.projects, list);
}

export function getActivities(): Activity[] {
    return load<Activity>(KEYS.activities);
}

export function saveActivities(list: Activity[]) {
    save(KEYS.activities, list);
}

export function getLeaveTypes(): LeaveType[] {
    return load<LeaveType>(KEYS.leaveTypes);
}

export function saveLeaveTypes(list: LeaveType[]) {
    save(KEYS.leaveTypes, list);
}
