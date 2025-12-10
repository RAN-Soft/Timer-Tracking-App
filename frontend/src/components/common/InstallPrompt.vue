<template>
    <ion-toast :is-open="showPrompt" message="App installieren?" :buttons="[
        { text: 'Später', role: 'cancel', handler: dismiss },
        { text: 'Installieren', role: 'confirm', handler: install }
    ]" :duration="0" @didDismiss="showPrompt = false" />
</template>
  
<script setup lang="ts">
import { IonToast } from '@ionic/vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';

const showPrompt = ref(false);
let deferredPrompt: any = null;

function onBeforeInstallPrompt(e: any) {
    e.preventDefault();
    deferredPrompt = e;
    showPrompt.value = true;
}

async function install() {
    if (!deferredPrompt) {
        showPrompt.value = false;
        return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    showPrompt.value = false;

    if (outcome === 'accepted') {
        // optional: console.log('App installation accepted');
    }
}

function dismiss() {
    showPrompt.value = false;
}

onMounted(() => {
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
});
</script>
  