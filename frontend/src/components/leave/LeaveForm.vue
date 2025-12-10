<template>
    <ion-card>
        <ion-card-header>
            <ion-card-title>Urlaub beantragen</ion-card-title>
        </ion-card-header>
        <ion-card-content>
            <ion-item>
                <ion-label position="stacked">Von</ion-label>
                <ion-datetime presentation="date" v-model="from" />
            </ion-item>

            <ion-item>
                <ion-label position="stacked">Bis</ion-label>
                <ion-datetime presentation="date" v-model="to" />
            </ion-item>

            <ion-item>
                <ion-label position="stacked">Urlaubstyp</ion-label>
                <ion-select v-model="type">
                    <ion-select-option value="Erholungsurlaub">Erholungsurlaub</ion-select-option>
                    <ion-select-option value="Zeitausgleich">Zeitausgleich</ion-select-option>
                </ion-select>
            </ion-item>

            <ion-item>
                <ion-label position="stacked">Kommentar</ion-label>
                <ion-textarea v-model="reason" auto-grow />
            </ion-item>

            <ion-button expand="block" class="ion-margin-top" :disabled="!from || !to || !type" @click="onSubmit">
                Absenden
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
    IonDatetime,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
} from '@ionic/vue';
import { ref } from 'vue';

const emit = defineEmits<{
    (e: 'submit', payload: { from: string; to: string; type: string; reason: string }): void;
}>();

const from = ref<string>('');
const to = ref<string>('');
const type = ref<string>('');
const reason = ref<string>('');

function onSubmit() {
    emit('submit', {
        from: from.value,
        to: to.value,
        type: type.value,
        reason: reason.value,
    });

    from.value = '';
    to.value = '';
    type.value = '';
    reason.value = '';
}
</script>