const STORAGE_KEY = "placementConsistencyTracker_v1";

const defaultState = {
  settings: {
    communication: 1,
    aptitude: 1,
    resume: 1,
    coding: 2
  },
  records: {}
};

const areas = [
  { id: "communication", icon: "📖", name: "Communication", desc: "Reading, vocabulary, speaking and listening." },
  { id: "aptitude", icon: "🧠", name: "Aptitude", desc: "Quantitative, logical and verbal aptitude practice." },
  { id: "resume", icon: "📄", name: "Resume & Career", desc: "Resume, LinkedIn, projects and interview preparation." },
  { id: "coding", icon: "💻", name: "Coding", desc: "Programming, DSA, problem solving and projects." }
];

let state = loadState();
let selectedDate = localDateKey(new Date());
let calendarDate = new Date();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      settings: { ...defaultState.settings, ...(saved.settings || {}) },
      records: saved.records || {}
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function localDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(y, m - 1, d));
}

function getRecord(key) {
  if (!state.records[key]) {
    state.records[key] = {
      communication: { completed: false, hours: 0 },
      aptitude: { completed: false, hours: 0 },
      resume: { completed: false, hours: 0 },
      coding: { completed: false, hours: 0 }
    };
  }
  return state.records[key];
}

function completedCount(key) {
  const r = getRecord(key);
  return areas.filter(a => r[a.id]?.completed).length;
}

function hoursForRecord(key) {
  const r = getRecord(key);
  return areas.reduce((sum, a) => sum + (Number(r[a.id]?.hours) || 0), 0);
}

function progressPercent(key) {
  return Math.round((completedCount(key) / areas.length) * 100);
}

function renderToday() {
  const now = new Date();
  document.getElementById("todayLabel").textContent =
    now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  document.getElementById("selectedDate").value = selectedDate;
}

function renderTasks() {
  const grid = document.getElementById("taskGrid");
  const record = getRecord(selectedDate);

  grid.innerHTML = areas.map(a => {
    const item = record[a.id];
    const target = Number(state.settings[a.id]) || 0;
    const percentage = target ? Math.min(100, Math.round((Number(item.hours || 0) / target) * 100)) : 0;

    return `
      <article class="task-card card ${item.completed ? "completed-card" : ""}">
        <div class="task-top">
          <div>
            <div class="task-icon">${a.icon}</div>
            <h3>${a.name}</h3>
            <p>${a.desc}</p>
          </div>
          <div class="target">${target} hr${target === 1 ? "" : "s"}</div>
        </div>
        <div class="progress-track"><div class="progress-fill" style="width:${percentage}%"></div></div>
        <div class="task-controls">
          <input class="hours-input" type="number" min="0" max="24" step="0.25"
            value="${item.hours || 0}" data-hours="${a.id}" aria-label="${a.name} hours">
          <button class="complete-btn ${item.completed ? "completed" : ""}" data-complete="${a.id}">
            ${item.completed ? "✓ Completed" : "Mark completed"}
          </button>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll("[data-complete]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.complete;
      getRecord(selectedDate)[id].completed = !getRecord(selectedDate)[id].completed;
      saveState();
      renderAll();
    });
  });

  grid.querySelectorAll("[data-hours]").forEach(input => {
    input.addEventListener("change", () => {
      const id = input.dataset.hours;
      const value = Math.max(0, Math.min(24, Number(input.value) || 0));
      getRecord(selectedDate)[id].hours = value;
      if (value > 0 && value >= Number(state.settings[id])) {
        getRecord(selectedDate)[id].completed = true;
      }
      saveState();
      renderAll();
    });
  });

  const count = completedCount(selectedDate);
  document.getElementById("dayProgressText").textContent = `${count} / ${areas.length} areas completed`;
  document.getElementById("dayProgressHours").textContent = `${hoursForRecord(selectedDate).toFixed(2).replace(/\.00$/, "")} hours logged`;
  document.getElementById("dayProgressBar").style.width = `${progressPercent(selectedDate)}%`;
}

function allDateKeys() {
  return Object.keys(state.records).sort();
}

function calculateCurrentStreak() {
  let date = new Date();
  let streak = 0;
  const today = localDateKey(date);

  if (completedCount(today) < areas.length) {
    date.setDate(date.getDate() - 1);
  }

  while (completedCount(localDateKey(date)) === areas.length) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function calculateBestStreak() {
  const keys = allDateKeys();
  if (!keys.length) return 0;

  let best = 0, current = 0;
  const start = new Date(keys[0] + "T00:00:00");
  const end = new Date(keys[keys.length - 1] + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (completedCount(localDateKey(d)) === areas.length) current++;
    else current = 0;
    best = Math.max(best, current);
  }
  return best;
}

function productiveDays() {
  return allDateKeys().filter(k => completedCount(k) > 0).length;
}

function motivation() {
  const count = completedCount(selectedDate);
  const streak = calculateCurrentStreak();

  if (count === areas.length) {
    return {
      title: streak >= 7 ? `🏆 ${streak}-day streak! Keep the chain alive.` : "🔥 Today's plan is complete!",
      detail: "You showed up and finished your planned areas. Tomorrow, do it again."
    };
  }
  if (count === 3) return { title: "Almost there — finish one more area.", detail: "A small final push can turn today into a complete day." };
  if (count === 2) return { title: "You're halfway through today's plan.", detail: "Keep moving. Consistency is built one completed task at a time." };
  if (count === 1) return { title: "Good start. One area is already done.", detail: "Use the momentum and complete your next focus area." };
  return { title: "Start small. Stay consistent.", detail: "Pick one area and begin. You don't have to finish everything at once." };
}

function renderHero() {
  document.getElementById("streak").textContent = calculateCurrentStreak();
  document.getElementById("bestStreak").textContent = calculateBestStreak();
  document.getElementById("productiveDays").textContent = productiveDays();

  const m = motivation();
  document.getElementById("motivation").textContent = m.title;
  document.getElementById("motivationDetail").textContent = m.detail;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById("historyMonth").textContent =
    calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const grid = document.getElementById("calendarGrid");

  let html = "";
  for (let i = 0; i < firstDay; i++) html += `<div class="day empty"></div>`;

  const todayKey = localDateKey(new Date());

  for (let d = 1; d <= days; d++) {
    const key = localDateKey(new Date(year, month, d));
    const p = progressPercent(key);
    const cls = [
      "day",
      key === todayKey ? "today-cell" : "",
      p === 100 ? "complete-day" : ""
    ].join(" ");

    html += `
      <div class="${cls}" data-calendar-date="${key}" title="${formatDate(key)}">
        <div class="day-number">${d}</div>
        <div class="day-rate">${p}%</div>
        <div class="day-bar"><span style="width:${p}%"></span></div>
      </div>
    `;
  }

  grid.innerHTML = html;
  grid.querySelectorAll("[data-calendar-date]").forEach(cell => {
    cell.addEventListener("click", () => {
      selectedDate = cell.dataset.calendarDate;
      switchView("dashboard");
      renderAll();
    });
  });
}

function renderAnalytics() {
  const choice = document.getElementById("analyticsPeriod").value;
  const today = new Date();
  let start = null;

  if (choice !== "all") {
    start = new Date(today);
    start.setDate(start.getDate() - Number(choice) + 1);
  }

  const keys = allDateKeys().filter(k => !start || new Date(k + "T00:00:00") >= start);
  let totalHours = 0, totalTasks = 0;
  const areaCompleted = Object.fromEntries(areas.map(a => [a.id, 0]));

  keys.forEach(k => {
    totalHours += hoursForRecord(k);
    areas.forEach(a => {
      if (getRecord(k)[a.id]?.completed) {
        totalTasks++;
        areaCompleted[a.id]++;
      }
    });
  });

  const possible = keys.length * areas.length;
  const rate = possible ? Math.round((totalTasks / possible) * 100) : 0;

  document.getElementById("analyticsDays").textContent = keys.filter(k => completedCount(k) > 0).length;
  document.getElementById("analyticsHours").textContent = totalHours.toFixed(1);
  document.getElementById("analyticsTasks").textContent = totalTasks;
  document.getElementById("analyticsRate").textContent = `${rate}%`;

  document.getElementById("areaBars").innerHTML = areas.map(a => {
    const pct = keys.length ? Math.round((areaCompleted[a.id] / keys.length) * 100) : 0;
    return `
      <div class="area-row">
        <div class="area-header"><span>${a.icon} ${a.name}</span><span>${pct}%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderSettings() {
  document.getElementById("settingsTasks").innerHTML = areas.map(a => `
    <div class="setting-row">
      <div><strong>${a.icon} ${a.name}</strong><small>Daily target in hours</small></div>
      <input type="number" min="0.25" max="24" step="0.25" value="${state.settings[a.id]}" data-setting="${a.id}">
    </div>
  `).join("");
}

function switchView(view) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `${view}View`));
  if (view === "history") renderCalendar();
  if (view === "analytics") renderAnalytics();
  if (view === "settings") renderSettings();
}

function renderAll() {
  renderToday();
  renderTasks();
  renderHero();
  renderCalendar();
  renderAnalytics();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => switchView(tab.dataset.view));
});

document.getElementById("selectedDate").addEventListener("change", e => {
  selectedDate = e.target.value;
  renderAll();
});

document.getElementById("prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById("analyticsPeriod").addEventListener("change", renderAnalytics);

document.getElementById("saveSettings").addEventListener("click", () => {
  document.querySelectorAll("[data-setting]").forEach(input => {
    state.settings[input.dataset.setting] = Math.max(0.25, Math.min(24, Number(input.value) || 1));
  });
  saveState();
  renderAll();
  showToast("Daily targets saved.");
});

document.getElementById("exportData").addEventListener("click", () => {
  const backup = {
    app: "Placement Consistency Tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...state
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `placement-tracker-backup-${localDateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup exported.");
});

document.getElementById("importData").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!imported.records || !imported.settings) throw new Error("Invalid backup");
    state = {
      settings: { ...defaultState.settings, ...imported.settings },
      records: imported.records
    };
    saveState();
    renderAll();
    showToast("Backup imported.");
  } catch {
    showToast("That backup file is not valid.");
  }
  e.target.value = "";
});

document.getElementById("resetData").addEventListener("click", () => {
  if (!confirm("Delete all your saved progress from this browser? This cannot be undone unless you have a backup.")) return;
  state = structuredClone(defaultState);
  saveState();
  renderAll();
  showToast("All local progress was reset.");
});

renderAll();
