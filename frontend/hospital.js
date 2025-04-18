// 🔐 Restrict access to hospital users
if (localStorage.getItem("userType") !== "hospital") {
  alert("❌ Access denied. Hospital login required.");
  window.location.href = "index.html";
}

// Constants
const RECORDS_PER_PAGE = 5;
const API_BASE_URL = "https://hospital-test-management.onrender.com";

// State
let currentPage = 1;
let allRecords = [];

// DOM Elements
const elements = {
  hospitalName: document.getElementById("hospitalName"),
  dashboardSelect: document.getElementById("dashboardSelect"),
  uploadSection: document.getElementById("uploadSection"),
  viewSection: document.getElementById("viewSection"),
  testForm: document.getElementById("testForm"),
  testDataTable: document.querySelector("#testDataTable tbody"),
  exportBtn: document.getElementById("exportCSV"),
  pagination: document.getElementById("pagination"),
  pdfViewer: document.getElementById("pdfViewer"),
  notesContent: document.getElementById("notesContent"),
  editIndexField: document.getElementById("editIndex"),
  logoutButton: document.getElementById("logoutButton"),
  darkModeToggle: document.getElementById("darkModeToggle"),
};

// Modals
const pdfModal = document.getElementById("pdfModal") && typeof bootstrap !== 'undefined'
  ? new bootstrap.Modal(document.getElementById("pdfModal"))
  : null;
const notesModal = document.getElementById("notesModal") && typeof bootstrap !== 'undefined'
  ? new bootstrap.Modal(document.getElementById("notesModal"))
  : null;

// Utility Functions
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (match) => {
    const escapeChars = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return escapeChars[match] || match;
  });
}

function showToast(message) {
  const toast = document.getElementById("mainToast");
  if (toast) {
    toast.querySelector(".toast-body").textContent = message;
    bootstrap.Toast.getOrCreateInstance(toast).show();
  } else {
    alert(message); // Fallback to alert
  }
}

function getBadgeColor(testResult) {
  switch (testResult.toLowerCase()) {
    case 'normal': return 'success';
    case 'positive': return 'danger';
    case 'negative': return 'success';
    case 'pending': return 'warning';
    default: return 'secondary';
  }
}

function setLoading(isLoading, element) {
  element.disabled = isLoading;
  element.innerHTML = isLoading
    ? '<i class="fas fa-spinner fa-spin"></i> Processing...'
    : element.dataset.originalText || element.innerHTML;
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const hospitalUsername = localStorage.getItem("loggedInHospital") || "Hospital";
  elements.hospitalName.textContent = hospitalUsername;

  // Dark mode
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    elements.darkModeToggle.querySelector("i").classList.replace("fa-moon", "fa-sun");
  }

  // Event Listeners
  setupEventListeners(hospitalUsername);
  elements.dashboardSelect.dispatchEvent(new Event("change"));
});

// Event Listeners Setup
function setupEventListeners(hospitalUsername) {
  // Dashboard toggle
  elements.dashboardSelect.addEventListener("change", () => {
    const view = elements.dashboardSelect.value;
    elements.uploadSection.style.display = view === "upload" ? "block" : "none";
    elements.viewSection.style.display = view === "view" ? "block" : "none";
    if (view === "view") loadTestData(hospitalUsername);
  });

  // Logout
  elements.logoutButton.addEventListener("click", () => {
    localStorage.clear();
    showToast("👋 Logged out.");
    setTimeout(() => window.location.href = "index.html", 1000);
  });

  // Dark mode toggle
  elements.darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    elements.darkModeToggle.querySelector("i").classList.replace(
      isDark ? "fa-moon" : "fa-sun",
      isDark ? "fa-sun" : "fa-moon"
    );
  });

  // Form submission
  elements.testForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = elements.testForm.querySelector('button[type="submit"]');
    setLoading(true, submitBtn);

    const formData = {
      username: document.getElementById("username").value.trim(),
      testname: document.getElementById("testName").value.trim(),
      testdate: document.getElementById("testDate").value,
      testresult: document.getElementById("testResult").value.trim(),
      doctornotes: document.getElementById("doctorNotes").value.trim(),
      hospital: hospitalUsername,
    };

    // Input validation
    if (!formData.username || !formData.testname || !formData.testdate || !formData.testresult) {
      showToast("❌ All fields except notes are required.");
      setLoading(false, submitBtn);
      return;
    }

    const fileInput = document.getElementById("testPdf");
    const file = fileInput.files[0];
    let fileUrl = null;

    try {
      if (file) {
        const pdfFormData = new FormData();
        pdfFormData.append("pdf", file);
        pdfFormData.append("username", formData.username);

        const response = await fetch(`${API_BASE_URL}/api/upload-pdf`, {
          method: "POST",
          body: pdfFormData,
        });

        if (!response.ok) throw new Error("Failed to upload PDF.");
        const data = await response.json();
        fileUrl = data.publicUrl;
      }

      formData.pdf = fileUrl;
      const editId = elements.editIndexField.value;

      if (editId && editId !== "-1") {
        const response = await fetch(`${API_BASE_URL}/api/test-results/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to update record.");
      } else {
        const response = await fetch(`${API_BASE_URL}/api/test-results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) throw new Error("Failed to upload record.");
      }

      showToast("✅ Record saved successfully!", "success");
      elements.testForm.reset();
      elements.editIndexField.value = "";
      elements.dashboardSelect.value = "view";
      elements.dashboardSelect.dispatchEvent(new Event("change"));
    } catch (error) {
      showToast(`❌ ${error.message}`);
    } finally {
      setLoading(false, submitBtn);
    }
  });

  // Export CSV
  elements.exportBtn.addEventListener("click", () => {
    if (!allRecords.length) return showToast("❌ No data to export.");
    let csv = "Username,Test Name,Date,Result,Doctor Notes\n";
    allRecords.forEach((d) => {
      csv += `"${d.username}","${d.testname}","${d.testdate}","${d.testresult}","${d.doctornotes || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hospital_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// Data Functions
async function loadTestData(hospitalUsername, page = 1) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/test-results?hospital=${hospitalUsername}`);
    if (!response.ok) throw new Error("Failed to load test results.");
    const data = await response.json();
    allRecords = data;
    currentPage = page;
    renderTable();
    renderPagination();
  } catch (error) {
    showToast(`❌ ${error.message}`);
  }
}

function renderTable() {
  elements.testDataTable.innerHTML = "";
  const start = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginated = allRecords.slice(start, start + RECORDS_PER_PAGE);

  if (!paginated.length) {
    elements.testDataTable.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No records found.</td></tr>`;
    return;
  }

  paginated.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(d.username)}</td>
      <td>${escapeHtml(d.testname)}</td>
      <td>${d.testdate}</td>
      <td><span class="badge bg-${getBadgeColor(d.testresult)}">${escapeHtml(d.testresult)}</span></td>
      <td>${d.doctornotes ? `<button class="btn btn-sm btn-outline-info view-notes" data-notes="${escapeHtml(d.doctornotes)}">View</button>` : "—"}</td>
      <td>${d.pdf ? `<button class="btn btn-sm btn-outline-primary view-pdf" data-pdf="${d.pdf}">View</button>` : "—"}</td>
      <td>
        <button class="btn btn-sm btn-warning me-1 edit-record" data-id="${d.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-record" data-id="${d.id}"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    elements.testDataTable.appendChild(tr);
  });

  attachTableEventListeners();
}

function renderPagination() {
  elements.pagination.innerHTML = "";
  const totalPages = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPage ? "active" : ""}`;
    li.innerHTML = `<a href="#" class="page-link">${i}</a>`;
    li.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      renderTable();
      renderPagination();
    });
    elements.pagination.appendChild(li);
  }
}

function attachTableEventListeners() {
  // View PDF button
  document.querySelectorAll(".view-pdf").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pdfUrl = btn.dataset.pdf;
      if (pdfModal && elements.pdfViewer) {
        elements.pdfViewer.setAttribute("src", pdfUrl);
        pdfModal.show();
      } else {
        window.open(pdfUrl, "_blank");
      }
    });
  });

  // View Notes button
  document.querySelectorAll(".view-notes").forEach((btn) => {
    btn.addEventListener("click", () => {
      const notes = btn.dataset.notes || "No notes available.";
      elements.notesContent.textContent = notes;
      if (notesModal) notesModal.show();
      else alert(notes);
    });
  });

  // Edit Record button
  document.querySelectorAll(".edit-record").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const record = allRecords.find((r) => r.id == id);
      if (!record) return;

      document.getElementById("username").value = record.username;
      document.getElementById("testName").value = record.testname;
      document.getElementById("testDate").value = record.testdate;
      document.getElementById("testResult").value = record.testresult;
      document.getElementById("doctorNotes").value = record.doctornotes || "";
      elements.editIndexField.value = id;

      elements.dashboardSelect.value = "upload";
      elements.dashboardSelect.dispatchEvent(new Event("change"));
    });
  });

  // Delete Record button
  document.querySelectorAll(".delete-record").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("⚠️ Are you sure you want to delete this record?")) return;

      try {
        const response = await fetch(`${API_BASE_URL}/api/test-results/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete record.");
        showToast("🗑️ Record deleted successfully.");
        loadTestData(localStorage.getItem("loggedInHospital"));
      } catch (error) {
        showToast(`❌ ${error.message}`);
      }
    });
  });
}

