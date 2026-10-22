
/* =====================================
   AG SUB2UNLOCK
   Temporary task progress
   Refresh = Start Again
===================================== */

// BOT 2-এর আসল username বসাও, @ ছাড়া
const DELIVERY_BOT_USERNAME = "AGSub2UnlockFileBot";

// সব টাস্কের লিংক
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
    url: "https://www.tiktok.com/@agamaneofficial"
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

// প্রতিবার পেজ লোড হলে নতুন অগ্রগতি
let completedTasks = [];
const openedTasks = new Set();
const taskTimers = Object.create(null);

// HTML elements
const taskList = document.getElementById("taskList");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const progressMessage = document.getElementById("progressMessage");
const progressPercent = document.getElementById("progressPercent");
const unlockPanel = document.getElementById("unlockPanel");
const deliveryButton = document.getElementById("deliveryButton");

// নিরাপদে টাস্ক কার্ড তৈরি
function renderTasks() {
  taskList.replaceChildren();

  tasks.forEach(task => {
    const isCompleted = completedTasks.includes(task.id);

    const card = document.createElement("article");
    card.className =
      "task-card" + (isCompleted ? " completed" : "");

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
    tag.textContent =
      task.type === "DAILY" ? "DAILY TASK" : "PERMANENT TASK";

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
    completeButton.disabled = true;
    completeButton.textContent = isCompleted
      ? "✓ Completed"
      : "I Completed This";

    // টাস্কের লিংক খোলা হলে ৫ সেকেন্ডের টাইমার
    openButton.addEventListener("click", () => {
      if (completedTasks.includes(task.id)) return;

      openedTasks.add(task.id);
      completeButton.disabled = true;
      completeButton.textContent = "Wait 5 seconds...";

      clearTimeout(taskTimers[task.id]);

      taskTimers[task.id] = setTimeout(() => {
        if (completedTasks.includes(task.id)) return;

        completeButton.disabled = false;
        completeButton.textContent = "I Completed This";
      }, 5000);
    });

    // ব্যবহারকারী নিজে Completed চাপলে অগ্রগতি বাড়বে
    completeButton.addEventListener("click", () => {
      if (!openedTasks.has(task.id)) return;
      if (completedTasks.includes(task.id)) return;

      completedTasks.push(task.id);

      renderTasks();
    });

    actions.append(openButton, completeButton);
    card.append(icon, details, actions);
    taskList.append(card);
  });

  updateProgress();
}

// Progress এবং unlock panel
function updateProgress() {
  const total = tasks.length;
  const count = completedTasks.length;
  const percent = Math.round((count / total) * 100);
  const remaining = total - count;

  progressText.textContent = count + " / " + total;
  progressBar.style.width = percent + "%";
  progressPercent.textContent = percent + "%";

  progressMessage.textContent = remaining === 0
    ? "All tasks marked complete!"
    : remaining + " tasks remaining";

  if (count === total) {
    unlockPanel.classList.remove("hidden");

    const username = DELIVERY_BOT_USERNAME.replace(/^@/, "");

    deliveryButton.href =
      "https://t.me/" + encodeURIComponent(username);
  } else {
    unlockPanel.classList.add("hidden");
  }
}

// শুরু: প্রতিবার পেজ লোডে শূন্য থেকে
renderTasks();
