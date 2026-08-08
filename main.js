// ==========================================
// 1. DOM Elements & State Variables
// ==========================================
// Common Elements
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

// Tasks Page Elements
const taskForm = document.getElementById("taskForm");
const tasksContainer = document.getElementById("tasksContainer");
const searchInput = document.getElementById("searchInput");
const fabAddTaskBtn = document.getElementById("fabAddTaskBtn");

// Tasks Filters & Sort Controls
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const sortSelect = document.getElementById("sortSelect");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");

// Dashboard Elements & Filters
const totalCountEl = document.getElementById("totalCount");
const completedCountEl = document.getElementById("completedCount");
const pendingCountEl = document.getElementById("pendingCount");
const dashPriorityFilter = document.getElementById("dashPriorityFilter");
const dashDateFilter = document.getElementById("dashDateFilter");
const resetDashFiltersBtn = document.getElementById("resetDashFiltersBtn");

// Modals
const taskModalEl = document.getElementById("taskModal");
const taskModal = taskModalEl ? new bootstrap.Modal(taskModalEl) : null;

const deleteModalEl = document.getElementById("deleteModal");
const deleteModal = deleteModalEl ? bootstrap.Modal.getOrCreateInstance(deleteModalEl) : null;

// Global State
let tasks = JSON.parse(localStorage.getItem("tasksList")) || [];
let taskToDeleteIndex = null;
let editTaskIndex = null;

// Chart Instances
// Chart Instances
let statusChartInstance = null;
let priorityChartInstance = null;
let timelineChartInstance = null;
let progressMatrixChartInstance = null;

// ==========================================
// 2. Theme Management (Light / Dark Mode)
// ==========================================
const savedTheme = localStorage.getItem("appTheme") || "dark";
applyTheme(savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "dark";
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(newTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("appTheme", theme);

    if (themeIcon) {
        themeIcon.className = theme === "dark" ? "bi bi-moon-stars-fill" : "bi bi-sun-fill text-warning";
    }
}

// ==========================================
// 3. Initial Setup & Event Listeners
// ==========================================
renderPage();

// Tasks Page Listeners
if (searchInput) searchInput.addEventListener("input", renderPage);
if (statusFilter) statusFilter.addEventListener("change", renderPage);
if (priorityFilter) priorityFilter.addEventListener("change", renderPage);
if (sortSelect) sortSelect.addEventListener("change", renderPage);

if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener("click", () => {
        tasks = tasks.filter(t => !t.completed);
        saveAndRender();
    });
}

// Dashboard Page Listeners
if (dashPriorityFilter) dashPriorityFilter.addEventListener("change", renderPage);
if (dashDateFilter) dashDateFilter.addEventListener("change", renderPage);

if (resetDashFiltersBtn) {
    resetDashFiltersBtn.addEventListener("click", () => {
        if (dashPriorityFilter) dashPriorityFilter.value = "All";
        if (dashDateFilter) dashDateFilter.value = "all";
        renderPage();
    });
}

// FAB & Modal Listeners
function openAddModal() {
    editTaskIndex = null;
    document.getElementById("taskModalLabel").textContent = "Add New Task";
    document.getElementById("submitTaskBtn").textContent = "Save Task";
    if (taskForm) taskForm.reset();
}

if (fabAddTaskBtn) fabAddTaskBtn.addEventListener("click", openAddModal);

if (taskModalEl) {
    taskModalEl.addEventListener("hidden.bs.modal", () => {
        if (taskForm) taskForm.reset();
        editTaskIndex = null;
    });
}

// ==========================================
// 4. Form Submit & Edit Logic
// ==========================================
if (taskForm) {
    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();

        let title = document.getElementById("titleInput").value.trim();
        let priority = document.getElementById("priorityInput").value;
        let dueDate = document.getElementById("dueDateInput").value;
        let description = document.getElementById("disInput").value.trim() || "There is no description";

        if (!title) return;

        if (editTaskIndex === null) {
            tasks.push({ name: title, priority: priority, dueDate: dueDate, description: description, completed: false });
        } else {
            tasks[editTaskIndex] = { ...tasks[editTaskIndex], name: title, priority: priority, dueDate: dueDate, description: description };
            editTaskIndex = null;
        }

        saveAndRender();
        taskForm.reset();
        if (taskModal) taskModal.hide();
    });
}

function editTask(index) {
    editTaskIndex = index;
    const task = tasks[index];

    document.getElementById("titleInput").value = task.name;
    document.getElementById("priorityInput").value = task.priority;
    document.getElementById("dueDateInput").value = task.dueDate || "";
    document.getElementById("disInput").value = task.description;

    document.getElementById("taskModalLabel").textContent = "Edit Task";
    document.getElementById("submitTaskBtn").textContent = "Save Changes";

    if (taskModal) taskModal.show();
}

// ==========================================
// 5. Completion & Delete Logic
// ==========================================
function toggleTaskStatus(index) {
    tasks[index].completed = !tasks[index].completed;
    saveAndRender();
}

function deleteTask(index) {
    taskToDeleteIndex = index;
    if (deleteModal) deleteModal.show();
}

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", function () {
        if (taskToDeleteIndex !== null) {
            tasks.splice(taskToDeleteIndex, 1);
            saveAndRender();
            if (deleteModal) deleteModal.hide();
            taskToDeleteIndex = null;
        }
    });
}

// ==========================================
// 6. Helpers, Dashboard Analytics & Rendering
// ==========================================
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getFilteredDashboardTasks() {
    let list = [...tasks];
    const todayStr = new Date().toISOString().split("T")[0];

    // Priority Filter
    if (dashPriorityFilter && dashPriorityFilter.value !== "All") {
        list = list.filter(t => t.priority === dashPriorityFilter.value);
    }

    // Timeframe Filter
    if (dashDateFilter) {
        if (dashDateFilter.value === "overdue") {
            list = list.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr);
        } else if (dashDateFilter.value === "today") {
            list = list.filter(t => t.dueDate === todayStr);
        }
    }

    return list;
}

function updateCounters() {
    if (!totalCountEl) return;
    const filteredList = getFilteredDashboardTasks();
    const total = filteredList.length;
    const completed = filteredList.filter(t => t.completed).length;
    const pending = total - completed;

    totalCountEl.textContent = total;
    completedCountEl.textContent = completed;
    pendingCountEl.textContent = pending;
}

function renderCharts() {
    const statusCanvas = document.getElementById('statusChart');
    const priorityCanvas = document.getElementById('priorityChart');
    const timelineCanvas = document.getElementById('timelineChart');
    const matrixCanvas = document.getElementById('progressMatrixChart');

    if (!statusCanvas || !priorityCanvas || !timelineCanvas || !matrixCanvas) return;

    const filteredList = getFilteredDashboardTasks();
    const todayStr = new Date().toISOString().split("T")[0];

    // Destroy old instances
    if (statusChartInstance) statusChartInstance.destroy();
    if (priorityChartInstance) priorityChartInstance.destroy();
    if (timelineChartInstance) timelineChartInstance.destroy();
    if (progressMatrixChartInstance) progressMatrixChartInstance.destroy();

    // --- Chart 1: Status (Doughnut) ---
    const completedCount = filteredList.filter(t => t.completed).length;
    const pendingCount = filteredList.length - completedCount;

    statusChartInstance = new Chart(statusCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: [completedCount, pendingCount],
                backgroundColor: ['#198754', '#ffc107']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // --- Chart 2: Priority (Bar) ---
    const highCount = filteredList.filter(t => t.priority === 'High').length;
    const medCount = filteredList.filter(t => t.priority === 'Medium').length;
    const lowCount = filteredList.filter(t => t.priority === 'Low').length;

    priorityChartInstance = new Chart(priorityCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Tasks',
                data: [highCount, medCount, lowCount],
                backgroundColor: ['#dc3545', '#fd7e14', '#0dcaf0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    // --- Chart 3: Timeline Health (Pie Chart) ---
    const overdueCount = filteredList.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
    const todayCount = filteredList.filter(t => t.dueDate === todayStr).length;
    const upcomingCount = filteredList.filter(t => t.dueDate && t.dueDate > todayStr).length;
    const noDateCount = filteredList.filter(t => !t.dueDate).length;

    timelineChartInstance = new Chart(timelineCanvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Overdue', 'Due Today', 'Upcoming', 'No Due Date'],
            datasets: [{
                data: [overdueCount, todayCount, upcomingCount, noDateCount],
                backgroundColor: ['#dc3545', '#0d6efd', '#20c997', '#6c757d']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // --- Chart 4: Priority Progress (Stacked Bar Chart) ---
    const highDone = filteredList.filter(t => t.priority === 'High' && t.completed).length;
    const medDone = filteredList.filter(t => t.priority === 'Medium' && t.completed).length;
    const lowDone = filteredList.filter(t => t.priority === 'Low' && t.completed).length;

    progressMatrixChartInstance = new Chart(matrixCanvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [
                {
                    label: 'Completed',
                    data: [highDone, medDone, lowDone],
                    backgroundColor: '#198754'
                },
                {
                    label: 'Pending',
                    data: [highCount - highDone, medCount - medDone, lowCount - lowDone],
                    backgroundColor: '#6c757d'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function displayTasks() {
    if (!tasksContainer) return;
    tasksContainer.innerHTML = "";

    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const statusVal = statusFilter ? statusFilter.value : "all";
    const priorityVal = priorityFilter ? priorityFilter.value : "All";
    const sortVal = sortSelect ? sortSelect.value : "newest";

    let filteredTasks = tasks.map((task, originalIndex) => ({ ...task, originalIndex }));

    if (query) {
        filteredTasks = filteredTasks.filter(t => t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
    }

    if (statusVal === "active") filteredTasks = filteredTasks.filter(t => !t.completed);
    if (statusVal === "completed") filteredTasks = filteredTasks.filter(t => t.completed);

    if (priorityVal !== "All") filteredTasks = filteredTasks.filter(t => t.priority === priorityVal);

    if (sortVal === "dueDate") {
        filteredTasks.sort((a, b) => (!a.dueDate ? 1 : !b.dueDate ? -1 : new Date(a.dueDate) - new Date(b.dueDate)));
    } else if (sortVal === "priority") {
        const priorityRank = { High: 1, Medium: 2, Low: 3 };
        filteredTasks.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    } else {
        filteredTasks.reverse();
    }

    if (tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-center text-body fs-3 fw-bolder my-4">There are no tasks</p>`;
        return;
    }

    if (filteredTasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-center text-body-secondary fs-4 my-4">No matching tasks found</p>`;
        return;
    }

    let cardsHTML = "";
    const todayStr = new Date().toISOString().split("T")[0];

    filteredTasks.forEach((task) => {
        let borderClass = "border-start border-4 border-secondary";
        let badgeClass = "bg-secondary-subtle text-secondary";

        if (task.priority === "High") {
            borderClass = "border-start border-4 border-danger";
            badgeClass = "bg-danger-subtle text-danger";
        } else if (task.priority === "Medium") {
            borderClass = "border-start border-4 border-warning";
            badgeClass = "bg-warning-subtle text-warning-emphasis";
        } else if (task.priority === "Low") {
            borderClass = "border-start border-4 border-info";
            badgeClass = "bg-info-subtle text-info";
        }

        const safeName = escapeHTML(task.name);
        const safeDesc = escapeHTML(task.description);
        const isDone = task.completed || false;

        const titleStyle = isDone ? "text-decoration-line-through text-body-secondary opacity-75" : "text-body";
        const descStyle = isDone ? "text-decoration-line-through text-body-tertiary opacity-75" : "text-body-secondary";

        let dueDateBadge = "";
        if (task.dueDate) {
            const isOverdue = !isDone && task.dueDate < todayStr;
            const dateBadgeClass = isOverdue ? "bg-danger-subtle text-danger fw-bold" : "bg-body-secondary text-body-secondary";
            const dateIcon = isOverdue ? "bi-exclamation-triangle-fill" : "bi-calendar-event";
            dueDateBadge = `
                <span class="badge ${dateBadgeClass} rounded-pill px-2 py-1" style="font-size: 0.725rem;">
                    <i class="bi ${dateIcon} me-1"></i>${task.dueDate} ${isOverdue ? "(Overdue)" : ""}
                </span>
            `;
        }

        cardsHTML += `
            <div class="col-12">
                <div class="card border-0 shadow-sm rounded-3 ${borderClass} bg-body-tertiary task-card">
                    <div class="card-body p-3 d-flex flex-column justify-content-between">

                        <div>
                            <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                                <div class="d-flex align-items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        class="form-check-input rounded-circle mt-0" 
                                        ${isDone ? "checked" : ""} 
                                        onchange="toggleTaskStatus(${task.originalIndex})"
                                        style="width: 1.3em; height: 1.3em; cursor: pointer;"
                                    >
                                    <h6 class="card-title fw-bold ${titleStyle} m-0 text-break" title="${safeName}">
                                        ${safeName}
                                    </h6>
                                </div>
                                <div class="d-flex align-items-center gap-1 flex-shrink-0">
                                    ${dueDateBadge}
                                    <span class="badge ${badgeClass} rounded-pill px-2 py-1" style="font-size: 0.725rem;">
                                        ${task.priority}
                                    </span>
                                </div>
                            </div>

                            <p class="card-text ${descStyle} small mb-3 text-break ms-4">
                                ${safeDesc}
                            </p>
                        </div>

                        <div class="d-flex justify-content-end align-items-center gap-2 pt-2 border-top border-secondary-subtle">
                            <button onclick="editTask(${task.originalIndex})" class="btn btn-sm btn-outline-primary border-0 rounded-2 d-inline-flex align-items-center gap-1">
                                <i class="bi bi-pencil-square"></i>
                                <span>Edit</span>
                            </button>
                            <button onclick="deleteTask(${task.originalIndex})" class="btn btn-sm btn-outline-danger border-0 rounded-2 d-inline-flex align-items-center gap-1">
                                <i class="bi bi-trash"></i>
                                <span>Delete</span>
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        `;
    });

    tasksContainer.innerHTML = cardsHTML;
}

function renderPage() {
    updateCounters();
    renderCharts();
    displayTasks();
}

function saveAndRender() {
    localStorage.setItem("tasksList", JSON.stringify(tasks));
    renderPage();
}
