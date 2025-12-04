<template>
    <!-- Install-PWA Dialog (Android / Desktop) -->
    <div v-if="showDialog" class="tt-install-backdrop">
        <div class="tt-install-dialog">
            <h2 class="tt-install-title">Time Tracking installieren</h2>
            <p class="tt-install-text">
                Füge die App zu deinem Startbildschirm hinzu, um schneller darauf
                zugreifen zu können und eine bessere Nutzererfahrung zu haben.
            </p>
            <button class="tt-btn tt-btn-primary tt-btn-full" @click="install">
                Installieren
            </button>
            <button class="tt-link-btn tt-install-cancel" @click="showDialog = false">
                Später
            </button>
        </div>
    </div>

    <!-- iOS Install Hinweis -->
    <div v-if="iosInstallMessage" class="tt-ios-install-banner">
        <div class="tt-ios-install-content">
            <div class="tt-ios-install-header">
                <span class="tt-ios-install-title">Time Tracking installieren</span>
                <button class="tt-ios-install-close" @click="iosInstallMessage = false">
                    ✕
                </button>
            </div>
            <div class="tt-ios-install-body">
                <span class="tt-ios-install-text">
                    Füge die App auf deinem iPhone zum Home-Bildschirm hinzu:
                </span>
                <span class="tt-ios-install-step">
                    Tippe auf <span class="tt-ios-install-icon">📤</span> und wähle
                    <strong>„Zum Home-Bildschirm“</strong>.
                </span>
            </div>
        </div>
    </div>
</template>
  
<script setup>
import { ref, onMounted } from "vue";

const deferredPrompt = ref(null);
const showDialog = ref(false);
const iosInstallMessage = ref(false);

const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

const isInStandaloneMode = () =>
    "standalone" in window.navigator && window.navigator.standalone;

onMounted(() => {
    if (isIos() && !isInStandaloneMode()) {
        iosInstallMessage.value = true;
    }

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt.value = e;

        if (isIos() && !isInStandaloneMode()) {
            iosInstallMessage.value = true;
        } else {
            showDialog.value = true;
        }

        console.log("'beforeinstallprompt' event was fired.");
    });

    window.addEventListener("appinstalled", () => {
        showDialog.value = false;
        deferredPrompt.value = null;
        iosInstallMessage.value = false;
        console.log("PWA wurde installiert.");
    });
});

async function install() {
    if (!deferredPrompt.value) {
        showDialog.value = false;
        return;
    }
    deferredPrompt.value.prompt();
    showDialog.value = false;
}
</script>
  