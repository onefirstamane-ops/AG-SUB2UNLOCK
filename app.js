
"use strict";

/* =========================================
   AG SUB2UNLOCK — LIVE FRONTEND
   Backend: Render
   Progress: resets on page refresh
========================================= */

const API_BASE = "https://ag-sub2unlock.onrender.com";
const SITE_URL = "https://onefirstamane-ops.github.io/AG-SUB2UNLOCK/";
const WAIT_SECONDS = 5;

const state = {
  tasks: [],
  completed: new Set(),
  opened: new Map(),
  timers: new Map(),
  loading: false
};

const $ = (selector) => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function validTaskURL(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function showMessage(message, type = "info") {
  let box = $("#ag-status-message");

  if (!box) {
    box = document.createElement("div");
    box.id = "ag-status-message";
    box.setAttribute("role", "status");
    box.style.cssText = [
      "padding:12px",
      "margin:12px 0",
      "border:1px solid #00d9ff",
      "border-radius:10px",
      "color:#fff",
      "background:#101522",
      "font-size:14px"
    ].join(";");

    const main = $("#task-list") || $("#tasks") ||
      document.querySelector("main") ||
      document.body;

    main.parentNode.insertBefore(box, main);
  }

  box.textContent = message;
  box.style.borderColor = type === "error" ? "#ff5470" : "#00d9ff";
}

function getTaskContainer() {
  return $("#task-list") ||
    $("#tasks") ||
    $("#task-container") ||
    $(".task-list") ||
    document.querySelector("main");
}

function getProgressElements() {
  return {
    text: $("#progress-text") ||
      $("#progress-count") ||
      $("#progress-label"),
    bar: $("#progress-bar") ||
      $("#progress-fill") ||
      $(".progress-fill"),
    unlock: $("#unlock-panel") ||
      $("#unlock-section")
  };
}

function updateProgress() {
  const total = state.tasks.length;
  const done = state.completed.size;
  const percent = total ? Math.round(done / total * 100) : 0;
  const elements = getProgressElements();

  if (elements.text) {
    elements.text.textContent = `${done}/${total} Completed (${percent}%)`;
  }

  if (elements.bar) {
    elements.bar.style.width = `${percent}%`;
    elements.bar.setAttribute("aria-valuenow", String(percent));
  }

  if (elements.unlock) {
    elements.unlock.hidden = !(total > 0 && done === total);
  }

  const unlockText = $("#unlock-text");
  if (unlockText) {
    unlockText.textContent =
      total > 0 && done === total
        ? "All tasks marked complete. Completion has not been independently verified."
        : `Complete all ${total} tasks to continue.`;
  }
}

function renderTasks() {
  const container = getTaskContainer();

  if (!container) {
    showMessage(
      "Task container পাওয়া যায়নি। index.html-এ #task-list বা #tasks ID যোগ করো।",
      "error"
    );
    return;
  }

  if (!state.tasks.length) {
    container.innerHTML = "<p>No tasks available.</p>";
    updateProgress();
    return;
  }

  container.innerHTML = state.tasks.map((task) => {
    const id = Number(task.id);
    const done = state.completed.has(id);
    const opened = state.opened.has(id);
    const ready = state.opened.get(id) === true;

    const actionText = done
      ? "Completed"
      : ready
        ? "I Completed This"
        : opened
          ? "Please wait 5 seconds..."
          : "Open Task";

    return `
      <article class="task-card" data-task-id="${id}"
        style="padding:16px;margin:12px 0;border:1px solid #26344d;border-radius:14px;background:#0b1020;color:#fff">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:start">
          <div>
            <h3 style="margin:0 0 8px">${escapeHTML(task.title)}</h3>
            <small style="color:#9aa9c4">
              ${task.kind === "daily" ? "Daily Task" : "Permanent Task"}
            </small>
          </div>
          <span style="color:${done ? "#35e6a0" : "#00d9ff"}">
            ${done ? "Completed" : "Pending"}
          </span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
          <button type="button" class="ag-open-task"
            data-id="${id}" ${done || opened ? "disabled" : ""}
            style="padding:11px 15px;border:0;border-radius:9px;background:#172640;color:#fff">
            ${opened ? "Task Opened" : "Open Task"}
          </button>
          <button type="button" class="ag-complete-task"
            data-id="${id}" ${done || !ready ? "disabled" : ""}
            style="padding:11px 15px;border:0;border-radius:9px;background:${done ? "#24513e" : "#005b91"};color:#fff">
            ${actionText}
          </button>
        </div>
        ${done
          ? '<p style="color:#35e6a0;margin-bottom:0">You marked this task complete.</p>'
          : opened && !ready
            ? `<p class="ag-wait" data-wait-id="${id}" style="color:#00d9ff;margin-bottom:0">Wait ${WAIT_SECONDS} seconds...</p>`
            : ""}
      </article>
    `;
  }).join("");

  updateProgress();
}

async function loadTasks() {
  if (state.loading) return;
  state.loading = true;

  const container = getTaskContainer();
  if (container) container.innerHTML = "<p>Loading tasks...</p>";

  try {
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok || !Array.isArray(data.tasks)) {
      throw new Error("Unexpected API response");
    }

    state.tasks = data.tasks.filter((task) =>
      Number.isInteger(Number(task.id)) &&
      typeof task.title === "string" &&
      validTaskURL(task.url)
    ).map((task) => ({
      id: Number(task.id),
      title: task.title,
      kind: task.kind === "daily" ? "daily" : "permanent",
      url: task.url
    }));

    state.completed.clear();
    state.opened.clear();

    renderTasks();

    if (state.tasks.length === 0) {
      showMessage("Backend থেকে কোনো বৈধ task পাওয়া যায়নি.", "error");
    }
  } catch (error) {
    console.error("AG SUB2UNLOCK:", error);
    if (container) {
      container.innerHTML = `
        <p style="color:#ff8095">Tasks load হয়নি। Internet বা Backend পরীক্ষা করে আবার চেষ্টা করো.</p>
        <button type="button" id="ag-retry">Retry</button>
      `;
    }
    showMessage("Backend connection failed. কিছুক্ষণ পরে Retry করো.", "error");
  } finally {
    state.loading = false;
  }
}

function openTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task || state.completed.has(id) || state.opened.has(id)) return;

  if (!validTaskURL(task.url)) {
    showMessage("এই task-এর URL বৈধ নয়.", "error");
    return;
  }

  // Open synchronously from the user click to avoid popup blockers.
  const newTab = window.open(task.url, "_blank", "noopener,noreferrer");

  if (!newTab) {
    showMessage("নতুন tab blocked হয়েছে। Browser-এর pop-up setting পরীক্ষা করো.", "error");
    return;
  }

  state.opened.set(id, false);
  renderTasks();

  const startedAt = Date.now();
  const waitElement = document.querySelector(`[data-wait-id="${id}"]`);

  const tick = () => {
    if (!state.opened.has(id) || state.completed.has(id)) {
      clearInterval(state.timers.get(id));
      state.timers.delete(id);
      return;
    }

    const remaining = Math.max(
      0,
      WAIT_SECONDS - Math.floor((Date.now() - startedAt) / 1000)
    );

    const current = document.querySelector(`[data-wait-id="${id}"]`);
    if (current) {
      current.textContent = remaining > 0
        ? `Wait ${remaining} seconds...`
        : "You can now mark this task complete.";
    }

    if (remaining <= 0) {
      clearInterval(state.timers.get(id));
      state.timers.delete(id);
      state.opened.set(id, true);
      renderTasks();
    }
  };

  state.timers.set(id, setInterval(tick, 250));
}

function completeTask(id) {
  if (!state.tasks.some((task) => task.id === id)) return;
  if (state.opened.get(id) !== true) return;
  if (state.completed.has(id)) return;

  // This is a user self-report, not platform-side verification.
  state.completed.add(id);
  renderTasks();

  showMessage("Task marked complete. এটি স্বাধীনভাবে যাচাই করা হয়নি.");
}

document.addEventListener("click", (event) => {
  const openButton = event.target.closest(".ag-open-task");
  if (openButton && !openButton.disabled) {
    openTask(Number(openButton.dataset.id));
    return;
  }

  const completeButton = event.target.closest(".ag-complete-task");
  if (completeButton && !completeButton.disabled) {
    completeTask(Number(completeButton.dataset.id));
    return;
  }

  if (event.target.closest("#ag-retry")) {
    loadTasks();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Optional: update existing link to this backend.
  const backendLink = $("#backend-link");
  if (backendLink) backendLink.href = `${API_BASE}/api/health`;

  // Progress deliberately stays in memory and resets after refresh.
  loadTasks();
});
