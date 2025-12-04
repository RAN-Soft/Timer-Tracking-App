<template>
    <div class="tt-view">
      <h2 class="tt-title">Stempeln (Test)</h2>
  
      <div class="tt-card">
        <p>Hier sollte der Inhalt der Stempel-Seite stehen.</p>
        <button class="tt-btn tt-btn-primary" @click="onClick">
          Test-Klick
        </button>
        <p class="tt-status">{{ status }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from "vue"
  
  const props = defineProps({
    onAfterPunch: {
      type: Function,
      required: false,
    },
  })
  
  const status = ref("Bereit (Test).")
  
  function onClick() {
    status.value = "Button geklickt."
    if (props.onAfterPunch) {
      props.onAfterPunch()
    }
  }
  </script>
  