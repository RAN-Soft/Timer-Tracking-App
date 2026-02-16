import { ref, computed, onMounted, onBeforeUnmount } from "vue";

import {
    addPunch,
    getTodaysEntries,
    getTimeEntries,
    getProjects,
    getActivities,
    markCheckinSynced,
    markCheckoutSynced,
    markTimesheetSynced,
    type TimeEntry,
    type Project,
    type Activity,
} from "@/services/offlineStore";

import { syncAll, syncMasterData } from "@/services/syncService";

import {
    fetchHRSettings,
    getCurrentEmployeeName,
    createEmployeeCheckin,
    createTimesheetForPunch,
    type EmployeeCheckinPayload,
    type TimesheetFromPunchPayload,
} from "@/services/frappeApi";

type Coords = { lat: number; lng: number };

export function useTimePage() {
    // Master data
    const projects = ref<Project[]>(getProjects());
    const activities = ref<Activity[]>(getActivities());

    const selectedProject = ref<string | null>(projects.value[0]?.id ?? null);
    const selectedActivity = ref<string | null>(activities.value[0]?.id ?? null);

    // HR setting
    const geoRequired = ref(false);
    const waitingForLocation = ref(false);

    // User employee cached
    const currentEmployee = ref<string | null>(null);

    // Entries reactive
    const timeEntries = ref<TimeEntry[]>(getTimeEntries());
    const todaysEntries = ref<TimeEntry[]>(getTodaysEntries());

    const activeEntry = computed(() => timeEntries.value.find((e) => !e.end));

    // Toast
    const toastOpen = ref(false);
    const toastMessage = ref("");

    function showToast(msg: string) {
        toastMessage.value = msg;
        toastOpen.value = true;
    }

    function refreshEntries() {
        timeEntries.value = getTimeEntries();
        todaysEntries.value = getTodaysEntries();
    }

    function formatTime(ts: string) {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function entryProject(id: string) {
        return projects.value.find((p) => p.id === id);
    }

    function entryActivity(id: string) {
        return activities.value.find((a) => a.id === id);
    }

    async function ensureEmployee(): Promise<string> {
        if (!currentEmployee.value) {
            currentEmployee.value = await getCurrentEmployeeName();
        }
        return currentEmployee.value;
    }

    // ✅ Start: lokal + sofort IN übertragen (wenn online) + Flag setzen
    async function doStartImmediate(coords?: Coords) {
        const entry = addPunch(selectedProject.value!, selectedActivity.value!, coords);
        refreshEntries();

        if (!navigator.onLine) return;

        try {
            const employee = await ensureEmployee();
            const payload: EmployeeCheckinPayload = {
                employee,
                time: entry.start,
                log_type: "IN",
                latitude: entry.latitudeIn,
                longitude: entry.longitudeIn,
            };

            await createEmployeeCheckin(payload);
            markCheckinSynced(entry.id);
            refreshEntries();
        } catch (e: any) {
            console.error("Direct IN failed", e);
            showToast(e?.message || "Check-In konnte nicht übertragen werden.");
        }
    }

    // ✅ Stop: lokal + sofort OUT & Timesheet übertragen (wenn online) + Flags setzen
    async function doStopImmediate(coords?: Coords) {
        const open = activeEntry.value;
        if (!open) return;

        const stopped = addPunch(selectedProject.value!, selectedActivity.value!, coords);
        refreshEntries();

        if (!navigator.onLine) return;

        try {
            const employee = await ensureEmployee();

            // OUT
            const outPayload: EmployeeCheckinPayload = {
                employee,
                time: stopped.end!,
                log_type: "OUT",
                latitude: stopped.latitudeOut,
                longitude: stopped.longitudeOut,
            };
            await createEmployeeCheckin(outPayload);
            markCheckoutSynced(stopped.id);

            // Timesheet
            const tsPayload: TimesheetFromPunchPayload = {
                employee,
                project: open.projectId,
                activity_type: open.activityId,
                from_time: open.start,
                to_time: stopped.end!,
                note: "",
            };
            await createTimesheetForPunch(tsPayload);
            markTimesheetSynced(stopped.id);

            refreshEntries();
        } catch (e: any) {
            console.error("Direct OUT/TS failed", e);
            showToast(e?.message || "Check-Out/Timesheet konnte nicht übertragen werden.");
        }
    }

    async function onPunchClick() {
        if (!selectedProject.value || !selectedActivity.value) return;

        const isStart = !activeEntry.value;

        const handle = async (coords?: Coords) => {
            if (isStart) await doStartImmediate(coords);
            else await doStopImmediate(coords);
        };

        if (geoRequired.value) {
            if (!("geolocation" in navigator)) {
                showToast("Ohne GPS ist Stempeln nicht möglich.");
                return;
            }

            waitingForLocation.value = true;
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    waitingForLocation.value = false;
                    await handle({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                },
                (err) => {
                    waitingForLocation.value = false;
                    if (err.code === err.PERMISSION_DENIED) {
                        showToast("Bitte Standortzugriff erlauben. Ohne GPS ist Stempeln nicht möglich.");
                    } else {
                        showToast("Standort konnte nicht ermittelt werden.");
                    }
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            await handle();
        }
    }

    async function syncNow() {
        await syncAll();
        await syncMasterData();
        projects.value = getProjects();
        activities.value = getActivities();
        refreshEntries();
    }

    function onSyncUpdated() {
        projects.value = getProjects();
        activities.value = getActivities();
        refreshEntries();
    }

    onMounted(async () => {
        // HR Settings
        try {
            const settings = await fetchHRSettings();
            if (settings) {
                const allowGeo =
                    settings.allow_geolocation_tracking === 1 ||
                    settings.allow_geolocation_tracking === true ||
                    (settings.allow_geolocation_tracking as any) === "1";
                geoRequired.value = allowGeo;
            }
        } catch { }

        // Employee preload (optional)
        try {
            currentEmployee.value = await getCurrentEmployeeName();
        } catch { }

        // Master data initial load
        if (navigator.onLine) {
            await syncMasterData();
            projects.value = getProjects();
            activities.value = getActivities();
            if (!selectedProject.value && projects.value.length) selectedProject.value = projects.value[0].id;
            if (!selectedActivity.value && activities.value.length) selectedActivity.value = activities.value[0].id;
        }

        refreshEntries();
        window.addEventListener("tta-sync-updated", onSyncUpdated as EventListener);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("tta-sync-updated", onSyncUpdated as EventListener);
    });

    return {
        // state
        projects,
        activities,
        selectedProject,
        selectedActivity,
        geoRequired,
        waitingForLocation,
        timeEntries,
        todaysEntries,
        activeEntry,
        toastOpen,
        toastMessage,

        // methods
        showToast,
        refreshEntries,
        formatTime,
        entryProject,
        entryActivity,
        onPunchClick,
        syncNow,
    };
}
