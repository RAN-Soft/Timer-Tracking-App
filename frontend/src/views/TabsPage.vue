<template>
    <ion-page>
      <ion-tabs>
        <!-- Hier rendert TimePage / LeavePage -->
        <ion-router-outlet></ion-router-outlet>
  
        <ion-tab-bar slot="bottom">
          <!-- Zeit-Tab -->
          <ion-tab-button
            tab="time"
            href="/tabs/time"
          >
            <ion-icon :icon="timeOutline" />
            <ion-label>Zeit</ion-label>
          </ion-tab-button>
  
          <!-- Urlaub-Tab -->
          <ion-tab-button
            tab="leave"
            href="/tabs/leave"
          >
            <ion-icon :icon="calendarOutline" />
            <ion-label>Urlaub</ion-label>
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
  import { timeOutline, calendarOutline } from 'ionicons/icons';
  </script>
  
  <style scoped>
  ion-tab-bar {
    --background: var(--ion-color-light, #f7f7f7);
  }
  </style>
  