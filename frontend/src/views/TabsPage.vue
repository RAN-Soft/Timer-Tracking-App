<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet></ion-router-outlet>

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="time" href="/tabs/time">
          <ion-icon :icon="timeOutline" />
          <ion-label>Time</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="leave" href="/tabs/leave">
          <ion-icon :icon="calendarOutline" />
          <ion-label>Urlaub</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="attendance" href="/tabs/attendance">
          <ion-icon :icon="peopleOutline" />
          <ion-label>Anwesenheit</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonTabs,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/vue';

import { timeOutline, calendarOutline, peopleOutline } from 'ionicons/icons';
</script>
  
<style scoped>
ion-tab-bar {
  --background: var(--ion-color-light, #f7f7f7);
}
</style>
  