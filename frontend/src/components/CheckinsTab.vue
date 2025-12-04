<template>
    <div class="tt-view">
        <h2 class="tt-title">Heutige Check-ins</h2>

        <section class="tt-card">
            <div class="tt-card-header">
                <span>Heute</span>
                <button class="tt-link-btn" @click="onRefresh && onRefresh()">
                    Aktualisieren
                </button>
            </div>

            <ul v-if="todayCheckins && todayCheckins.length" class="tt-list">
                <li v-for="c in todayCheckins" :key="c.name" class="tt-list-item">
                    <div class="tt-list-main">
                        <span class="tt-list-type">
                            {{ c.log_type === "IN" ? "Kommen" : "Gehen" }}
                        </span>
                        <span class="tt-list-time">
                            {{ formatTime(c.time) }}
                        </span>
                    </div>
                </li>
            </ul>
            <p v-else class="tt-empty">
                Heute wurden noch keine Check-ins gefunden.
            </p>
        </section>
    </div>
</template>
  
<script setup>
const props = defineProps({
    todayCheckins: {
        type: Array,
        default: () => [],
    },
    onRefresh: {
        type: Function,
        default: null,
    },
});

function formatTime(dt) {
    try {
        const d = new Date(dt);
        const h = String(d.getHours()).padStart(2, "0");
        const m = String(d.getMinutes()).padStart(2, "0");
        return `${h}:${m} Uhr`;
    } catch {
        return dt;
    }
}
</script>
  