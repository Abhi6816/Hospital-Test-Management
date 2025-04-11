import { supabase } from './login.js';

if (localStorage.getItem("userType") !== "hospital") {
  alert("❌ Access denied. Hospital login required.");
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const hospitalUsername = localStorage.getItem("loggedInHospital") || "Hospital";
  document.getElementById("hospitalName").textContent = hospitalUsername;

  const dashboardSelect = document.getElementById("dashboardSelect");
  const uploadSection = document.getElementById("uploadSection");
  const viewSection = document.getElementById("viewSection");
  const testForm = document.getElementById("testForm");
  const testDataTable = document.querySelector("#testDataTable tbody");
  const exportBtn = document.getElementById("exportCSV");
  const pagination = document.getElementById("pagination");
  const pdfViewer = document.getElementById("pdfViewer");
  const notesContent = document.getElementById("notesContent");
  const editIndexField = document.getElementById("editIndex");

  const pdfModal = new bootstrap.Modal(document.getElementById("pdfModal"));
  const notesModal = new bootstrap.Modal(document.getElementById("notesModal"));

  const RECORDS_PER_PAGE = 5;
  let currentPage = 1;
  let allRecords = [];

  dashboardSelect.addEventListener("change", () => {
    const view = dashboardSelect.value;
    uploadSection.style.display = view === "upload" ? "block" : "none";
    viewSection.style.display = view === "view" ? "block" : "none";
    if (view === "view") loadTestData();
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("loggedInHospital");
    window.location.href = "index.html";
  });

  document.getElementById("darkModeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const icon = document.querySelector("#darkModeToggle i");
    const isDark = document.body.classList.contains("dark-mode");
    icon.classList.replace(isDark ? "fa-moon" : "fa-sun", isDark ? "fa-sun" : "fa-moon");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
  });

  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    document.querySelector("#darkModeToggle i").classList.replace("fa-moon", "fa-sun");
  }

  testForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      username: document.getElementById("username").value,
      testname: document.getElementById("testName").value,
      testdate: document.getElementById("testDate").value,
      testresult: document.getElementById("testResult").value,
      doctornotes: document.getElementById("doctorNotes").value,
      hospital: hospitalUsername // 👈 store hospital username
    };

    const fileInput = document.getElementById("testPdf");
    const file = fileInput.files[0];
    let fileUrl = null;

    if (file) {
      const filePath = `${formData.username}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("medical-reports")
        .upload(filePath, file);

      if (uploadError) {
        alert("Failed to upload PDF.");
        return;
      }

      const { data } = supabase.storage
        .from("medical-reports")
        .getPublicUrl(filePath);
      fileUrl = data.publicUrl;
    }

    formData.pdf = fileUrl;

    const editId = editIndexField.value;
    if (editId && editId !== "-1") {
      const { error } = await supabase
        .from("test_results")
        .update(formData)
        .eq("id", parseInt(editId));

      if (error) {
        console.error("❌ Error updating record:", error);
        alert("❌ Failed to update record.");
        return;
      }
    } else {
      const { error } = await supabase.from("test_results").insert(formData);
      if (error) {
        console.error("❌ Error inserting record:", error);
        alert("❌ Failed to upload record.");
        return;
      }
    }

    testForm.reset();
    editIndexField.value = "";
    dashboardSelect.value = "view";
    dashboardSelect.dispatchEvent(new Event("change"));
  });

  exportBtn.addEventListener("click", () => {
    if (allRecords.length === 0) return alert("No data to export.");
    let csv = "Username,Test Name,Date,Result,Doctor Notes\n";
    allRecords.forEach(d => {
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

  async function loadTestData(page = 1) {
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("hospital", hospitalUsername)
      .order("id", { ascending: false });

    if (error) return alert("Error fetching records.");
    allRecords = data;
    currentPage = page;
    renderTable();
    renderPagination();
  }

  function renderTable() {
    testDataTable.innerHTML = "";
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    const paginated = allRecords.slice(start, start + RECORDS_PER_PAGE);

    paginated.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.username}</td>
        <td>${d.testname}</td>
        <td>${d.testdate}</td>
        <td><span class="badge bg-${getBadgeColor(d.testresult)}">${d.testresult}</span></td>
        <td>${d.doctornotes ? `<button class="btn btn-sm btn-outline-info view-notes" data-notes="${escapeHtml(d.doctornotes)}">View</button>` : '—'}</td>
        <td>${d.pdf ? `<button class="btn btn-sm btn-outline-primary view-pdf" data-pdf="${d.pdf}">View</button>` : '—'}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" onclick="editRecord(${d.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteRecord(${d.id})"><i class="fas fa-trash-alt"></i></button>
        </td>
      `;
      testDataTable.appendChild(tr);
    });

    addModalListeners();
  }

  function renderPagination() {
    pagination.innerHTML = "";
    const totalPages = Math.ceil(allRecords.length / RECORDS_PER_PAGE);
    for (let i = 1; i <= totalPages; i++) {
      const li = document.createElement("li");
      li.className = `page-item ${i === currentPage ? "active" : ""}`;
      li.innerHTML = `<a href="#" class="page-link">${i}</a>`;
      li.addEventListener("click", e => {
        e.preventDefault();
        currentPage = i;
        renderTable();
        renderPagination();
      });
      pagination.appendChild(li);
    }
  }

  window.editRecord = async function (id) {
    const record = allRecords.find(r => r.id === id);
    if (!record) return;

    document.getElementById("username").value = record.username;
    document.getElementById("testName").value = record.testname;
    document.getElementById("testDate").value = record.testdate;
    document.getElementById("testResult").value = record.testresult;
    document.getElementById("doctorNotes").value = record.doctornotes || "";
    editIndexField.value = id;

    dashboardSelect.value = "upload";
    dashboardSelect.dispatchEvent(new Event("change"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.deleteRecord = async function (id) {
    if (!confirm("Are you sure you want to delete this record?")) return;

    const { error } = await supabase.from("test_results").delete().eq("id", id);
    if (error) {
      console.error("❌ Error deleting record:", error);
      alert("❌ Failed to delete record.");
    } else {
      loadTestData(currentPage);
    }
  };

  function addModalListeners() {
    document.querySelectorAll(".view-notes").forEach(btn => {
      btn.addEventListener("click", () => {
        notesContent.textContent = btn.dataset.notes;
        notesModal.show();
      });
    });

    document.querySelectorAll(".view-pdf").forEach(btn => {
      btn.addEventListener("click", () => {
        pdfViewer.src = btn.dataset.pdf;
        pdfModal.show();
      });
    });
  }

  function getBadgeColor(result) {
    const r = result.toLowerCase();
    if (r.includes("positive")) return "danger";
    if (r.includes("negative")) return "success";
    if (r.includes("pending")) return "warning";
    return "secondary";
  }

  function escapeHtml(text) {
    return text?.replace(/[&<>"']/g, match => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[match]
    )) || "";
  }

  dashboardSelect.dispatchEvent(new Event("change"));
});
