<template>
  <ion-app>
    <ion-router-outlet id="main-content" />
    <InstallPrompt />
    <!-- Optional: globale Toasts/Install-Popup -->
    <!-- <Toasts /> /> -->
  </ion-app>
</template>
  
<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import InstallPrompt from '@/components/common/InstallPrompt.vue';
// Optional: Frappe UI Toasts & InstallPrompt wie in HRMS
// import { Toasts } from 'frappe-ui';
</script>