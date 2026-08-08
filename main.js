// ==========================================
// 1. DOM Elements & State Variables
// ==========================================
const taskForm = document.getElementById("taskForm");
const tasksContainer = document.getElementById("tasksContainer");
const searchInput = document.getElementById("searchInput");
const addNewTaskBtn = document.getElementById("addNewTaskBtn");

// Filter & Sort Controls
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const sortSelect = document.getElementById("sortSelect");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");

// Counter Elements
const totalCountEl = document.getElementById("totalCount");
const completedCountEl = document.getElementById("completedCount");
const pendingCountEl = document.getElementById("pendingCount");

// Modals
const taskModalEl = document.getElementById("taskModal");
const taskModal = new bootstrap.Modal(taskModalEl);

const deleteModalEl = document.getElementById("deleteModal");
const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalEl);

// Theme Toggle
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

// Global State
let tasks = JSON.parse(localStorage.getItem("tasksList")) || [];
let taskToDeleteIndex = null;
let editTaskIndex = null;

// ==========================================
// 2. Theme Management
// ==========================================
const savedTheme = localStorage.getItem("appTheme") || "dark";
applyTheme(savedTheme);

themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
});

function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("appTheme", theme);

    if (theme === "dark") {
        themeIcon.className = "bi bi-moon-stars-fill";
    } else {
        themeIcon.className = "bi bi-sun-fill text-warning";
    }
}

// ==========================================
// 3. Initial Setup & Event Listeners
// ==========================================
displayTasks();

// Event Listeners for Filters, Search & Sort
searchInput.addEventListener("input", displayTasks);
statusFilter.addEventListener("change", displayTasks);
priorityFilter.addEventListener("change", displayTasks);
sortSelect.addEventListener("change", displayTasks);

// Clear Completed Tasks
clearCompletedBtn.addEventListener("click", () => {
    tasks = tasks.filter(t => !t.completed);
    saveAndRender();
});

// Reset Modal for "Add Task"
if (addNewTaskBtn) {
    addNewTaskBtn.addEventListener("click", () => {
        editTaskIndex = null;
        document.getElementById("taskModalLabel").textContent = "Add New Task";
        document.getElementById("submitTaskBtn").textContent = "Save Task";
        taskForm.reset();
    });
}

taskModalEl.addEventListener("hidden.bs.modal", () => {
    taskForm.reset();
    editTaskIndex = null;
});

// ==========================================
// 4. Form Submit (Add or Edit Task)
// ==========================================
taskForm.addEventListener("submit", (e) => {
    e.preventDefault();

    let title = document.getElementById("titleInput").value.trim();
    let priority = document.getElementById("priorityInput").value;
    let dueDate = document.getElementById("dueDateInput").value;
    let description = document.getElementById("disInput").value.trim() || "There is no description";

    if (!title) return;

    if (editTaskIndex === null) {
        tasks.push({
            name: title,
            priority: priority,
            dueDate: dueDate,
            description: description,
            completed: false
        });
    } else {
        tasks[editTaskIndex] = {
            ...tasks[editTaskIndex],
            name: title,
            priority: priority,
            dueDate: dueDate,
            description: description
        };
        editTaskIndex = null;
    }

    saveAndRender();
    taskForm.reset();
    taskModal.hide();
});

function editTask(index) {
    editTaskIndex = index;
    const task = tasks[index];

    document.getElementById("titleInput").value = task.name;
    document.getElementById("priorityInput").value = task.priority;
    document.getElementById("dueDateInput").value = task.dueDate || "";
    document.getElementById("disInput").value = task.description;

    document.getElementById("taskModalLabel").textContent = "Edit Task";
    document.getElementById("submitTaskBtn").textContent = "Save Changes";

    taskModal.show();
}

// ==========================================
// 5. Completion & Delete Handlers
// ==========================================
function toggleTaskStatus(index) {
    tasks[index].completed = !tasks[index].completed;
    saveAndRender();
}

function deleteTask(index) {
    taskToDeleteIndex = index;
    deleteModal.show();
}

document.getElementById("confirmDeleteBtn").addEventListener("click", function () {
    if (taskToDeleteIndex !== null) {
        tasks.splice(taskToDeleteIndex, 1);
        saveAndRender();

        deleteModal.hide();
        taskToDeleteIndex = null;
    }
});

// ==========================================
// 6. UI Helpers, Counters & Rendering
// ==========================================
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function updateCounters() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    totalCountEl.textContent = total;
    completedCountEl.textContent = completed;
    pendingCountEl.textContent = pending;
}

function displayTasks() {
    updateCounters();
    tasksContainer.innerHTML = "";

    const query = searchInput.value.toLowerCase().trim();
    const statusVal = statusFilter.value;
    const priorityVal = priorityFilter.value;
    const sortVal = sortSelect.value;

    // Preserve original indexes
    let filteredTasks = tasks.map((task, originalIndex) => ({ ...task, originalIndex }));

    // 1. Search Filter
    if (query) {
        filteredTasks = filteredTasks.filter(t =>
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );
    }

    // 2. Status Filter
    if (statusVal === "active") filteredTasks = filteredTasks.filter(t => !t.completed);
    if (statusVal === "completed") filteredTasks = filteredTasks.filter(t => t.completed);

    // 3. Priority Filter
    if (priorityVal !== "All") filteredTasks = filteredTasks.filter(t => t.priority === priorityVal);

    // 4. Sorting
    if (sortVal === "dueDate") {
        filteredTasks.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    } else if (sortVal === "priority") {
        const priorityRank = { High: 1, Medium: 2, Low: 3 };
        filteredTasks.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    } else {
        // Newest First (default)
        filteredTasks.reverse();
    }

    // Case 1: No tasks overall
    if (tasks.length === 0) {
        tasksContainer.innerHTML = `<p class="text-center text-body fs-3 fw-bolder my-4">There are no tasks</p>`;
        return;
    }

    // Case 2: No search/filter match
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

        // Due Date Badge Logic
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
                            <!-- Header: Checkbox, Title, Date & Priority -->
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

                            <!-- Description -->
                            <p class="card-text ${descStyle} small mb-3 text-break ms-4">
                                ${safeDesc}
                            </p>
                        </div>

                        <!-- Actions -->
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

function saveAndRender() {
    localStorage.setItem("tasksList", JSON.stringify(tasks));
    displayTasks();
}