import {
    getPendingTimeEntries,
    getPendingLeaveRequests,
    markTimeEntrySynced,
    markLeaveRequestSynced,
    saveProjects,
    saveActivities,
    saveLeaveTypes,
    removeTimeEntry,
    removeLeaveRequest,
    type TimeEntry,
    type LeaveRequest,
    type Project,
    type Activity,
    type LeaveType,
} from './offlineStore';

import {
    fetchProjects,
    fetchActivities,
    fetchLeaveTypes,
    getCurrentEmployeeName,
    createEmployeeCheckin,
    createTimesheetForPunch,
    createLeaveRequest,
    type EmployeeCheckinPayload,
    type TimesheetFromPunchPayload,
    type FrappeLeaveRequestPayload,
    type ProjectApi,
    type ActivityApi,
    type LeaveTypeApi,
} from './frappeApi';

let isSyncRunning = false;

// ---------------------------
// Masterdaten
// ---------------------------

export async function syncMasterData() {
    try {
        const projectApiList: ProjectApi[] = await fetchProjects();
        console.log('syncMasterData: raw projects', projectApiList);

        const safeProjects: Project[] = (projectApiList || [])
            .filter(p => p && typeof p.name === 'string')
            .map(p => ({
                id: p.name,
                name: p.project_name || p.name,
                number: p.name,
            }));

        saveProjects(safeProjects);

        const activityApiList: ActivityApi[] = await fetchActivities();
        console.log('syncMasterData: raw activities', activityApiList);

        const safeActivities: Activity[] = (activityApiList || [])
            .filter(a => a && typeof a.name === 'string')
            .map(a => ({
                id: a.name,
                name: a.name,
            }));

        saveActivities(safeActivities);

        const leaveTypeApiList: LeaveTypeApi[] = await fetchLeaveTypes();
        console.log('syncMasterData: raw leave types', leaveTypeApiList);

        const safeLeaveTypes: LeaveType[] = (leaveTypeApiList || [])
            .filter(lt => lt && typeof lt.name === 'string')
            .map(lt => ({
                id: lt.name,
                name: lt.name,
            }));

        saveLeaveTypes(safeLeaveTypes);

        window.dispatchEvent(new CustomEvent('tta-sync-updated'));
    } catch (e) {
        console.error('Master data sync error', e);
    }
}

// ---------------------------
// Haupt-Sync
// ---------------------------

export async function syncAll() {
    if (isSyncRunning) {
        console.log('Sync already running, skipping');
        return;
    }
    if (!navigator.onLine) {
        console.log('Offline, skipping sync');
        return;
    }

    isSyncRunning = true;
    console.log('=== Sync started ===');
    try {
        await syncMasterData();

        const employee = await getCurrentEmployeeName();
        console.log('Sync employee:', employee);

        await syncTimeEntries(employee);
        await syncLeaveRequests(employee);

        window.dispatchEvent(new CustomEvent('tta-sync-updated'));
        console.log('=== Sync finished ===');
    } catch (error) {
        console.error('Sync failed:', error);
    } finally {
        isSyncRunning = false;
    }
}

// ---------------------------
// TimeEntries -> Checkins + Timesheet
// ---------------------------

async function syncTimeEntries(employee: string) {
    const pending: TimeEntry[] = getPendingTimeEntries();
    console.log('Pending time entries:', pending);

    if (!pending.length) return;

    for (const entry of pending) {
        if (!entry.end) {
            console.log('Skipping open entry (no end time)', entry);
            continue;
        }

        try {
            console.log('Syncing time entry', entry);

            const checkinIn: EmployeeCheckinPayload = {
                employee,
                time: entry.start,
                log_type: 'IN',
                latitude: entry.checkinLat,
                longitude: entry.checkinLng,
            };
            await createEmployeeCheckin(checkinIn);

            const checkinOut: EmployeeCheckinPayload = {
                employee,
                time: entry.end,
                log_type: 'OUT',
                latitude: entry.checkoutLat,
                longitude: entry.checkoutLng,
            };
            await createEmployeeCheckin(checkinOut);

            const tsPayload: TimesheetFromPunchPayload = {
                employee,
                project: entry.projectId,
                activity_type: entry.activityId,
                from_time: entry.start,
                to_time: entry.end,
                note: '',
            };
            await createTimesheetForPunch(tsPayload);

            markTimeEntrySynced(entry.id);
            console.log('Time entry synced:', entry.id);
        } catch (error) {
            console.error('Failed to sync time entry, deleting local entry', entry.id, error);
            // ❗ Wenn Sync fehlschlägt (z.B. Validierungsfehler), Eintrag lokal löschen
            removeTimeEntry(entry.id);
        }
    }
}

// ---------------------------
// Leave Requests
// ---------------------------

async function syncLeaveRequests(employee: string) {
    const pending: LeaveRequest[] = getPendingLeaveRequests();
    console.log('Pending leave requests:', pending);

    if (!pending.length) return;

    for (const lr of pending) {
        try {
            const payload: FrappeLeaveRequestPayload = {
                employee,
                from_date: lr.from.slice(0, 10),
                to_date: lr.to.slice(0, 10),
                leave_type: lr.type,
                reason: lr.reason,
            };

            await createLeaveRequest(payload);
            markLeaveRequestSynced(lr.id);
            console.log('Leave request synced:', lr.id);
        } catch (error) {
            console.error('Failed to sync leave request, deleting local entry', lr.id, error);
            // Bei Sync-Fehler LeaveRequest lokal löschen
            removeLeaveRequest(lr.id);
        }
    }
}
