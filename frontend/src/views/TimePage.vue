<template>
    <ion-page>
        <ion-header>
            <ion-toolbar color="primary">
                <ion-title>Time Tracking</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">
            <SyncStatusBar />

            <ion-card>
                <ion-card-header>
                    <ion-card-title>Stempeln</ion-card-title>
                </ion-card-header>

                <ion-card-content>
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

                    <ion-item lines="none" v-if="geoRequired">
                        <ion-label color="medium">
                            GPS ist für das Stempeln erforderlich (Geo-Tracking in HRMS aktiv).
                        </ion-label>
                    </ion-item>

                    <ion-button expand="block" class="ion-margin-top"
                        :disabled="!selectedProject || !selectedActivity || waitingForLocation" @click="onPunchClick">
                        <span v-if="waitingForLocation">Warte auf Standort…</span>
                        <span v-else>{{ activeEntry ? 'Stopp' : 'Start' }}</span>
                    </ion-button>

                    <ion-button expand="block" color="medium" class="ion-margin-top" @click="syncNow">
                        Jetzt synchronisieren
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
                                    – {{ entryActivity(e.activityId)?.name }}
                                </h2>
                                <p>
                                    {{ formatTime(e.start) }} -
                                    {{ e.end ? formatTime(e.end) : 'läuft…' }}
                                </p>
                                <p>
                                    IN: {{ e.checkinSynced ? '✔' : '✖' }} |
                                    OUT: {{ e.checkoutSynced ? '✔' : '✖' }} |
                                    TS: {{ e.timesheetSynced ? '✔' : '✖' }}
                                </p>
                            </ion-label>
                        </ion-item>
                    </ion-list>
                </ion-card-content>
            </ion-card>

            <ion-toast :is-open="toastOpen" :message="toastMessage" :duration="3000" @didDismiss="toastOpen = false" />
        </ion-content>
    </ion-page>
</template>
  
<script setup lang="ts">
import {
    IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonItem, IonLabel, IonSelect, IonSelectOption,
    IonButton, IonList, IonToast,
} from '@ionic/vue';

import SyncStatusBar from '@/components/common/SyncStatusBar.vue';
import { useTimePage } from './TimePage';

const {
    projects,
    activities,
    selectedProject,
    selectedActivity,
    geoRequired,
    waitingForLocation,
    todaysEntries,
    activeEntry,
    toastOpen,
    toastMessage,
    formatTime,
    entryProject,
    entryActivity,
    onPunchClick,
    syncNow,
} = useTimePage();
</script>