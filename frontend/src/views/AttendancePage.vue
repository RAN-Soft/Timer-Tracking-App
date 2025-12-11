<template>
    <ion-page>
        <ion-header>
            <ion-toolbar color="primary">
                <ion-title>Anwesenheit</ion-title>

                <!-- Avatar oben rechts wie in Time/Leave -->
                <ion-buttons slot="end">
                    <ion-button id="user-avatar-btn-attendance">
                        <ion-avatar class="avatar-bubble" :style="{ background: avatarColor }">
                            {{ userInitials }}
                        </ion-avatar>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>

        <!-- Popover für Benutzer-Menü (Logout) -->
        <ion-popover trigger="user-avatar-btn-attendance" trigger-action="click">
            <ion-content>
                <ion-list>
                    <ion-item button @click="doLogout">
                        <ion-icon slot="start" :icon="logOutOutline" />
                        <ion-label>Abmelden</ion-label>
                    </ion-item>
                </ion-list>
            </ion-content>
        </ion-popover>

        <ion-content class="ion-padding">
            <SyncStatusBar />

            <ion-item lines="none">
                <ion-label color="medium">
                    Die Anwesenheitsliste wird aus den heutigen Checkins berechnet.
                    <div v-if="!navigatorOnLine">
                        Du bist offline – Daten können veraltet sein.
                    </div>
                </ion-label>
                <ion-button slot="end" size="small" :disabled="loading" @click="reload">
                    Aktualisieren
                </ion-button>
            </ion-item>

            <ion-item v-if="loading" lines="none">
                <ion-label>Lade Anwesenheit…</ion-label>
                <ion-spinner slot="end" />
            </ion-item>

            <ion-list v-else>
                <ion-item v-for="emp in employees" :key="emp.name">
                    <div slot="start" class="status-dot" :class="{
                        'status-online': isOnline(emp.name),
                        'status-offline': !isOnline(emp.name),
                    }"></div>
                    <ion-label>
                        <h2>
                            {{ emp.first_name || '' }} {{ emp.last_name || '' }}
                            <span v-if="!emp.first_name && !emp.last_name">
                                {{ emp.employee_name || emp.name }}
                            </span>
                        </h2>
                        <p>
                            Status:
                            <strong>
                                {{ isOnline(emp.name) ? 'Anwesend' : 'Abwesend' }}
                            </strong>
                        </p>
                    </ion-label>
                </ion-item>

                <ion-item v-if="employees.length === 0">
                    <ion-label color="medium">
                        Keine Mitarbeiter gefunden.
                    </ion-label>
                </ion-item>
            </ion-list>

            <ion-toast :is-open="toastOpen" :message="toastMessage" :duration="3000" @didDismiss="toastOpen = false" />
        </ion-content>
    </ion-page>
</template>
  
<script setup lang="ts">
import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonToast,
    IonButtons,
    IonAvatar,
    IonIcon,
    IonPopover,
    IonButton,
} from '@ionic/vue';

import { ref, onMounted, onBeforeUnmount } from 'vue';
import SyncStatusBar from '@/components/common/SyncStatusBar.vue';
import { useUserAvatar } from '@/services/userAvatar';
import {
    fetchEmployees,
    fetchTodayCheckins,
    type EmployeeApi,
    type EmployeeCheckinApi,
} from '@/services/frappeApi';
import { logOutOutline } from 'ionicons/icons';
import { logout as authLogout } from '@/services/authService';

const employees = ref<EmployeeApi[]>([]);
const checkins = ref<EmployeeCheckinApi[]>([]);
const loading = ref(false);
const navigatorOnLine = ref<boolean>(navigator.onLine);

const toastOpen = ref(false);
const toastMessage = ref('');

// Avatar
const { userInitials, avatarColor, loadUserInitials } = useUserAvatar();

function showToast(msg: string) {
    toastMessage.value = msg;
    toastOpen.value = true;
}

function isOnline(employeeName: string): boolean {
    const last = checkinsMap.value.get(employeeName);
    if (!last) return false;
    return last.log_type === 'IN';
}

// Map für letzten Checkin pro Mitarbeiter
const checkinsMap = ref<Map<string, EmployeeCheckinApi>>(new Map());

function buildCheckinsMap() {
    const map = new Map<string, EmployeeCheckinApi>();

    for (const c of checkins.value) {
        const existing = map.get(c.employee);
        if (!existing) {
            map.set(c.employee, c);
            continue;
        }
        // Neueren Eintrag behalten (Zeitvergleich als String reicht hier aus)
        if (c.time > existing.time) {
            map.set(c.employee, c);
        }
    }

    checkinsMap.value = map;
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
        buildCheckinsMap();
    } catch (e: any) {
        console.error('Failed to load attendance', e);
        showToast(e?.message || 'Fehler beim Laden der Anwesenheit.');
    } finally {
        loading.value = false;
    }
}

async function doLogout() {
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

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
});

onBeforeUnmount(() => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
});
</script>
  
<style scoped>
.avatar-bubble {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    color: white;
    user-select: none;
}

.status-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    margin-right: 12px;
}

.status-online {
    background: #10b981;
    /* Grün */
}

.status-offline {
    background: #ef4444;
    /* Rot */
}
</style>
  