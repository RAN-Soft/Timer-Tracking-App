<template>
    <ion-page>
        <ion-header>
            <ion-toolbar color="primary">
                <ion-title>Time Tracking</ion-title>

                <!-- Avatar oben rechts -->
                <ion-buttons slot="end">
                    <ion-button id="user-avatar-btn-time">
                        <ion-avatar class="avatar-bubble" :style="{ background: avatarColor }">
                            {{ userInitials }}
                        </ion-avatar>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>

        <!-- Popover für Benutzer-Menü (Logout) -->
        <ion-popover trigger="user-avatar-btn-time" trigger-action="click">
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
            <!-- Wenn Geo-Flag aktiv ist und GPS nicht verfügbar / erlaubt, App blockieren -->
            <template v-if="geoStartupError">
                <ion-card>
                    <ion-card-header>
                        <ion-card-title>GPS erforderlich</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <p>{{ geoStartupError }}</p>
                        <ion-button expand="block" class="ion-margin-top" @click="retryGeoStartup">
                            Erneut versuchen
                        </ion-button>
                    </ion-card-content>
                </ion-card>

                <ion-item lines="none" v-if="startupCheckingGeo">
                    <ion-label>Prüfe GPS…</ion-label>
                    <ion-spinner slot="end" />
                </ion-item>
            </template>

            <!-- Normale App-Oberfläche, nur wenn kein Start-Blocker aktiv -->
            <template v-else>
                <SyncStatusBar />

                <ion-button expand="block" color="medium" @click="syncNow">
                    Jetzt synchronisieren
                </ion-button>

                <ion-card>
                    <ion-card-header>
                        <ion-card-title>Stempeln</ion-card-title>
                    </ion-card-header>

                    <ion-card-content>
                        <!-- Hinweis, wenn noch keine Stammdaten vorhanden -->
                        <ion-item v-if="projects.length === 0 || activities.length === 0">
                            <ion-label color="medium">
                                <div v-if="loadingMasterData">
                                    Lade Projekte und Aktivitäten…
                                </div>
                                <div v-else>
                                    Es sind noch keine Projekte/Aktivitäten geladen.
                                    <br />
                                    <span v-if="!navigatorOnLine">
                                        Bitte verbinde dich einmal mit dem Internet und tippe auf
                                        „Jetzt synchronisieren“, um Stammdaten zu laden.
                                    </span>
                                    <span v-else>
                                        Tippe auf „Jetzt synchronisieren“, um Stammdaten zu laden.
                                    </span>
                                </div>
                            </ion-label>
                        </ion-item>

                        <ion-item v-if="projects.length > 0">
                            <ion-label>Projekt</ion-label>
                            <ion-select v-model="selectedProject">
                                <ion-select-option v-for="p in projects" :key="p.id" :value="p.id">
                                    {{ p.number ? (p.name + ' (' + p.number + ')') : p.name }}
                                </ion-select-option>
                            </ion-select>
                        </ion-item>

                        <ion-item v-if="activities.length > 0">
                            <ion-label>Aktivität</ion-label>
                            <ion-select v-model="selectedActivity">
                                <ion-select-option v-for="a in activities" :key="a.id" :value="a.id">
                                    {{ a.name }}
                                </ion-select-option>
                            </ion-select>
                        </ion-item>

                        <ion-button expand="block" class="ion-margin-top" :disabled="!selectedProject ||
                            !selectedActivity ||
                            waitingForLocation ||
                            projects.length === 0 ||
                            activities.length === 0
                            " @click="onPunchClick">
                            <span v-if="waitingForLocation">
                                Warte auf Standort…
                            </span>
                            <span v-else>
                                {{ activeEntry ? 'Stopp' : 'Start' }}
                            </span>
                        </ion-button>
                    </ion-card-content>
                </ion-card>

                <ion-card>
                    <ion-card-header>
                        <ion-card-title>Heutige Einträge</ion-card-title>
                    </ion-card-header>

                    <ion-card-content>
                        <ion-list>
                            <ion-item v-for="e in todaysEntries" :key="e.id">
                                <ion-label>
                                    <h2>
                                        {{ entryProject(e.projectId)?.name }}
                                        <span v-if="entryProject(e.projectId)?.number">
                                            ({{ entryProject(e.projectId)?.number }})
                                        </span>
                                        –
                                        {{ entryActivity(e.activityId)?.name }}
                                    </h2>
                                    <p>
                                        {{ formatTime(e.start) }} -
                                        {{ e.end ? formatTime(e.end) : 'läuft…' }}
                                    </p>
                                    <p>Status: {{ e.syncStatus }}</p>
                                </ion-label>
                            </ion-item>
                        </ion-list>
                    </ion-card-content>
                </ion-card>

                <ion-toast :is-open="toastOpen" :message="toastMessage" :duration="2500" @didDismiss="toastOpen = false" />
            </template>
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
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonList,
    IonToast,
    IonSpinner,
    IonButtons,
    IonAvatar,
    IonIcon,
    IonPopover,
} from '@ionic/vue';

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import SyncStatusBar from '@/components/common/SyncStatusBar.vue';
import {
    addPunch,
    getTodaysEntries,
    getTimeEntries,
    getProjects,
    getActivities,
    type TimeEntry,
    type Project,
    type Activity,
} from '@/services/offlineStore';
import { syncAll, syncMasterData } from '@/services/syncService';
import { fetchHRSettings } from '@/services/frappeApi';
import { useUserAvatar } from '@/services/userAvatar';
import { logOutOutline } from 'ionicons/icons';

// Stammdaten
const projects = ref<Project[]>(getProjects());
const activities = ref<Activity[]>(getActivities());

const loadingMasterData = ref(false);
const navigatorOnLine = ref<boolean>(navigator.onLine);

// TimeEntries reaktiv halten, damit der Button-Text toggelt
const timeEntries = ref<TimeEntry[]>(getTimeEntries());

// Auswahl
const selectedProject = ref<string | null>(projects.value[0]?.id ?? null);
const selectedActivity = ref<string | null>(activities.value[0]?.id ?? null);

// Geo-Einstellung aus HRMS
const geoRequired = ref(false);
const waitingForLocation = ref(false);

// Startup-GPS-Blocker
const startupCheckingGeo = ref(false);
const geoStartupError = ref<string | null>(null);

// Toast
const toastOpen = ref(false);
const toastMessage = ref('');

// Avatar via Composable
const { userInitials, avatarColor, loadUserInitials, logout: avatarLogout } =
    useUserAvatar();

// aktive Stempelung (abhängig von timeEntries → reaktiv)
const activeEntry = computed<TimeEntry | undefined>(() =>
    timeEntries.value.find(e => !e.end),
);

// heutige Einträge
const todaysEntries = ref<TimeEntry[]>(getTodaysEntries());

function refreshEntries() {
    timeEntries.value = getTimeEntries();
    todaysEntries.value = getTodaysEntries();
}

// Zeitformat
function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function entryProject(id: string) {
    return projects.value.find(p => p.id === id);
}

function entryActivity(id: string) {
    return activities.value.find(a => a.id === id);
}

function showToast(msg: string) {
    toastMessage.value = msg;
    toastOpen.value = true;
}

// Logout
async function doLogout() {
    await avatarLogout();
}

// Geo am Start erzwingen, wenn Flag gesetzt
function enforceGeoAtStartup() {
    if (!('geolocation' in navigator)) {
        geoStartupError.value =
            'Diese App kann ohne GPS nicht verwendet werden. Bitte ein Gerät mit Standortfunktion verwenden.';
        return;
    }

    startupCheckingGeo.value = true;
    geoStartupError.value = null;

    navigator.geolocation.getCurrentPosition(
        () => {
            startupCheckingGeo.value = false;
            geoStartupError.value = null;
        },
        (err) => {
            startupCheckingGeo.value = false;
            if (err.code === err.PERMISSION_DENIED) {
                geoStartupError.value =
                    'Bitte Standortzugriff erlauben. Ohne GPS-Freigabe kann die Zeiterfassung nicht verwendet werden.';
            } else {
                geoStartupError.value =
                    'Standort konnte nicht ermittelt werden. Bitte GPS aktivieren und erneut versuchen.';
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
        },
    );
}

function retryGeoStartup() {
    enforceGeoAtStartup();
}

// HR Settings + Stammdaten initial laden
onMounted(async () => {
    await loadUserInitials();

    try {
        const settings = await fetchHRSettings();
        if (settings) {
            const allowGeo =
                settings.allow_geolocation_tracking === 1 ||
                settings.allow_geolocation_tracking === true ||
                (settings.allow_geolocation_tracking as any) === '1';

            geoRequired.value = allowGeo;

            if (allowGeo) {
                // App darf nur mit GPS laufen
                enforceGeoAtStartup();
            }
        }
    } catch (e) {
        console.warn('HR Settings konnten nicht geladen werden', e);
    }

    await ensureMasterDataLoaded();
    refreshEntries();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('tta-sync-updated', onSyncUpdated as EventListener);
});

onBeforeUnmount(() => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('tta-sync-updated', onSyncUpdated as EventListener);
});

function onOnline() {
    navigatorOnLine.value = true;
}

function onOffline() {
    navigatorOnLine.value = false;
}

function onSyncUpdated() {
    projects.value = getProjects();
    activities.value = getActivities();

    if (!selectedProject.value && projects.value.length > 0) {
        selectedProject.value = projects.value[0].id;
    }
    if (!selectedActivity.value && activities.value.length > 0) {
        selectedActivity.value = activities.value[0].id;
    }

    refreshEntries();
}

// Stammdaten beim ersten Aufruf sicher laden (falls online)
async function ensureMasterDataLoaded() {
    projects.value = getProjects();
    activities.value = getActivities();

    if (projects.value.length > 0 && activities.value.length > 0) {
        return;
    }

    if (!navigator.onLine) {
        console.warn('Keine Stammdaten & offline → kann nichts laden');
        return;
    }

    try {
        loadingMasterData.value = true;
        await syncMasterData();
        projects.value = getProjects();
        activities.value = getActivities();

        if (projects.value.length > 0 && !selectedProject.value) {
            selectedProject.value = projects.value[0].id;
        }
        if (activities.value.length > 0 && !selectedActivity.value) {
            selectedActivity.value = activities.value[0].id;
        }
    } catch (e) {
        console.error('ensureMasterDataLoaded error', e);
    } finally {
        loadingMasterData.value = false;
    }
}

// Stempeln (Start/Stop wird im offlineStore entschieden)
function doPunch(coords?: { lat: number; lng: number }) {
    if (!selectedProject.value || !selectedActivity.value) return;
    addPunch(selectedProject.value, selectedActivity.value, coords);
    refreshEntries();
}

// Button-Klick „Start / Stopp“
function onPunchClick() {
    if (!selectedProject.value || !selectedActivity.value) return;

    if (geoRequired.value) {
        if (!('geolocation' in navigator)) {
            showToast('Ohne GPS ist Stempeln nicht möglich.');
            return;
        }

        waitingForLocation.value = true;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                waitingForLocation.value = false;
                const { latitude, longitude } = pos.coords;
                doPunch({ lat: latitude, lng: longitude });
            },
            (err) => {
                waitingForLocation.value = false;
                if (err.code === err.PERMISSION_DENIED) {
                    showToast('Bitte Standortzugriff erlauben. Ohne GPS ist Stempeln nicht möglich.');
                } else {
                    showToast('Standort konnte nicht ermittelt werden.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            },
        );
    } else {
        doPunch();
    }
}

// Sync-Button
async function syncNow() {
    await syncAll();
    await ensureMasterDataLoaded();
    refreshEntries();
}
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
</style>
  