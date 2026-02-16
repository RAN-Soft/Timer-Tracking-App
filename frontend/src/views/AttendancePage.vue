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
} from "@ionic/vue";

import SyncStatusBar from "@/components/common/SyncStatusBar.vue";
import { logOutOutline } from "ionicons/icons";

import { useAttendancePage } from "./AttendancePage";

const {
    employees,
    loading,
    navigatorOnLine,
    toastOpen,
    toastMessage,
    userInitials,
    avatarColor,
    reload,
    isOnline,
    doLogout,
} = useAttendancePage();
</script>