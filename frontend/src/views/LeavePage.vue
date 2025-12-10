<template>
    <ion-page>
        <ion-header>
            <ion-toolbar color="primary">
                <ion-title>Urlaub</ion-title>

                <!-- Avatar oben rechts -->
                <ion-buttons slot="end">
                    <ion-button id="user-avatar-btn-leave">
                        <ion-avatar class="avatar-bubble" :style="{ background: avatarColor }">
                            {{ userInitials }}
                        </ion-avatar>
                    </ion-button>
                </ion-buttons>
            </ion-toolbar>
        </ion-header>

        <!-- Popover für Benutzer-Menü (Logout) -->
        <ion-popover trigger="user-avatar-btn-leave" trigger-action="click">
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

            <ion-card>
                <ion-card-header>
                    <ion-card-title>Urlaub beantragen</ion-card-title>
                </ion-card-header>

                <ion-card-content>
                    <ion-item>
                        <ion-label position="stacked">Von</ion-label>
                        <ion-datetime v-model="from" presentation="date" />
                    </ion-item>

                    <ion-item>
                        <ion-label position="stacked">Bis</ion-label>
                        <ion-datetime v-model="to" presentation="date" />
                    </ion-item>

                    <ion-item>
                        <ion-label position="stacked">Urlaubstyp</ion-label>
                        <ion-select v-model="type">
                            <ion-select-option v-for="lt in leaveTypes" :key="lt.id" :value="lt.name">
                                {{ lt.name }}
                            </ion-select-option>
                        </ion-select>
                    </ion-item>

                    <ion-item v-if="leaveTypes.length === 0">
                        <ion-label color="medium">
                            <div v-if="loadingLeaveTypes">
                                Lade Urlaubstypen…
                            </div>
                            <div v-else>
                                Es sind noch keine Urlaubstypen geladen.
                                <br />
                                <span v-if="!navigatorOnLine">
                                    Bitte verbinde dich einmal mit dem Internet und tippe auf
                                    „Jetzt synchronisieren“, um Urlaubstypen zu laden.
                                </span>
                                <span v-else>
                                    Tippe auf „Jetzt synchronisieren“, um Urlaubstypen zu laden.
                                </span>
                            </div>
                        </ion-label>
                    </ion-item>

                    <ion-item>
                        <ion-label position="stacked">Kommentar</ion-label>
                        <ion-textarea v-model="reason" auto-grow />
                    </ion-item>

                    <ion-button expand="block" class="ion-margin-top" :disabled="!canSubmit || submitting" @click="submit">
                        <span v-if="submitting">Sende…</span>
                        <span v-else>Absenden</span>
                    </ion-button>
                </ion-card-content>
            </ion-card>

            <ion-toast :is-open="toastOpen" :message="toastMessage" :duration="4000" @didDismiss="toastOpen = false" />
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
    IonItem,
    IonLabel,
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonToast,
    IonButtons,
    IonAvatar,
    IonIcon,
    IonPopover,
    IonList,
} from '@ionic/vue';

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import SyncStatusBar from '@/components/common/SyncStatusBar.vue';
import { addLeaveRequest, getLeaveTypes, type LeaveType } from '@/services/offlineStore';
import { syncAll, syncMasterData } from '@/services/syncService';
import {
    getCurrentEmployeeName,
    createLeaveRequest,
    type FrappeLeaveRequestPayload,
} from '@/services/frappeApi';
import { useUserAvatar } from '@/services/userAvatar';
import { logOutOutline } from 'ionicons/icons';

const from = ref<string>('');
const to = ref<string>('');
const type = ref<string>('');
const reason = ref<string>('');

const toastOpen = ref(false);
const toastMessage = ref('');

const submitting = ref(false);

const leaveTypes = ref<LeaveType[]>(getLeaveTypes());
const loadingLeaveTypes = ref(false);
const navigatorOnLine = ref<boolean>(navigator.onLine);

const canSubmit = computed(() =>
    !!from.value && !!to.value && !!type.value,
);

// Avatar / User via Composable
const { userInitials, avatarColor, loadUserInitials, logout: avatarLogout } =
    useUserAvatar();

const avatarBubbleClass = 'avatar-bubble';

async function ensureLeaveTypesLoaded() {
    leaveTypes.value = getLeaveTypes();
    if (leaveTypes.value.length > 0) return;

    if (!navigator.onLine) {
        console.warn('Keine Urlaubstypen & offline → kann nichts laden');
        return;
    }

    try {
        loadingLeaveTypes.value = true;
        await syncMasterData(); // lädt auch Leave Types
        leaveTypes.value = getLeaveTypes();
    } catch (e) {
        console.error('ensureLeaveTypesLoaded error', e);
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
        toastMessage.value = 'Bitte gültige Daten auswählen.';
        toastOpen.value = true;
        return;
    }

    // 📵 OFFLINE → lokal speichern, später syncen
    if (!navigator.onLine) {
        addLeaveRequest(from.value, to.value, type.value, reason.value);
        toastMessage.value =
            'Urlaubsantrag offline gespeichert (wird synchronisiert, sobald du online bist).';
        toastOpen.value = true;

        // Versuche trotzdem zu synchronisieren, falls die Verbindung gerade zurückkommt
        syncAll();

        // Formular leeren
        from.value = '';
        to.value = '';
        type.value = '';
        reason.value = '';

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

        toastMessage.value = 'Urlaubsantrag erfolgreich erstellt.';
        toastOpen.value = true;

        // Nur bei Erfolg Formular leeren
        from.value = '';
        to.value = '';
        type.value = '';
        reason.value = '';
    } catch (e: any) {
        console.error('Leave submit error', e);
        // ❗ fachlicher Fehler → NICHT lokal speichern
        toastMessage.value =
            e?.message || 'Fehler beim Erstellen des Urlaubsantrags.';
        toastOpen.value = true;
    } finally {
        submitting.value = false;
    }
}

// Logout
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

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('tta-sync-updated', onSyncUpdated as EventListener);
});

onBeforeUnmount(() => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('tta-sync-updated', onSyncUpdated as EventListener);
});
</script>