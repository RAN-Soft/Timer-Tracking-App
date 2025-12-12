import {
    getTimeEntries,
    removeTimeEntry,
    markCheckinSynced,
    markCheckoutSynced,
    markTimesheetSynced,
    markEntryFailed,
    markEntrySynced,
    getLeaveRequests,
    removeLeaveRequest,
    markLeaveRequestFailed,
    markLeaveRequestSynced,
    setProjects,
    setActivities,
    setLeaveTypes,
} from '@/services/offlineStore';

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
} from '@/services/frappeApi';

let syncing = false;

function emitSyncUpdated() {
    window.dispatchEvent(new CustomEvent('tta-sync-updated'));
}

export async function syncMasterData() {
    if (!navigator.onLine) return;

    const [projects, activities, leaveTypes] = await Promise.all([
        fetchProjects(),
        fetchActivities(),
        fetchLeaveTypes(),
    ]);

    setProjects(projects);
    setActivities(activities);
    setLeaveTypes(leaveTypes);

    emitSyncUpdated();
}

export async function syncTimeEntries() {
    if (!navigator.onLine) return;

    const employee = await getCurrentEmployeeName();
    const entries = getTimeEntries();

    for (const entry of entries) {
        try {
            // IN nur senden wenn noch nicht gesendet
            if (!entry.checkinSynced) {
                const inPayload: EmployeeCheckinPayload = {
                    employee,
                    time: entry.start,
                    log_type: 'IN',
                    latitude: entry.latitudeIn,
                    longitude: entry.longitudeIn,
                };
                await createEmployeeCheckin(inPayload);
                markCheckinSynced(entry.id);
            }

            // OUT nur wenn entry.end vorhanden und noch nicht gesendet
            if (entry.end && !entry.checkoutSynced) {
                const outPayload: EmployeeCheckinPayload = {
                    employee,
                    time: entry.end,
                    log_type: 'OUT',
                    latitude: entry.latitudeOut,
                    longitude: entry.longitudeOut,
                };
                await createEmployeeCheckin(outPayload);
                markCheckoutSynced(entry.id);
            }

            // Timesheet nur wenn Ende vorhanden und noch nicht erstellt
            if (entry.end && !entry.timesheetSynced) {
                const tsPayload: TimesheetFromPunchPayload = {
                    employee,
                    project: entry.projectId,
                    activity_type: entry.activityId,
                    from_time: entry.start,
                    to_time: entry.end,
                    note: '',
                };
                await createTimesheetForPunch(tsPayload);
                markTimesheetSynced(entry.id);
            }

            // Wenn alles erledigt → optional löschen
            if (entry.checkinSynced && (entry.end ? entry.checkoutSynced && entry.timesheetSynced : true)) {
                // wenn entry noch offen (kein end), nicht löschen
                if (entry.end) {
                    markEntrySynced(entry.id);
                    removeTimeEntry(entry.id);
                }
            }

        } catch (e: any) {
            console.error('Failed to sync time entry', entry.id, e);
            // Bei Fehler NICHT löschen – nur markieren.
            // Wenn niemals syncbar sind.
            markEntryFailed(entry.id);
        }
    }

    emitSyncUpdated();
}

export async function syncLeaveRequests() {
    if (!navigator.onLine) return;

    const employee = await getCurrentEmployeeName();
    const reqs = getLeaveRequests();

    for (const r of reqs) {
        try {
            const payload: FrappeLeaveRequestPayload = {
                employee,
                from_date: r.from.slice(0, 10),
                to_date: r.to.slice(0, 10),
                leave_type: r.leaveType,
                reason: r.reason || undefined,
            };

            await createLeaveRequest(payload);

            markLeaveRequestSynced(r.id);
            removeLeaveRequest(r.id);
        } catch (e: any) {
            console.error('Failed to sync leave request, deleting local entry', r.id, e);
            markLeaveRequestFailed(r.id);
            removeLeaveRequest(r.id);
            window.dispatchEvent(new CustomEvent('tta-toast', { detail: { message: e?.message || 'Urlaubsantrag konnte nicht synchronisiert werden.' } }));
        }
    }

    emitSyncUpdated();
}

export async function syncAll() {
    if (syncing) return;
    if (!navigator.onLine) return;

    syncing = true;
    try {
        await syncMasterData();
        await syncTimeEntries();
        await syncLeaveRequests();
    } finally {
        syncing = false;
    }
}
