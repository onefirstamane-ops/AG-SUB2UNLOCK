
/* AG SUB2UNLOCK - Frontend
   Change DELIVERY_BOT_USERNAME to your real BOT 2 username.
   This frontend stores completion only in the visitor's browser.
*/

const DELIVERY_BOT_USERNAME = "AGSub2UnlockFileBot";

const tasks = [
  {
    id: 1,
    title: "Subscribe to YouTube Channel 1",
    description: "Open the channel and subscribe.",
    icon: "▶️",
    type: "PERMANENT",
    url: "https://www.youtube.com/@MUSE_AG"
  },
  {
    id: 2,
    title: "Subscribe to YouTube Channel 2",
    description: "Visit the channel and subscribe.",
    icon: "▶️",
    type: "PERMANENT",
    url: "https://www.youtube.com/@Kiyotaka1M"
  },
  {
    id: 3,
    title: "Join Telegram Community",
    description: "Open and join the community.",
    icon: "✈️",
    type: "PERMANENT",
    url: "https://t.me/AG_AMANE_COMMUNITY"
  },
  {
    id: 4,
    title: "Follow on TikTok",
    description: "Visit the official TikTok profile.",
    icon: "♪",
    type: "PERMANENT",
    url: "https://tiktok.com/@agamaneofficial"
  },
  {
    id: 5,
    title: "Follow on Facebook",
    description: "Open the Facebook page.",
    icon: "f",
    type: "PERMANENT",
    url: "https://www.facebook.com/share/1cbvxojjj7/"
  },
  {
    id: 6,
    title: "Like & Comment on YouTube Video",
    description: "Open today's video and interact with it.",
    icon: "💬",
    type: "DAILY",
    url: "https://youtube.com/shorts/MFV4IJbaQ2g?si=eqmgGjk53oG8xj3P"
  },
  {
    id: 7,
    title: "Like & Comment on TikTok Video",
    description: "Open today's TikTok video.",
    icon: "❤️",
    type: "DAILY",
    url: "https://vm.tiktok.com/ZSgy7b4aw/"
  }
];

// Use a separate completion list for each campaign.
const campaignCode =
  new URLSearchParams(window.location.search).get("code") || "default";

const storageKey = "ag_sub2unlock_" + campaignCode;

function loadCompleted() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter(id => tasks.some(task => task.id === id))
      : [];
  } catch {
    return [];
  }
}

let completedTasks = loadCompleted();

const taskList = document.getElementById("taskList");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressMessage = document.getElementById("progressMessage");
const progressPercent = document.getElementById("progressPercent");
const unlockPanel = document.getElementById("unlockPanel");
const deliveryButton = document.getElementById("deliveryButton");

function saveCompleted() {
  localStorage.setItem(storageKey, JSON.stringify(completedTasks));
}

function renderTasks() {
  taskList.replaceChildren();

  tasks.forEach(task => {
    const isCompleted = completedTasks.includes(task.id);

    const card = document.createElement("article");
    card.className = "task-card" + (isCompleted ? " completed" : "");

    const icon = document.createElement("div");
    icon.className = "task-icon";
    icon.textContent = task.icon;

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("h3");
    title.textContent = task.id + ". " + task.title;

    const description = document.createElement("p");
    description.textContent = task.description;

    const tag = document.createElement("span");
    tag.className = "task-tag";
    tag.textContent = task.type === "DAILY"
      ? "DAILY TASK"
      : "PERMANENT TASK";

    details.append(title, description, tag);

    const actions = document.createElement("div");
    actions.className = "task-action";

    const openButton = document.createElement("a");
    openButton.className = "task-button";
    openButton.href = task.url;
    openButton.target = "_blank";
    openButton.rel = "noopener noreferrer";
    openButton.textContent = "Open Task ↗";

    const completeButton = document.createElement("button");
    completeButton.className = "complete-button";
    completeButton.type = "button";
    completeButton.textContent = isCompleted
      ? "✓ Completed"
      : "I Completed This";
    completeButton.disabled = isCompleted;

    completeButton.addEventListener("click", () => {
      if (completedTasks.includes(task.id)) return;

      completedTasks.push(task.id);
      saveCompleted();
      renderTasks();
    });

    actions.append(openButton, completeButton);
    card.append(icon, details, actions);
    taskList.append(card);
  });

  updateProgress();
}

function updateProgress() {
  const count = completedTasks.length;
  const percent = Math.round((count / tasks.length) * 100);

  progressText.textContent = count + " / " + tasks.length;
  progressBar.style.width = percent + "%";
  progressPercent.textContent = percent + "%";

  const remaining = tasks.length - count;
  progressMessage.textContent = remaining === 0
    ? "All tasks marked complete!"
    : remaining + " tasks remaining";

  if (count === tasks.length) {
    unlockPanel.classList.remove("hidden");

    const username = DELIVERY_BOT_USERNAME.replace(/^@/, "");
    deliveryButton.href =
      "https://t.me/" + encodeURIComponent(username);

  } else {
    unlockPanel.classList.add("hidden");
  }
}

renderTasks();
