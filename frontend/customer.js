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

document.addEventListener("DOMContentLoaded", async () => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.13.216/pdf.worker.min.js";

  // Check if the user is logged in
  const username = localStorage.getItem("username");
  const userType = localStorage.getItem("userType");

  if (!username || userType !== "patient") {
    alert("⚠️ Unauthorized access. Please login again.");
    window.location.href = "index.html";
    return;
  }

  // Display username
  document.getElementById("userNameDisplay").textContent = username;

  const hospitalSelect = document.getElementById("hospitalSelect");
  const searchBox = document.getElementById("searchBox");
  const resultsTable = document.getElementById("resultsTable");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const logoutButton = document.getElementById("logoutButton");

  // Define showToast function
  function showToast(message) {
    const toast = document.getElementById("mainToast");
    toast.querySelector(".toast-body").textContent = message;
    bootstrap.Toast.getOrCreateInstance(toast).show();
  }
  

  // Handle dark mode
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

  // Logout functionality
  logoutButton.addEventListener("click", () => {
    localStorage.clear();
    showToast("👋 Logged out.");
    setTimeout(() => window.location.href = "index.html", 1000);
  });

  // Event listeners for the search box and hospital filter
  searchBox.addEventListener("input", renderTable);
  hospitalSelect.addEventListener("change", renderTable);

  let allData = [];

  // Fetch test data from the backend API
  async function fetchData() {
    const response = await fetch(`https://hospital-test-management.onrender.com/api/test-results?username=${username}`);
    
    if (!response.ok) {
      showToast("❌ Failed to load test results.");
      return;
    }

    const data = await response.json();
    allData = data;

    // Populate hospital select dropdown
    const hospitals = [...new Set(data.map(d => d.hospital))];
    hospitalSelect.innerHTML = `<option value="all">All Hospitals</option>`;
    hospitals.forEach(hospital => {
      hospitalSelect.innerHTML += `<option value="${hospital}">${hospital}</option>`;
    });

    renderTable();
  }

  // Define the getBadgeColor function
  function getBadgeColor(testResult) {
    switch (testResult.toLowerCase()) {
      case 'normal': return 'success';
      case 'positive': return 'danger';
      case 'negative': return 'success';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  }

  // Render the test results in the table
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
            ? `<button class="btn btn-sm btn-outline-info view-notes" data-notes="${escapeHtml(d.doctornotes)}">
                <i class="fas fa-notes-medical me-1"></i>Doctor Notes</button>`
            : '—'}
        </td>
        <td>
          ${d.pdf
            ? `<button class="btn btn-sm btn-outline-primary view-pdf" data-pdf="${d.pdf}">
                <i class="fas fa-file-pdf me-1"></i>View PDF</button>`
            : '—'}
        </td>
        <td>
          <button class="btn btn-sm btn-outline-success analyze-report" data-pdf="${d.pdf || ''}">
            <i class="fas fa-brain me-1"></i>AI Analysis
          </button>
        </td>
      `;
      resultsTable.appendChild(tr);
    });

    attachModalListeners();
  }

  // Attach events to buttons for viewing notes, PDFs, and AI analysis
  function attachModalListeners() {
    document.querySelectorAll(".view-pdf").forEach(btn => {
      btn.addEventListener("click", () => {
        const pdfViewer = document.getElementById("pdfViewer");
        pdfViewer.src = btn.dataset.pdf;
        bootstrap.Modal.getOrCreateInstance(document.getElementById("pdfModal")).show();
      });
    });

    document.querySelectorAll(".analyze-report").forEach(btn => {
      btn.addEventListener("click", async () => {
        showToast("⏳ Extracting & Analyzing Report...");

        const pdfUrl = btn.dataset.pdf;

        if (pdfUrl) {
          const contentToAnalyze = await extractTextFromPDF(pdfUrl);

          if (!contentToAnalyze) {
            showToast("⚠️ No data found for analysis.");
            return;
          }

          const analysis = await getAIAnalysis(contentToAnalyze);

          // Change Modal Heading to AI Analysis
          document.getElementById("notesModalLabel").textContent = "AI Analysis";

          const notesContent = document.getElementById("notesContent");
          notesContent.textContent = analysis;
          bootstrap.Modal.getOrCreateInstance(document.getElementById("notesModal")).show();
        } else {
          showToast("No PDF available for analysis.");
        }
      });
    });
    document.querySelectorAll(".view-notes").forEach(btn => {
      btn.addEventListener("click", () => {
        const notes = btn.dataset.notes;
        document.getElementById("notesModalLabel").textContent = "Doctor Notes";
        document.getElementById("notesContent").textContent = notes;
        bootstrap.Modal.getOrCreateInstance(document.getElementById("notesModal")).show();
      });
    });
  }

  async function extractTextFromPDF(pdfUrl) {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let textContent = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textContent += content.items.map(item => item.str).join(' ');
    }

    return textContent;
  }

  // Placeholder AI Analysis function
  async function getAIAnalysis(text) {
    try {
      const response = await fetch("https://hospital-test-management.onrender.com/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });
  
      if (!response.ok) {
        throw new Error("Server error while analyzing report.");
      }
  
      const data = await response.json();
  
      // Check if Gemini returned a valid response
      if (data.candidates && data.candidates.length > 0) {
        const content = data.candidates[0]?.content?.parts?.[0]?.text;
        return content || "⚠️ Analysis received, but it's empty.";
      }
  
      return "⚠️ No valid AI analysis received.";
    } catch (error) {
      console.error("❌ AI Analysis Fetch Error:", error);
      return "❌ Error occurred while analyzing the report.";
    }
  }
  
  

  // Initialize the data fetching process
  fetchData();
});
