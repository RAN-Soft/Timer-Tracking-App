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
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonDatetime, IonSelect, IonSelectOption,
    IonTextarea, IonButton, IonToast, IonButtons, IonAvatar,
    IonIcon, IonPopover, IonList,
} from "@ionic/vue";

import SyncStatusBar from "@/components/common/SyncStatusBar.vue";
import { logOutOutline } from "ionicons/icons";

import { useLeavePage } from "./LeavePage";

const {
    from,
    to,
    type,
    reason,
    toastOpen,
    toastMessage,
    submitting,
    leaveTypes,
    loadingLeaveTypes,
    navigatorOnLine,
    canSubmit,
    userInitials,
    avatarColor,
    submit,
    doLogout,
} = useLeavePage();
</script>