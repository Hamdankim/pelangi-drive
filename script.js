const API_BASE = "/api";

const statusDiv = document.getElementById("status");
const fileInput = document.getElementById("pdfFile");
const fileNameLabel = document.getElementById("fileName");
const fileList = document.getElementById("fileList");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const breadcrumb = document.getElementById("breadcrumb");
const refreshBtn = document.getElementById("refreshBtn");
const fileCard = document.getElementById("fileCard");
const dropOverlay = document.getElementById("dropOverlay");
const viewListBtn = document.getElementById("viewList");
const viewGridBtn = document.getElementById("viewGrid");
const backBtn = document.getElementById("backBtn");
const createFolderBtn = document.getElementById("createFolderBtn");
const propertiesModal = document.getElementById("propertiesModal");
const propertiesBody = document.getElementById("propertiesBody");
const closePropertiesBtn = document.getElementById("closeProperties");
const moveModal = document.getElementById("moveModal");
const moveSelect = document.getElementById("moveSelect");
const closeMoveBtn = document.getElementById("closeMove");
const cancelMoveBtn = document.getElementById("cancelMove");
const confirmMoveBtn = document.getElementById("confirmMove");
const successModal = document.getElementById("successModal");
const renameModal = document.getElementById("renameModal");
const renameInput = document.getElementById("renameInput");
const closeRenameBtn = document.getElementById("closeRename");
const cancelRenameBtn = document.getElementById("cancelRename");
const confirmRenameBtn = document.getElementById("confirmRename");
const deleteModal = document.getElementById("deleteModal");
const closeDeleteBtn = document.getElementById("closeDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const createFolderModal = document.getElementById("createFolderModal");
const createFolderInput = document.getElementById("createFolderInput");
const closeCreateFolderBtn = document.getElementById("closeCreateFolder");
const cancelCreateFolderBtn = document.getElementById("cancelCreateFolder");
const confirmCreateFolderBtn = document.getElementById("confirmCreateFolder");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const bulkActionsBar = document.getElementById("bulkActionsBar");
const selectedCount = document.getElementById("selectedCount");
const bulkMoveBtn = document.getElementById("bulkMoveBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");

let currentItems = [];
let folderStack = [{ id: null, name: "My Drive" }];
let pendingMoveId = null;
let pendingRenameId = null;
let pendingDeleteId = null;
let selectedIds = new Set();

const showStatus = (message, isError = false) => {
    statusDiv.classList.remove("hidden");
    statusDiv.textContent = message;
    statusDiv.style.background = isError ? "#fee2e2" : "rgba(0, 163, 122, 0.12)";
    statusDiv.style.borderColor = isError ? "#fecaca" : "rgba(0, 163, 122, 0.2)";
};

const showSuccessDialog = () => {
    successModal.classList.remove("hidden");
    clearTimeout(showSuccessDialog.timerId);
    showSuccessDialog.timerId = setTimeout(() => {
        successModal.classList.add("hidden");
    }, 2000);
};

const setViewMode = (mode) => {
    const isGrid = mode === "grid";
    fileCard.classList.toggle("grid-view", isGrid);
    viewGridBtn.classList.toggle("active", isGrid);
    viewListBtn.classList.toggle("active", !isGrid);
};

const openSpreadsheet = async (fileId) => {
    try {
        showStatus("Opening spreadsheet...");
        const data = await requestJson(`${API_BASE}/files/${fileId}/open`);
        if (data.url) {
            statusDiv.classList.add("hidden");
            window.open(data.url, "_blank");
            return;
        }
        showStatus("Spreadsheet link not available.", true);
    } catch (error) {
        showStatus(error.message || "Failed to open spreadsheet.", true);
    }
};

const createFolder = () => {
    createFolderInput.value = "";
    createFolderModal.classList.remove("hidden");
    createFolderInput.focus();
};

const requestJson = async (url, options = {}) => {
    const headers = options.headers ? { ...options.headers } : {};
    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data.detail || data.message || "Request failed";
        throw new Error(message);
    }

    return data;
};

const formatBytes = (value) => {
    if (!value) return "-";
    const size = Number(value);
    if (Number.isNaN(size)) return "-";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
};

const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const isFolder = (item) => item.mimeType === "application/vnd.google-apps.folder";

const typeLabel = (item) => {
    if (isFolder(item)) return "Folder";
    if (!item.mimeType) return "File";
    if (item.mimeType.includes("pdf")) return "PDF";
    if (item.mimeType.includes("spreadsheet")) return "Sheet";
    if (item.mimeType.includes("sheet") || item.name?.endsWith(".xlsx")) return "XLSX";
    return item.mimeType.split("/").pop()?.toUpperCase() || "File";
};

const sortItems = (items, sortKey) => {
    const list = [...items];
    const safeText = (value) => (value || "").toString();
    const nameCompare = (a, b) =>
        safeText(a).localeCompare(safeText(b), undefined, { sensitivity: "base" });

    switch (sortKey) {
        case "name-desc":
            list.sort((a, b) => nameCompare(b.name, a.name));
            break;
        case "modified-desc":
            list.sort(
                (a, b) => new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime()
            );
            break;
        case "modified-asc":
            list.sort(
                (a, b) => new Date(a.modifiedTime || 0).getTime() - new Date(b.modifiedTime || 0).getTime()
            );
            break;
        case "size-desc":
            list.sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
            break;
        case "size-asc":
            list.sort((a, b) => Number(a.size || 0) - Number(b.size || 0));
            break;
        case "type-asc":
            list.sort((a, b) => nameCompare(typeLabel(a), typeLabel(b)));
            break;
        case "name-asc":
        default:
            list.sort((a, b) => nameCompare(a.name, b.name));
            break;
    }

    return list;
};

const fileIconMarkup = (item) => {
    if (isFolder(item)) {
        return `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" fill="currentColor" opacity="0.2"/>
                <path d="M5.5 6.25A1.25 1.25 0 0 0 4.25 7.5v9a1.25 1.25 0 0 0 1.25 1.25h13a1.25 1.25 0 0 0 1.25-1.25v-7A1.25 1.25 0 0 0 18.5 8.25h-7a.75.75 0 0 1-.53-.22L9.47 6.53a.75.75 0 0 0-.53-.22h-3.44Z" fill="currentColor"/>
            </svg>
        `;
    }

    return `<img src="excel.png" alt="File" />`;
};

const currentFolderId = () => folderStack[folderStack.length - 1]?.id || null;

const renderBreadcrumb = () => {
    breadcrumb.innerHTML = folderStack
        .map((segment, index) => {
            const isLast = index === folderStack.length - 1;
            return `
                <span class="crumb ${isLast ? "active" : ""}" data-index="${index}">
                    ${segment.name}
                </span>
            `;
        })
        .join("<span class=\"crumb-sep\">/</span>");
    backBtn.disabled = folderStack.length <= 1;
};

const renderFiles = (list) => {
    fileList.innerHTML = "";

    if (list.length === 0) {
        const empty = document.createElement("div");
        empty.className = "file-row";
        empty.innerHTML = `
            <div class="file-name-cell">
                <span class="file-icon">?</span>
                No files
            </div>
            <div></div>
        `;
        fileList.appendChild(empty);
        return;
    }

    list.forEach((file) => {
        const row = document.createElement("div");
        row.className = "file-row";
        row.dataset.id = file.id;
        row.dataset.isFolder = isFolder(file) ? "1" : "0";
        if (selectedIds.has(file.id)) {
            row.classList.add("selected");
        }
        row.innerHTML = `
            <div class="file-name-cell">
                <input type="checkbox" class="file-checkbox" data-id="${file.id}" ${selectedIds.has(file.id) ? "checked" : ""} aria-label="Select ${file.name}">
                <span class="file-icon">${fileIconMarkup(file)}</span>
                <span>${file.name}</span>
            </div>
            <div class="actions">
                <div class="menu-wrapper">
                    <button class="action-btn" data-action="menu" data-id="${file.id}" aria-label="Actions" title="Actions">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6.75 12a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm6.5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm6.5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" fill="currentColor"/>
                        </svg>
                    </button>
                    <div class="action-menu hidden" data-menu="${file.id}">
                        ${isFolder(file)
                ? ""
                : `<button class="menu-item" data-action="download" data-id="${file.id}">Download</button>`}
                        <button class="menu-item" data-action="rename" data-id="${file.id}">Rename</button>
                        <button class="menu-item" data-action="move" data-id="${file.id}">Move</button>
                        <button class="menu-item" data-action="delete" data-id="${file.id}">Delete</button>
                        <button class="menu-item" data-action="properties" data-id="${file.id}">Properties</button>
                    </div>
                </div>
            </div>
        `;
        fileList.appendChild(row);
    });
};

const updateList = () => {
    const keyword = searchInput.value.trim().toLowerCase();
    const filtered = currentItems.filter((file) =>
        (file.name || "").toLowerCase().includes(keyword)
    );
    const sorted = sortItems(filtered, sortSelect?.value || "name-asc");
    renderFiles(sorted);
    updateBulkActionsBar();
    updateSelectAllCheckbox();
};

const updateBulkActionsBar = () => {
    if (selectedIds.size > 0) {
        bulkActionsBar?.classList.remove("hidden");
        if (selectedCount) {
            selectedCount.textContent = `${selectedIds.size} selected`;
        }
    } else {
        bulkActionsBar?.classList.add("hidden");
    }
};

const updateSelectAllCheckbox = () => {
    if (!selectAllCheckbox) return;
    const visibleIds = Array.from(fileList.querySelectorAll(".file-checkbox")).map(
        (cb) => cb.dataset.id
    );
    if (visibleIds.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        return;
    }
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    const someSelected = visibleIds.some((id) => selectedIds.has(id));
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate = someSelected && !allSelected;
};

const toggleSelection = (id) => {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
    } else {
        selectedIds.add(id);
    }
    updateList();
};

const toggleSelectAll = () => {
    const visibleCheckboxes = Array.from(fileList.querySelectorAll(".file-checkbox"));
    const visibleIds = visibleCheckboxes.map((cb) => cb.dataset.id);
    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
        visibleIds.forEach((id) => selectedIds.delete(id));
    } else {
        visibleIds.forEach((id) => selectedIds.add(id));
    }
    updateList();
};

const clearSelection = () => {
    selectedIds.clear();
    updateList();
};

const closeMenus = () => {
    document.querySelectorAll(".action-menu").forEach((menu) => {
        menu.classList.add("hidden");
    });
};

const openMenu = (id) => {
    closeMenus();
    const menu = document.querySelector(`[data-menu="${id}"]`);
    if (menu) menu.classList.remove("hidden");
};

const openProperties = (item) => {
    const location = folderStack[folderStack.length - 1]?.name || "My Drive";
    propertiesBody.innerHTML = `
        <div class="property-row">
            <span>Name</span>
            <span>${item.name || "-"}</span>
        </div>
        <div class="property-row">
            <span>Location</span>
            <span>${location}</span>
        </div>
        <div class="property-row">
            <span>Type</span>
            <span>${typeLabel(item)}</span>
        </div>
        <div class="property-row">
            <span>Size</span>
            <span>${formatBytes(item.size)}</span>
        </div>
        <div class="property-row">
            <span>Modified</span>
            <span>${formatDate(item.modifiedTime)}</span>
        </div>
    `;
    propertiesModal.classList.remove("hidden");
};

const openMoveModal = async (itemId) => {
    pendingMoveId = itemId;
    moveSelect.innerHTML = "";

    try {
        showStatus("Loading folders...");
        const data = await requestJson(`${API_BASE}/folders-only`);
        statusDiv.classList.add("hidden");

        const rootOption = document.createElement("option");
        rootOption.value = "";
        rootOption.textContent = "My Drive";
        moveSelect.appendChild(rootOption);

        (data.folders || []).forEach((folder) => {
            if (folder.id !== itemId) {
                const option = document.createElement("option");
                option.value = folder.id;
                option.textContent = folder.name || "Folder";
                moveSelect.appendChild(option);
            }
        });
    } catch (error) {
        showStatus("Failed to load folders.", true);
        return;
    }

    moveModal.classList.remove("hidden");
};

const closeMoveModal = () => {
    pendingMoveId = null;
    moveModal.classList.add("hidden");
};

const openRenameModal = (itemId, currentName) => {
    pendingRenameId = itemId;
    renameInput.value = currentName || "";
    renameModal.classList.remove("hidden");
    renameInput.focus();
    renameInput.select();
};

const closeRenameModal = () => {
    pendingRenameId = null;
    renameModal.classList.add("hidden");
};

const openDeleteModal = (itemId) => {
    pendingDeleteId = itemId;
    deleteModal.classList.remove("hidden");
};

const closeDeleteModal = () => {
    pendingDeleteId = null;
    deleteModal.classList.add("hidden");
};

const handleAction = async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!action || !id) return;

    const item = currentItems.find((entry) => entry.id === id);
    if (!item) return;

    if (action === "download") {
        window.open(`${API_BASE}/download/${id}`, "_blank");
    }

    if (action === "menu") {
        openMenu(id);
    }

    if (action === "rename") {
        openRenameModal(id, item.name || "");
    }

    if (action === "move") {
        openMoveModal(id);
    }

    if (action === "delete") {
        openDeleteModal(id);
    }

    if (action === "properties") {
        openProperties(item);
    }

    if (action !== "menu") {
        closeMenus();
    }
};

const handleBreadcrumb = (event) => {
    const target = event.target.closest(".crumb");
    if (!target) return;
    const index = Number(target.getAttribute("data-index"));
    if (Number.isNaN(index)) return;
    folderStack = folderStack.slice(0, index + 1);
    renderBreadcrumb();
    loadFiles();
};

const handleBack = () => {
    if (folderStack.length <= 1) return;
    folderStack = folderStack.slice(0, folderStack.length - 1);
    renderBreadcrumb();
    loadFiles();
};

const handleRowOpen = (event) => {
    const row = event.target.closest(".file-row");
    if (!row || row.querySelector(".file-icon")?.textContent === "?") return;
    if (event.target.closest(".menu-wrapper")) return;
    if (event.target.classList.contains("file-checkbox")) return;
    const id = row.dataset.id;
    if (!id) return;
    const item = currentItems.find((entry) => entry.id === id);
    if (!item) return;

    if (isFolder(item)) {
        folderStack.push({ id, name: item.name || "Folder" });
        renderBreadcrumb();
        loadFiles();
    } else if (item.mimeType?.includes("spreadsheet") || item.name?.endsWith(".xlsx")) {
        openSpreadsheet(id);
    } else {
        window.open(`${API_BASE}/download/${id}`, "_blank");
    }
};

const loadFiles = async () => {
    const folderId = currentFolderId();
    const query = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";

    try {
        showStatus("Loading files...");
        const response = await fetch(`${API_BASE}/list${query}`);
        const data = await response.json();
        if (!response.ok) {
            showStatus(`Error: ${data.detail || "Failed to load list"}`, true);
            return;
        }
        currentItems = Array.isArray(data.items) ? data.items : [];
        updateList();
        statusDiv.classList.add("hidden");
    } catch (error) {
        showStatus("Failed to connect to backend.", true);
    }
};

fileInput.addEventListener("change", () => {
    const selected = Array.from(fileInput.files || []);
    if (selected.length === 0) {
        fileNameLabel.textContent = "No file selected";
        return;
    }
    fileNameLabel.textContent = selected.length === 1
        ? selected[0].name
        : `${selected.length} files selected`;

    uploadFiles(selected).finally(() => {
        fileInput.value = "";
        fileNameLabel.textContent = "No file selected";
    });
});

const uploadFiles = async (files) => {
    for (const file of files) {
        if (file.type !== "application/pdf") {
            showStatus(`${file.name} is not a PDF, skipped.`, true);
            continue;
        }

        try {
            showStatus(`Uploading ${file.name}...`);
            const formData = new FormData();
            formData.append("file", file);

            const folderId = currentFolderId();
            const query = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : "";

            const response = await fetch(`${API_BASE}/upload${query}`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                showStatus(`Error ${file.name}: ${data.detail}`, true);
                continue;
            }

            showStatus(`${file.name} uploaded successfully.`);
            await loadFiles();
        } catch (error) {
            showStatus(`Failed to upload ${file.name}: ${error.message}`, true);
        }
    }

    statusDiv.classList.add("hidden");
    showSuccessDialog();
};

const handleDropUpload = (event) => {
    event.preventDefault();
    fileCard.classList.remove("drag-over");
    if (dropOverlay) dropOverlay.setAttribute("aria-hidden", "true");
    const dropped = Array.from(event.dataTransfer?.files || []);
    if (dropped.length === 0) return;
    uploadFiles(dropped);
};

fileList.addEventListener("click", handleAction);
fileList.addEventListener("dblclick", handleRowOpen);
fileList.addEventListener("change", (event) => {
    if (event.target.classList.contains("file-checkbox")) {
        const id = event.target.dataset.id;
        if (id) toggleSelection(id);
    }
});
selectAllCheckbox?.addEventListener("change", toggleSelectAll);
clearSelectionBtn?.addEventListener("click", clearSelection);
searchInput.addEventListener("input", updateList);
if (sortSelect) sortSelect.addEventListener("change", updateList);
breadcrumb.addEventListener("click", handleBreadcrumb);
refreshBtn.addEventListener("click", loadFiles);
viewListBtn.addEventListener("click", () => setViewMode("list"));
viewGridBtn.addEventListener("click", () => setViewMode("grid"));
backBtn.addEventListener("click", handleBack);
createFolderBtn.addEventListener("click", createFolder);
fileCard.addEventListener("dragover", (event) => {
    event.preventDefault();
    fileCard.classList.add("drag-over");
    if (dropOverlay) dropOverlay.setAttribute("aria-hidden", "false");
});
fileCard.addEventListener("dragleave", (event) => {
    if (event.target !== fileCard && !fileCard.contains(event.relatedTarget)) return;
    fileCard.classList.remove("drag-over");
    if (dropOverlay) dropOverlay.setAttribute("aria-hidden", "true");
});
fileCard.addEventListener("drop", handleDropUpload);
closePropertiesBtn.addEventListener("click", () => propertiesModal.classList.add("hidden"));
closeMoveBtn.addEventListener("click", closeMoveModal);
cancelMoveBtn.addEventListener("click", closeMoveModal);
closeRenameBtn.addEventListener("click", closeRenameModal);
cancelRenameBtn.addEventListener("click", closeRenameModal);
closeDeleteBtn.addEventListener("click", closeDeleteModal);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);
closeCreateFolderBtn.addEventListener("click", () => createFolderModal.classList.add("hidden"));
cancelCreateFolderBtn.addEventListener("click", () => createFolderModal.classList.add("hidden"));
confirmMoveBtn.addEventListener("click", async () => {
    if (!pendingMoveId) return;
    try {
        showStatus("Moving file...");
        await requestJson(`${API_BASE}/files/${pendingMoveId}/move`, {
            method: "PATCH",
            body: JSON.stringify({
                folder_id: moveSelect.value || null
            })
        });
        statusDiv.classList.add("hidden");
        showSuccessDialog();
        closeMoveModal();
        await loadFiles();
    } catch (error) {
        showStatus(error.message || "Failed to move file.", true);
    }
});

confirmRenameBtn.addEventListener("click", async () => {
    if (!pendingRenameId) return;
    const nextName = renameInput.value.trim();
    if (!nextName) return;
    try {
        showStatus("Renaming...");
        await requestJson(`${API_BASE}/files/${pendingRenameId}/rename`, {
            method: "PATCH",
            body: JSON.stringify({ name: nextName })
        });
        statusDiv.classList.add("hidden");
        showSuccessDialog();
        closeRenameModal();
        await loadFiles();
    } catch (error) {
        showStatus(error.message || "Failed to rename.", true);
    }
});

confirmDeleteBtn.addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    try {
        showStatus("Deleting file...");
        await requestJson(`${API_BASE}/files/${pendingDeleteId}`, {
            method: "DELETE"
        });
        statusDiv.classList.add("hidden");
        showSuccessDialog();
        closeDeleteModal();
        selectedIds.delete(pendingDeleteId);
        await loadFiles();
    } catch (error) {
        showStatus(error.message || "Failed to delete file.", true);
    }
});

confirmCreateFolderBtn.addEventListener("click", async () => {
    const name = createFolderInput.value.trim();
    if (!name) return;
    try {
        showStatus("Creating folder...");
        await requestJson(`${API_BASE}/folders`, {
            method: "POST",
            body: JSON.stringify({
                name: name,
                parent_id: currentFolderId()
            })
        });
        statusDiv.classList.add("hidden");
        showSuccessDialog();
        document.getElementById("createFolderModal").classList.add("hidden");
        await loadFiles();
    } catch (error) {
        showStatus(error.message || "Failed to create folder.", true);
    }
});

bulkDeleteBtn?.addEventListener("click", async () => {
    if (selectedIds.size === 0) return;

    // Show dialog instead of confirm()
    deleteModal.classList.remove("hidden");
    const deleteMessage = deleteModal.querySelector(".modal-body");
    if (deleteMessage) {
        deleteMessage.innerHTML = `<p>Are you sure you want to delete ${selectedIds.size} file(s)? This action cannot be undone.</p>`;
    }

    // Store bulk mode
    pendingDeleteId = "BULK";
});

// Update delete confirmation to handle bulk delete
const originalDeleteConfirm = confirmDeleteBtn.onclick;
confirmDeleteBtn.onclick = null;
confirmDeleteBtn.addEventListener("click", async () => {
    if (pendingDeleteId === "BULK") {
        const idsToDelete = Array.from(selectedIds);
        let successCount = 0;
        let errorCount = 0;

        for (const id of idsToDelete) {
            try {
                await requestJson(`${API_BASE}/files/${id}`, { method: "DELETE" });
                successCount++;
                selectedIds.delete(id);
            } catch (error) {
                errorCount++;
                showStatus(`Failed to delete some files: ${error.message}`, true);
            }
        }

        if (successCount > 0) {
            showSuccessDialog();
            await loadFiles();
        }
        if (errorCount === 0) {
            statusDiv.classList.add("hidden");
        }
        closeDeleteModal();
        pendingDeleteId = null;
        return;
    }

    if (!pendingDeleteId) return;
    try {
        showStatus("Deleting file...");
        await requestJson(`${API_BASE}/files/${pendingDeleteId}`, {
            method: "DELETE"
        });
        statusDiv.classList.add("hidden");
        showSuccessDialog();
        closeDeleteModal();
        selectedIds.delete(pendingDeleteId);
        await loadFiles();
    } catch (error) {
        showStatus(error.message || "Failed to delete file.", true);
    }
});

bulkMoveBtn?.addEventListener("click", async () => {
    if (selectedIds.size === 0) return;

    try {
        showStatus("Loading folders...");
        const data = await requestJson(`${API_BASE}/folders-only`);
        statusDiv.classList.add("hidden");

        moveSelect.innerHTML = "";
        const rootOption = document.createElement("option");
        rootOption.value = "";
        rootOption.textContent = "My Drive";
        moveSelect.appendChild(rootOption);

        (data.folders || []).forEach((folder) => {
            if (!selectedIds.has(folder.id)) {
                const option = document.createElement("option");
                option.value = folder.id;
                option.textContent = folder.name || "Folder";
                moveSelect.appendChild(option);
            }
        });

        pendingMoveId = "BULK";
        moveModal.classList.remove("hidden");
    } catch (error) {
        showStatus("Failed to load folders.", true);
    }
});

const originalConfirmMove = confirmMoveBtn.onclick;
confirmMoveBtn.onclick = null;
confirmMoveBtn.addEventListener("click", async () => {
    if (pendingMoveId === "BULK") {
        if (selectedIds.size === 0) return;
        const targetFolder = moveSelect.value || null;
        const idsToMove = Array.from(selectedIds);
        let successCount = 0;
        let errorCount = 0;

        showStatus("Moving files...");
        for (const id of idsToMove) {
            try {
                await requestJson(`${API_BASE}/files/${id}/move`, {
                    method: "PATCH",
                    body: JSON.stringify({ folder_id: targetFolder })
                });
                successCount++;
                selectedIds.delete(id);
            } catch (error) {
                errorCount++;
            }
        }

        if (successCount > 0) {
            showSuccessDialog();
            closeMoveModal();
            await loadFiles();
        }
        if (errorCount > 0) {
            showStatus(`Failed to move ${errorCount} file(s).`, true);
        } else {
            statusDiv.classList.add("hidden");
        }
        pendingMoveId = null;
        return;
    }

    if (!pendingMoveId) return;
    try {
        showStatus("Moving file...");
        await requestJson(`${API_BASE}/files/${pendingMoveId}/move`, {
            method: "PATCH",
            body: JSON.stringify({
                folder_id: moveSelect.value || null
            })
        });
        statusDiv.classList.add("hidden");
        showSuccessDialog();
        closeMoveModal();
        await loadFiles();
    } catch (error) {
        showStatus(error.message || "Failed to move file.", true);
    }
});
propertiesModal.addEventListener("click", (event) => {
    if (event.target === propertiesModal) propertiesModal.classList.add("hidden");
});
moveModal.addEventListener("click", (event) => {
    if (event.target === moveModal) closeMoveModal();
});
renameModal.addEventListener("click", (event) => {
    if (event.target === renameModal) closeRenameModal();
});
deleteModal.addEventListener("click", (event) => {
    if (event.target === deleteModal) closeDeleteModal();
});
createFolderModal.addEventListener("click", (event) => {
    if (event.target === createFolderModal) document.getElementById("createFolderModal").classList.add("hidden");
});
successModal.addEventListener("click", (event) => {
    if (event.target === successModal) successModal.classList.add("hidden");
});
document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-wrapper")) closeMenus();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeMenus();
        propertiesModal.classList.add("hidden");
        closeMoveModal();
        closeRenameModal();
        closeDeleteModal();
        createFolderModal.classList.add("hidden");
        successModal.classList.add("hidden");
    }
    if (event.key === "Enter") {
        if (!renameModal.classList.contains("hidden")) {
            event.preventDefault();
            confirmRenameBtn.click();
        }
        if (!createFolderModal.classList.contains("hidden")) {
            event.preventDefault();
            confirmCreateFolderBtn.click();
        }
    }
});

renderBreadcrumb();
setViewMode("list");
loadFiles();
