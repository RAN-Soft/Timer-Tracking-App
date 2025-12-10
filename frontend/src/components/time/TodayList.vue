<template>
    <ion-list v-if="entries.length">
        <ion-item v-for="e in entries" :key="e.id">
            <ion-label>
                <h2>{{ projectName(e.projectId) }} – {{ activityName(e.activityId) }}</h2>
                <p>{{ formatTime(e.start) }} – {{ e.end ? formatTime(e.end) : 'läuft…' }}</p>
            </ion-label>
        </ion-item>
    </ion-list>
    <ion-text v-else class="ion-padding">
        Keine Stempelungen heute.
    </ion-text>
</template>
  
<script setup lang="ts">
import { IonList, IonItem, IonLabel, IonText } from '@ionic/vue';
import type { TimeEntry, Project, Activity } from '@/services/offlineStore';

const props = defineProps<{
    entries: TimeEntry[];
    projects: Project[];
    activities: Activity[];
}>();

function projectName(id: string) {
    return props.projects.find(p => p.id === id)?.name || id;
}

function activityName(id: string) {
    return props.activities.find(a => a.id === id)?.name || id;
}

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
</script>