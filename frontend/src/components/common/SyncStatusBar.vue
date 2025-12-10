<template>
    <div class="sync-status">
        <ion-chip :color="online ? 'success' : 'warning'">
            <ion-label>
                {{ online ? 'Online' : 'Offline' }}
            </ion-label>
        </ion-chip>

        <ion-chip v-if="pendingCount > 0" color="medium">
            <ion-label>
                {{ pendingCount }} Einträge zum Synchronisieren
            </ion-label>
        </ion-chip>

        <ion-chip v-else color="light">
            <ion-label>Alles synchron</ion-label>
        </ion-chip>
    </div>
</template>
  
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { IonChip, IonLabel } from '@ionic/vue';
import {
    getPendingTimeEntries,
    getPendingLeaveRequests,
} from '@/services/offlineStore';

const online = ref<boolean>(navigator.onLine);
const pendingVersion = ref(0); // bumpen, wenn sich was ändert

const pendingCount = computed(() => {
    // neu laden, wenn pendingVersion sich ändert
    pendingVersion.value;
    const time = getPendingTimeEntries().length;
    const leave = getPendingLeaveRequests().length;
    return time + leave;
});

function refreshPending() {
    pendingVersion.value++;
}

function onOnline() {
    online.value = true;
}

function onOffline() {
    online.value = false;
}

function onSyncUpdated() {
    refreshPending();
}

onMounted(() => {
    refreshPending();
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
  
<style scoped>
.sync-status {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
}
</style>
  