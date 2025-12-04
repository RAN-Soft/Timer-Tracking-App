<template>
    <div class="tt-view">
        <h2 class="tt-title">Urlaub beantragen</h2>

        <section class="tt-card">
            <label class="tt-field">
                <span>Urlaubsart</span>
                <select v-model="selectedLeaveType">
                    <option value="">– Urlaubsart auswählen –</option>
                    <option v-for="lt in leaveTypes" :key="lt.name" :value="lt.name">
                        {{ lt.name }}
                    </option>
                </select>
            </label>

            <div class="tt-field-row">
                <label class="tt-field">
                    <span>Von</span>
                    <input v-model="leaveFrom" type="date" />
                </label>
                <label class="tt-field">
                    <span>Bis</span>
                    <input v-model="leaveTo" type="date" />
                </label>
            </div>

            <label class="tt-field">
                <span>Begründung (optional)</span>
                <textarea v-model="leaveReason" rows="3" placeholder="z.B. Sommerurlaub, Familienfeier..."></textarea>
            </label>

            <button class="tt-btn tt-btn-primary tt-btn-full" :disabled="leaveLoading" @click="submitLeave">
                Urlaub beantragen
            </button>

            <p class="tt-status" v-if="leaveStatus">
                {{ leaveStatus }}
            </p>
        </section>
    </div>
</template>
  
<script setup>
import { ref, onMounted } from "vue";

const leaveTypes = ref([]);
const selectedLeaveType = ref("");
const leaveFrom = ref("");
const leaveTo = ref("");
const leaveReason = ref("");
const leaveStatus = ref("");
const leaveLoading = ref(false);

function loadLeaveTypes() {
    window.frappe.call({
        method: "time_tracking_app.api.time_tracking.get_leave_types",
        args: {},
        callback(r) {
            leaveTypes.value = r.message || [];
        },
    });
}

async function submitLeave() {
    leaveStatus.value = "";
    if (!selectedLeaveType.value || !leaveFrom.value || !leaveTo.value) {
        leaveStatus.value = "Bitte Urlaubsart und Zeitraum auswählen.";
        return;
    }

    try {
        leaveLoading.value = true;
        const r = await window.frappe.call({
            method: "time_tracking_app.api.time_tracking.create_leave_application",
            args: {
                from_date: leaveFrom.value,
                to_date: leaveTo.value,
                leave_type: selectedLeaveType.value,
                reason: leaveReason.value || "",
            },
        });
        const name = r.message;
        leaveStatus.value = `Urlaubsantrag ${name} wurde erstellt.`;
        leaveReason.value = "";
    } catch (e) {
        console.error(e);
        leaveStatus.value =
            e.message || "Fehler beim Erstellen des Urlaubsantrags.";
    } finally {
        leaveLoading.value = false;
    }
}

onMounted(() => {
    loadLeaveTypes();
});
</script>
  