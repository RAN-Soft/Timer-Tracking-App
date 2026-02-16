import { ref, computed, onMounted, onBeforeUnmount } from "vue";

import { addLeaveRequest, getLeaveTypes, type LeaveType } from "@/services/offlineStore";
import { syncAll, syncMasterData } from "@/services/syncService";
import {
    getCurrentEmployeeName,
    createLeaveRequest,
    type FrappeLeaveRequestPayload,
} from "@/services/frappeApi";
import { useUserAvatar } from "@/services/userAvatar";

export function useLeavePage() {
    const from = ref<string>("");
    const to = ref<string>("");
    const type = ref<string>("");
    const reason = ref<string>("");

    const toastOpen = ref(false);
    const toastMessage = ref("");

    const submitting = ref(false);

    const leaveTypes = ref<LeaveType[]>(getLeaveTypes());
    const loadingLeaveTypes = ref(false);
    const navigatorOnLine = ref<boolean>(navigator.onLine);

    const canSubmit = computed(() => !!from.value && !!to.value && !!type.value);

    // Avatar / User via Composable
    const { userInitials, avatarColor, loadUserInitials, logout: avatarLogout } = useUserAvatar();

    function showToast(msg: string) {
        toastMessage.value = msg;
        toastOpen.value = true;
    }

    async function ensureLeaveTypesLoaded() {
        leaveTypes.value = getLeaveTypes();
        if (leaveTypes.value.length > 0) return;

        if (!navigator.onLine) {
            console.warn("Keine Urlaubstypen & offline → kann nichts laden");
            return;
        }

        try {
            loadingLeaveTypes.value = true;
            await syncMasterData(); // lädt auch Leave Types
            leaveTypes.value = getLeaveTypes();
        } catch (e) {
            console.error("ensureLeaveTypesLoaded error", e);
        } finally {
            loadingLeaveTypes.value = false;
        }
    }

    async function submit() {
        if (!canSubmit.value || submitting.value) return;

        // Datum aus IonDatetime: meist ISO mit Zeit → nur yyyy-mm-dd
        const fromDate = from.value?.slice(0, 10);
        const toDate = to.value?.slice(0, 10);

        if (!fromDate || !toDate) {
            showToast("Bitte gültige Daten auswählen.");
            return;
        }

        // 📵 OFFLINE → lokal speichern, später syncen
        if (!navigator.onLine) {
            addLeaveRequest(from.value, to.value, type.value, reason.value);
            showToast("Urlaubsantrag offline gespeichert (wird synchronisiert, sobald du online bist).");

            // best-effort: falls Verbindung gerade zurückkommt
            syncAll();

            // Formular leeren
            from.value = "";
            to.value = "";
            type.value = "";
            reason.value = "";
            return;
        }

        // 🌐 ONLINE → direkt Frappe-Leave-Application anlegen
        submitting.value = true;
        try {
            const employee = await getCurrentEmployeeName();

            const payload: FrappeLeaveRequestPayload = {
                employee,
                from_date: fromDate,
                to_date: toDate,
                leave_type: type.value,
                reason: reason.value || undefined,
            };

            await createLeaveRequest(payload);

            showToast("Urlaubsantrag erfolgreich erstellt.");

            // Nur bei Erfolg Formular leeren
            from.value = "";
            to.value = "";
            type.value = "";
            reason.value = "";
        } catch (e: any) {
            console.error("Leave submit error", e);
            // ❗ fachlicher Fehler → NICHT lokal speichern
            showToast(e?.message || "Fehler beim Erstellen des Urlaubsantrags.");
        } finally {
            submitting.value = false;
        }
    }

    async function doLogout() {
        await avatarLogout();
    }

    function onOnline() {
        navigatorOnLine.value = true;
    }

    function onOffline() {
        navigatorOnLine.value = false;
    }

    function onSyncUpdated() {
        leaveTypes.value = getLeaveTypes();
    }

    onMounted(async () => {
        await loadUserInitials();
        await ensureLeaveTypesLoaded();

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        window.addEventListener("tta-sync-updated", onSyncUpdated as EventListener);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        window.removeEventListener("tta-sync-updated", onSyncUpdated as EventListener);
    });

    return {
        // form
        from,
        to,
        type,
        reason,

        // ui state
        toastOpen,
        toastMessage,
        submitting,

        // master data
        leaveTypes,
        loadingLeaveTypes,
        navigatorOnLine,

        // computed
        canSubmit,

        // avatar
        userInitials,
        avatarColor,

        // actions
        submit,
        doLogout,
        ensureLeaveTypesLoaded, // optional export (falls du es manuell triggern willst)
    };
}
