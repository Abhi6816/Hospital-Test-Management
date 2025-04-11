import { supabase } from './login.js';

document.addEventListener("DOMContentLoaded", async () => {
  const username = localStorage.getItem("username");
  const userType = localStorage.getItem("userType");

  if (!username || userType !== "patient") {
    alert("⚠️ Unauthorized access. Please login again.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("userNameDisplay").textContent = username;

  const hospitalSelect = document.getElementById("hospitalSelect");
  const searchBox = document.getElementById("searchBox");
  const resultsTable = document.getElementById("resultsTable");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const logoutButton = document.getElementById("logoutButton");

  insertModalsAndToast();

  // 🔄 Dark Mode State
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    darkModeToggle.querySelector("i").classList.replace("fa-moon", "fa-sun");
  }

  darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    darkModeToggle.querySelector("i").classList.replace(isDark ? "fa-moon" : "fa-sun", isDark ? "fa-sun" : "fa-moon");
  });

  logoutButton.addEventListener("click", () => {
    localStorage.clear();
    showToast("👋 Logged out.");
    setTimeout(() => window.location.href = "index.html", 1000);
  });

  searchBox.addEventListener("input", renderTable);
  hospitalSelect.addEventListener("change", renderTable);

  let allData = [];

  // 📦 Fetch Test Results
  async function fetchData() {
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("username", username)
      .order("id", { ascending: false });

    if (error) {
      console.error("❌ Supabase fetch error:", error);
      showToast("❌ Failed to load test results.");
      return;
    }

    allData = data;

    const hospitals = [...new Set(data.map(d => d.hospital))];
    hospitalSelect.innerHTML = `<option value="all">All Hospitals</option>`;
    hospitals.forEach(hospital => {
      hospitalSelect.innerHTML += `<option value="${hospital}">${hospital}</option>`;
    });

    renderTable();
  }

  // 🧾 Render Table Data
  function renderTable() {
    const searchTerm = searchBox.value.toLowerCase();
    const selectedHospital = hospitalSelect.value;
    resultsTable.innerHTML = "";

    const filtered = allData.filter(d =>
      d.testname?.toLowerCase().includes(searchTerm) &&
      (selectedHospital === "all" || d.hospital === selectedHospital)
    );

    if (!filtered.length) {
      resultsTable.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No matching results.</td></tr>`;
      return;
    }

    filtered.forEach(d => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.testname}</td>
        <td>${d.hospital}</td>
        <td>${d.testdate}</td>
        <td><span class="badge bg-${getBadgeColor(d.testresult)}">${d.testresult}</span></td>
        <td>
          ${d.doctornotes
            ? `<button class="btn btn-sm btn-outline-info view-notes" data-notes="${escapeHtml(d.doctornotes)}"><i class="fas fa-notes-medical me-1"></i>Notes</button>`
            : '—'}
        </td>
        <td>
          ${d.pdf
            ? `<button class="btn btn-sm btn-outline-primary view-pdf" data-pdf="${d.pdf}"><i class="fas fa-file-pdf me-1"></i>View</button>`
            : '—'}
        </td>
      `;
      resultsTable.appendChild(tr);
    });

    attachModalListeners();
  }

  // 🧠 Attach Events to Buttons
  function attachModalListeners() {
    document.querySelectorAll(".view-pdf").forEach(btn => {
      btn.addEventListener("click", () => {
        const pdfViewer = document.getElementById("pdfViewer");
        pdfViewer.src = btn.dataset.pdf;
        bootstrap.Modal.getOrCreateInstance(document.getElementById("pdfModal")).show();
      });
    });

    document.querySelectorAll(".view-notes").forEach(btn => {
      btn.addEventListener("click", () => {
        const notesContent = document.getElementById("notesContent");
        notesContent.textContent = btn.dataset.notes;
        bootstrap.Modal.getOrCreateInstance(document.getElementById("notesModal")).show();
      });
    });
  }

  // 🎨 Badge color
  function getBadgeColor(result) {
    const r = result?.toLowerCase();
    if (r.includes("positive")) return "danger";
    if (r.includes("negative")) return "success";
    if (r.includes("pending")) return "warning";
    return "secondary";
  }

  // 🔒 Escape HTML
  function escapeHtml(text) {
    return text?.replace(/[&<>"']/g, match => ({
      '&': "&amp;", '<': "&lt;", '>': "&gt;", '"': "&quot;", "'": "&#039;"
    })[match]) || "";
  }

  // 🔔 Show Toast
  function showToast(message) {
    const toast = document.getElementById("mainToast");
    toast.querySelector(".toast-body").textContent = message;
    bootstrap.Toast.getOrCreateInstance(toast).show();
  }

  // 🧩 Inject Modals & Toast
  function insertModalsAndToast() {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1055">
        <div class="toast align-items-center text-white bg-dark border-0" role="alert" id="mainToast" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">Message</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
        </div>
      </div>

      <div class="modal fade" id="pdfModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">PDF Report</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0">
              <iframe id="pdfViewer" style="width:100%; height:75vh; border:none;"></iframe>
            </div>
          </div>
        </div>
      </div>

      <div class="modal fade" id="notesModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">Doctor Notes</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p id="notesContent" style="white-space: pre-wrap;" class="mb-0"></p>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  // 🚀 Init
  fetchData();
});
