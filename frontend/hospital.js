const RECORDS_PER_PAGE = 5;
const RECENT_RECORDS = 5;
const API_BASE_URL = "http://localhost:5000";

let currentPage = 1;
let allRecords = [];
let sortColumn = null;
let sortDirection = 'asc';

// Authentication check
if (localStorage.getItem("userType") !== "hospital") {
  alert("Access denied. Hospital login required.");
  window.location.href = "index.html";
}

const elements = {
  hospitalName: document.getElementById("hospitalName"),
  welcomeHospitalName: document.getElementById("welcomeHospitalName"),
  dashboardSection: document.getElementById("dashboardSection"),
  testResultsSection: document.getElementById("testResultsSection"),
  uploadSection: document.getElementById("uploadSection"),
  testForm: document.getElementById("testForm"),
  testDataTable: document.querySelector("#testDataTable tbody"),
  recentTestDataTable: document.querySelector("#recentTestDataTable tbody"),
  exportBtn: document.getElementById("exportCSV"),
  pagination: document.getElementById("pagination"),
  pdfViewer: document.getElementById("pdfViewer"),
  notesContent: document.getElementById("notesContent"),
  editIndexField: document.getElementById("editIndex"),
  logoutButton: document.getElementById("logoutButton"),
  searchInput: document.getElementById("searchInput"),
  navLinks: document.querySelectorAll(".nav-link"),
  recentLoading: document.getElementById("recentLoading"),
  tableLoading: document.getElementById("tableLoading"),
  totalTests: document.getElementById("totalTests"),
  normalResults: document.getElementById("normalResults"),
  abnormalResults: document.getElementById("abnormalResults"),
  criticalResults: document.getElementById("criticalResults"),
  darkModeToggle: document.getElementById("darkModeToggle"),
};

const pdfModal = document.getElementById("pdfModal") && typeof bootstrap !== 'undefined'
  ? new bootstrap.Modal(document.getElementById("pdfModal"))
  : null;
const notesModal = document.getElementById("notesModal") && typeof bootstrap !== 'undefined'
  ? new bootstrap.Modal(document.getElementById("notesModal"))
  : null;

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
function showToast(message, type = 'info') {
  const toast = document.getElementById("mainToast");
  if (toast) {
    toast.querySelector(".toast-body").textContent = message;
    toast.querySelector(".toast-header").className = `toast-header bg-black text-white`;
    bootstrap.Toast.getOrCreateInstance(toast).show();
  } else {
    alert(message);
  }
}

function getBadgeColor(testResult) {
  return 'secondary'; // All badges use gray-dark in black-and-white scheme
}

function setLoading(isLoading, element) {
  element.disabled = isLoading;
  element.innerHTML = isLoading
    ? '<i class="fas fa-spinner fa-spin"></i> Processing...'
    : element.dataset.originalText || element.innerHTML;
}

function showSection(section) {
  elements.dashboardSection.style.display = section === 'dashboard' ? 'block' : 'none';
  elements.testResultsSection.style.display = section === 'test-results' ? 'block' : 'none';
  elements.uploadSection.style.display = section === 'upload' ? 'block' : 'none';
  elements.navLinks.forEach(link => {
    link.classList.remove('active'); // Remove active class to disable section indicator
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const hospitalUsername = localStorage.getItem("loggedInHospital") || "Hospital";
  elements.hospitalName.textContent = hospitalUsername;
  elements.welcomeHospitalName.textContent = hospitalUsername;

  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }

  setupEventListeners(hospitalUsername);
  showSection('dashboard');
  loadTestData(hospitalUsername);
});

function setupEventListeners(hospitalUsername) {
  // Handle all elements with data-section attribute
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      showSection(section);
      if (section === 'test-results') loadTestData(hospitalUsername);
    });
  });

  elements.logoutButton.addEventListener("click", () => {
    localStorage.clear();
    showToast("Logged out successfully.", 'success');
    setTimeout(() => window.location.href = "index.html", 1000);
  });

  elements.darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    if (document.body.classList.contains("dark-mode")) {
      localStorage.setItem("darkMode", "enabled");
      elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
      localStorage.setItem("darkMode", "disabled");
      elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  });

  elements.testForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!elements.testForm.checkValidity()) {
      elements.testForm.classList.add('was-validated');
      showToast("Please fill all required fields correctly.", 'error');
      return;
    }

    const submitBtn = elements.testForm.querySelector('button[type="submit"]');
    setLoading(true, submitBtn);
    const progressBar = elements.testForm.querySelector('.progress');

    const formData = {
      username: document.getElementById("username").value.trim(),
      testname: document.getElementById("testName").value.trim(),
      testdate: document.getElementById("testDate").value,
      testresult: document.getElementById("testResult").value.trim(),
      doctornotes: document.getElementById("doctorNotes").value.trim(),
      hospital: hospitalUsername,
    };

    const fileInput = document.getElementById("testPdf");
    const file = fileInput.files[0];
    let fileUrl = null;

    try {
      if (file) {
        progressBar.style.display = 'block';
        const pdfFormData = new FormData();
        pdfFormData.append("pdf", file);
        pdfFormData.append("username", formData.username);

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            progressBar.querySelector('.progress-bar').style.width = `${percent}%`;
          }
        });

        await new Promise((resolve, reject) => {
          xhr.open("POST", `${API_BASE_URL}/api/upload-pdf`);
          xhr.onload = () => {
            if (xhr.status === 200) {
              fileUrl = JSON.parse(xhr.responseText).publicUrl;
              resolve();
            } else {
              reject(new Error("Failed to upload PDF."));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during PDF upload."));
          xhr.send(pdfFormData);
        });
        progressBar.style.display = 'none';
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

      showToast("Record saved successfully.", 'success');
      elements.testForm.reset();
      elements.testForm.classList.remove('was-validated');
      elements.editIndexField.value = "";
      showSection('test-results');
      loadTestData(hospitalUsername);
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false, submitBtn);
      progressBar.style.display = 'none';
    }
  });

  elements.exportBtn.addEventListener("click", () => {
    if (!allRecords.length) return showToast("No data to export.", 'error');
    let csv = "Patient,Test Name,Date,Status,Doctor Notes\n";
    allRecords.forEach((d) => {
      csv += `"${d.username}","${d.testname}","${d.testdate}","${d.testresult}","${d.doctornotes || ""}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hospital_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  elements.searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderTable();
  });

  document.querySelectorAll("#testDataTable th[data-sort]").forEach(th => {
    th.addEventListener("click", () => {
      const column = th.dataset.sort;
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'asc';
      }
      renderTable();
    });
  });
}

async function loadTestData(hospitalUsername) {
  try {
    elements.recentLoading.classList.remove('d-none');
    elements.tableLoading.classList.remove('d-none');
    const response = await fetch(`${API_BASE_URL}/api/test-results?hospital=${hospitalUsername}`);
    if (!response.ok) throw new Error("Failed to load test results.");
    allRecords = await response.json();

    // Update stats
    elements.totalTests.textContent = allRecords.length;
    elements.normalResults.textContent = allRecords.filter(r => r.testresult.toLowerCase() === 'negative').length;
    elements.abnormalResults.textContent = allRecords.filter(r => r.testresult.toLowerCase() === 'inconclusive').length;
    elements.criticalResults.textContent = allRecords.filter(r => r.testresult.toLowerCase() === 'positive').length;

    renderRecentTable();
    renderTable();
    renderPagination();
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  } finally {
    elements.recentLoading.classList.add('d-none');
    elements.tableLoading.classList.add('d-none');
  }
}

function renderRecentTable() {
  elements.recentTestDataTable.innerHTML = "";
  const recent = allRecords.slice(0, RECENT_RECORDS);
  if (!recent.length) {
    elements.recentTestDataTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No recent records found.</td></tr>`;
    return;
  }
  recent.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(d.username)}</td>
      <td>${escapeHtml(d.testname)}</td>
      <td>${d.testdate}</td>
      <td><span class="badge bg-${getBadgeColor(d.testresult)}">${escapeHtml(d.testresult)}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-black view-record" data-id="${d.id}">View</button>
      </td>
    `;
    elements.recentTestDataTable.appendChild(tr);
  });
  attachTableEventListeners(elements.recentTestDataTable);
}

function renderTable() {
  elements.testDataTable.innerHTML = "";
  let filteredRecords = [...allRecords];
  const searchTerm = elements.searchInput.value.toLowerCase();
  if (searchTerm) {
    filteredRecords = filteredRecords.filter(record =>
      record.username.toLowerCase().includes(searchTerm) ||
      record.testname.toLowerCase().includes(searchTerm) ||
      record.testresult.toLowerCase().includes(searchTerm)
    );
  }
  if (sortColumn) {
    filteredRecords.sort((a, b) => {
      const valA = a[sortColumn].toString().toLowerCase();
      const valB = b[sortColumn].toString().toLowerCase();
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
  }
  const start = (currentPage - 1) * RECORDS_PER_PAGE;
  const paginated = filteredRecords.slice(start, start + RECORDS_PER_PAGE);
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
      <td>${d.doctornotes ? `<button class="btn btn-sm btn-outline-black view-notes" data-notes="${escapeHtml(d.doctornotes)}">View</button>` : "—"}</td>
      <td>${d.pdf ? `<button class="btn btn-sm btn-outline-black view-pdf" data-pdf="${d.pdf}">View</button>` : "—"}</td>
      <td>
        <i class="fas fa-pencil-alt action-icon edit-icon edit-record" data-id="${d.id}" title="Edit"></i>
        <i class="fas fa-trash-alt action-icon delete-icon delete-record" data-id="${d.id}" title="Delete"></i>
      </td>
    `;
    elements.testDataTable.appendChild(tr);
  });
  attachTableEventListeners(elements.testDataTable);
}

function renderPagination() {
  elements.pagination.innerHTML = "";
  const filteredRecords = elements.searchInput.value
    ? allRecords.filter(record =>
        record.username.toLowerCase().includes(elements.searchInput.value.toLowerCase()) ||
        record.testname.toLowerCase().includes(elements.searchInput.value.toLowerCase()) ||
        record.testresult.toLowerCase().includes(elements.searchInput.value.toLowerCase())
      )
    : allRecords;
  const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);
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

function attachTableEventListeners(tableBody) {
  tableBody.querySelectorAll(".view-pdf").forEach((btn) => {
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
  tableBody.querySelectorAll(".view-notes").forEach((btn) => {
    btn.addEventListener("click", () => {
      const notes = btn.dataset.notes || "No notes available.";
      elements.notesContent.textContent = notes;
      if (notesModal) notesModal.show();
      else alert(notes);
    });
  });
  tableBody.querySelectorAll(".view-record").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const record = allRecords.find((r) => r.id == id);
      if (!record) return;
      elements.notesContent.textContent = record.doctornotes || "No notes available.";
      if (record.pdf && pdfModal) {
        elements.pdfViewer.setAttribute("src", record.pdf);
        pdfModal.show();
      } else if (notesModal) {
        notesModal.show();
      } else {
        alert(record.doctornotes || "No notes available.");
      }
    });
  });
  tableBody.querySelectorAll(".edit-record").forEach((btn) => {
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
      showSection('upload');
    });
  });
  tableBody.querySelectorAll(".delete-record").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("Are you sure you want to delete this record?")) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/test-results/${id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete record.");
        showToast("Record deleted successfully.", 'success');
        loadTestData(localStorage.getItem("loggedInHospital"));
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      }
    });
  });
}