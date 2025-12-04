<template>
  <div class="tt-shell">
    <section class="tt-main">
      <!-- TAB 1: STEMPELN -->
      <div v-if="activeTab === 'punch'" class="tt-view">
        <h2 class="tt-title">Stempeln</h2>

        <section class="tt-card">
          <label class="tt-field">
            <span>Projekt</span>
            <select v-model="selectedProject">
              <option value="">– Projekt auswählen (optional) –</option>
              <option
                v-for="p in projects"
                :key="p.name"
                :value="p.name"
              >
                {{ p.project_name || p.name }}
              </option>
            </select>
          </label>

          <label class="tt-field">
            <span>Tätigkeit / Aktivität</span>
            <select v-model="selectedActivity">
              <option value="">– Tätigkeit / Aktivität auswählen –</option>
              <option
                v-for="a in activities"
                :key="a.name"
                :value="a.name"
              >
                {{ a.name }}
              </option>
            </select>
          </label>

          <div class="tt-button-row">
            <button
              class="tt-btn tt-btn-primary"
              :disabled="loading"
              @click="handlePunchIn"
            >
              Kommen
            </button>
            <button
              class="tt-btn tt-btn-danger"
              :disabled="loading"
              @click="handlePunchOut"
            >
              Gehen
            </button>
          </div>

          <p class="tt-status">
            {{ status }}
          </p>
        </section>
      </div>

      <!-- TAB 2: HEUTIGE CHECK-INS -->
      <div v-else-if="activeTab === 'checkins'" class="tt-view">
        <h2 class="tt-title">Heutige Check-ins</h2>

        <section class="tt-card">
          <div class="tt-card-header">
            <span>Heute</span>
            <button class="tt-link-btn" @click="loadTodayCheckins">
              Aktualisieren
            </button>
          </div>

          <ul v-if="todayCheckins.length" class="tt-list">
            <li
              v-for="c in todayCheckins"
              :key="c.name"
              class="tt-list-item"
            >
              <div class="tt-list-main">
                <span class="tt-list-type">
                  {{ c.log_type === 'IN' ? 'Kommen' : 'Gehen' }}
                </span>
                <span class="tt-list-time">
                  {{ formatTime(c.time) }}
                </span>
              </div>
            </li>
          </ul>
          <p v-else class="tt-empty">Heute wurden noch keine Check-ins gefunden.</p>
        </section>
      </div>

      <!-- TAB 3: URLAUB -->
      <div v-else-if="activeTab === 'leave'" class="tt-view">
        <h2 class="tt-title">Urlaub beantragen</h2>

        <section class="tt-card">
          <label class="tt-field">
            <span>Urlaubsart</span>
            <select v-model="selectedLeaveType">
              <option value="">– Urlaubsart auswählen –</option>
              <option
                v-for="lt in leaveTypes"
                :key="lt.name"
                :value="lt.name"
              >
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
            <textarea
              v-model="leaveReason"
              rows="3"
              placeholder="z.B. Sommerurlaub, Familienfeier..."
            ></textarea>
          </label>

          <button
            class="tt-btn tt-btn-primary tt-btn-full"
            :disabled="leaveLoading"
            @click="submitLeave"
          >
            Urlaub beantragen
          </button>

          <p class="tt-status" v-if="leaveStatus">
            {{ leaveStatus }}
          </p>
        </section>
      </div>
    </section>

    <!-- BOTTOM NAV -->
    <nav class="tt-tabbar">
      <button
        class="tt-tab"
        :class="{ active: activeTab === 'punch' }"
        @click="activeTab = 'punch'"
      >
        <span class="tt-tab-label">Stempeln</span>
      </button>
      <button
        class="tt-tab"
        :class="{ active: activeTab === 'checkins' }"
        @click="activeTab = 'checkins'"
      >
        <span class="tt-tab-label">Check-ins</span>
      </button>
      <button
        class="tt-tab"
        :class="{ active: activeTab === 'leave' }"
        @click="activeTab = 'leave'"
      >
        <span class="tt-tab-label">Urlaub</span>
      </button>
    </nav>

    <!-- Install-Prompt -->
    <InstallPrompt />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import InstallPrompt from "./components/InstallPrompt.vue"

const status = ref("Bereit.");
const loading = ref(false);
const projects = ref([]);
const activities = ref([]);
const selectedProject = ref("");
const selectedActivity = ref("");

const activeTab = ref("punch");

// Check-ins
const todayCheckins = ref([]);

// Urlaub
const leaveTypes = ref([]);
const selectedLeaveType = ref("");
const leaveFrom = ref("");
const leaveTo = ref("");
const leaveReason = ref("");
const leaveStatus = ref("");
const leaveLoading = ref(false);

function setStatus(msg) {
  status.value = msg;
}

function disableLoading(isLoading) {
  loading.value = isLoading;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Dieses Gerät unterstützt keine Geolocation."));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = "GPS-Position konnte nicht ermittelt werden.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "GPS-Berechtigung verweigert. Ohne GPS kein Stempeln möglich.";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

async function handlePunchIn() {
  try {
    disableLoading(true);
    setStatus("Hole GPS-Position für EIN-Stempel ...");

    const position = await getCurrentPosition();
    await window.frappe.call({
      method: "time_tracking_app.api.punch.punch_in",
      args: {
        project: selectedProject.value || null,
        activity_type: selectedActivity.value || null,
        latitude: position.lat,
        longitude: position.lng,
        accuracy: position.accuracy,
      },
    });
    setStatus("Eingestempelt.");
    // nach Stempeln Check-ins aktualisieren
    loadTodayCheckins();
  } catch (e) {
    console.error(e);
    setStatus(e.message || "Fehler beim Stempeln (IN).");
  } finally {
    disableLoading(false);
  }
}

async function handlePunchOut() {
  try {
    disableLoading(true);
    setStatus("Hole GPS-Position für AUS-Stempel ...");

    const position = await getCurrentPosition();
    await window.frappe.call({
      method: "time_tracking_app.api.punch.punch_out",
      args: {
        latitude: position.lat,
        longitude: position.lng,
        accuracy: position.accuracy,
      },
    });
    setStatus("Ausgestempelt.");
    loadTodayCheckins();
  } catch (e) {
    console.error(e);
    setStatus(e.message || "Fehler beim Stempeln (OUT).");
  } finally {
    disableLoading(false);
  }
}

function loadProjects() {
  window.frappe.call({
    method: "time_tracking_app.api.time_tracking.get_projects",
    args: {},
    callback(r) {
      projects.value = r.message || [];
    },
  });
}

function loadActivityTypes() {
  window.frappe.call({
    method: "time_tracking_app.api.time_tracking.get_activity_types",
    args: {},
    callback(r) {
      activities.value = r.message || [];
    },
  });
}

function loadTodayCheckins() {
  window.frappe.call({
    method: "time_tracking_app.api.time_tracking.get_today_checkins",
    args: {},
    callback(r) {
      todayCheckins.value = r.message || [];
    },
  });
}

function loadLeaveTypes() {
  window.frappe.call({
    method: "time_tracking_app.api.time_tracking.get_leave_types",
    args: {},
    callback(r) {
      leaveTypes.value = r.message || [];
    },
  });
}

function formatTime(dt) {
  // dt ist z.B. "2025-12-03 10:15:00"
  try {
    const d = new Date(dt);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m} Uhr`;
  } catch {
    return dt;
  }
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
    // Formular zurücksetzen
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
  loadProjects();
  loadActivityTypes();
  loadTodayCheckins();
  loadLeaveTypes();
});
</script>

<style>
.tt-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
}

.tt-main {
  flex: 1;
  padding: 0.75rem 0.75rem 4.5rem; /* Platz für Tabbar unten */
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.tt-view {
  width: 100%;
  max-width: 480px;
}

.tt-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.tt-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 1rem 1rem 1.1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
}

.tt-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
  text-align: left;
}

.tt-field span {
  font-size: 0.85rem;
  font-weight: 500;
  color: #555;
}

.tt-field select,
.tt-field input,
.tt-field textarea {
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  padding: 0.45rem 0.6rem;
  font-size: 0.95rem;
  width: 100%;
  box-sizing: border-box;
}

.tt-field-row {
  display: flex;
  gap: 0.75rem;
}

.tt-field-row .tt-field {
  flex: 1;
}

.tt-button-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.tt-btn {
  flex: 1;
  border-radius: 999px;
  border: none;
  padding: 0.6rem 0.8rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
}

.tt-btn-primary {
  background: #1f4f7b;
  color: #fff;
}

.tt-btn-danger {
  background: #e55353;
  color: #fff;
}

.tt-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tt-btn-full {
  width: 100%;
  margin-top: 0.5rem;
}

.tt-status {
  margin-top: 0.7rem;
  font-size: 0.85rem;
  color: #555;
}

.tt-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.tt-link-btn {
  background: none;
  border: none;
  padding: 0;
  color: #1f4f7b;
  cursor: pointer;
  font-size: 0.85rem;
  text-decoration: underline;
}

.tt-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tt-list-item {
  padding: 0.4rem 0;
  border-bottom: 1px solid #edf0f6;
}

.tt-list-main {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
}

.tt-list-type {
  font-weight: 500;
}

.tt-list-time {
  color: #555;
}

.tt-empty {
  font-size: 0.85rem;
  color: #777;
}

.tt-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3.5rem;
  background: #ffffff;
  border-top: 1px solid #dde2ee;
  display: flex;
  justify-content: space-around;
  align-items: stretch;
  z-index: 50;
}

.tt-tab {
  flex: 1;
  border: none;
  background: none;
  padding: 0.3rem 0.2rem 0.2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: 0.75rem;
  color: #6b7280;
  cursor: pointer;
}

.tt-tab.active {
  color: #1f4f7b;
  font-weight: 600;
}

.tt-tab-label {
  margin-top: 0.1rem;
}
</style>
