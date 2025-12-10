<template>
    <ion-card>
        <ion-card-header>
            <ion-card-title>Stempeln</ion-card-title>
        </ion-card-header>
        <ion-card-content>
            <ion-item>
                <ion-label>Projekt</ion-label>
                <ion-select v-model="selectedProjectId" interface="popover">
                    <ion-select-option v-for="p in projects" :key="p.id" :value="p.id">
                        {{ p.name }}
                    </ion-select-option>
                </ion-select>
            </ion-item>

            <ion-item>
                <ion-label>Aktivität</ion-label>
                <ion-select v-model="selectedActivityId" interface="popover">
                    <ion-select-option v-for="a in activities" :key="a.id" :value="a.id">
                        {{ a.name }}
                    </ion-select-option>
                </ion-select>
            </ion-item>

            <ion-button expand="block" class="ion-margin-top" :disabled="!selectedProjectId || !selectedActivityId"
                @click="onPunch">
                Stempeln
            </ion-button>
        </ion-card-content>
    </ion-card>
</template>
  
<script setup lang="ts">
import {
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
} from '@ionic/vue';
import type { Project, Activity } from '@/services/offlineStore';
import { ref, watchEffect } from 'vue';

const props = defineProps<{
    projects: Project[];
    activities: Activity[];
}>();

const emit = defineEmits<{
    (e: 'punch', payload: { projectId: string; activityId: string }): void;
}>();

const selectedProjectId = ref<string | null>(null);
const selectedActivityId = ref<string | null>(null);

watchEffect(() => {
    if (!selectedProjectId.value && props.projects.length) {
        selectedProjectId.value = props.projects[0].id;
    }
    if (!selectedActivityId.value && props.activities.length) {
        selectedActivityId.value = props.activities[0].id;
    }
});

function onPunch() {
    if (!selectedProjectId.value || !selectedActivityId.value) return;
    emit('punch', {
        projectId: selectedProjectId.value,
        activityId: selectedActivityId.value,
    });
}
</script>