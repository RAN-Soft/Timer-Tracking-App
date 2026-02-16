// AttendancePage.ts
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useUserAvatar } from "@/services/userAvatar";
import {
    fetchEmployees,
    fetchTodayCheckins,
    type EmployeeApi,
    type EmployeeCheckinApi,
} from "@/services/frappeApi";
import { logout as authLogout } from "@/services/authService";

export function useAttendancePage() {
    const employees = ref<EmployeeApi[]>([]);
    const checkins = ref<EmployeeCheckinApi[]>([]);
    const loading = ref(false);
    const navigatorOnLine = ref<boolean>(navigator.onLine);

    const toastOpen = ref(false);
    const toastMessage = ref("");

    // Avatar
    const { userInitials, avatarColor, loadUserInitials, logout: avatarLogout } = useUserAvatar();

    function showToast(msg: string) {
        toastMessage.value = msg;
        toastOpen.value = true;
    }

    // Map: letzter Checkin pro Mitarbeiter
    const checkinsMap = computed(() => {
        const map = new Map<string, EmployeeCheckinApi>();

        for (const c of checkins.value) {
            const existing = map.get(c.employee);
            if (!existing || c.time > existing.time) {
                map.set(c.employee, c);
            }
        }
        return map;
    });

    function isOnline(employeeName: string): boolean {
        const last = checkinsMap.value.get(employeeName);
        return !!last && last.log_type === "IN";
    }

    async function reload() {
        loading.value = true;
        try {
            const [empList, chkList] = await Promise.all([
                fetchEmployees(),
                fetchTodayCheckins(),
            ]);

            employees.value = empList;
            checkins.value = chkList;
        } catch (e: any) {
            console.error("Failed to load attendance", e);
            showToast(e?.message || "Fehler beim Laden der Anwesenheit.");
        } finally {
            loading.value = false;
        }
    }

    async function doLogout() {
        // Wenn du überall einheitlich Avatar-Logout willst:
        // await avatarLogout();
        // Falls Attendance bisher authLogout genutzt hat:
        await authLogout();
    }

    function onOnline() {
        navigatorOnLine.value = true;
    }

    function onOffline() {
        navigatorOnLine.value = false;
    }

    onMounted(async () => {
        await loadUserInitials();
        await reload();

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
    });

    onBeforeUnmount(() => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
    });

    return {
        // state
        employees,
        loading,
        navigatorOnLine,
        toastOpen,
        toastMessage,

        // avatar
        userInitials,
        avatarColor,

        // methods
        reload,
        isOnline,
        doLogout,
    };
}
