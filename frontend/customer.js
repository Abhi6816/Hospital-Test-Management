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
const API_BASE_URL = "https://hospital-test-management.onrender.com";

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

  // Elements
  const elements = {
    userNameDisplay: document.getElementById("userNameDisplay"),
    welcomeUserName: document.getElementById("welcomeUserName"),
    searchBox: document.getElementById("searchBox"),
    statusSelect: document.getElementById("statusSelect"),
    resultsCards: document.getElementById("resultsCards"),
    darkModeToggle: document.getElementById("darkModeToggle"),
    logoutButton: document.getElementById("logoutButton"),
    dashboardSection: document.getElementById("dashboardSection"),
    resultsSection: document.getElementById("resultsSection"),
    detailsSection: document.getElementById("detailsSection"),
    totalTests: document.getElementById("totalTests"),
    normalResults: document.getElementById("normalResults"),
    abnormalResults: document.getElementById("abnormalResults"),
    criticalResults: document.getElementById("criticalResults"),
    recentTestResults: document.getElementById("recentTestResults"),
    recentLoading: document.getElementById("recentLoading"),
    navLinks: document.querySelectorAll(".nav-link"),
    viewAllTests: document.querySelector(".view-all-tests"),
    backToResults: document.querySelector(".back-to-results"),
    detailsTestName: document.getElementById("detailsTestName"),
    detailsTestStatus: document.getElementById("detailsTestStatus"),
    detailsPatientInfo: document.getElementById("detailsPatientInfo"),
    detailsPatientName: document.getElementById("detailsPatientName"),
    detailsTestDate: document.getElementById("detailsTestDate"),
    detailsDoctorNotes: document.getElementById("detailsDoctorNotes"),
    viewPdfButton: document.getElementById("viewPdfButton"),
    aiAnalysisContent: document.getElementById("aiAnalysisContent"),
    generateAnalysisButton: document.getElementById("generateAnalysisButton"),
    analyzeNowButton: document.getElementById("analyzeNowButton"),
    pdfViewer: document.getElementById("pdfViewer"),
  };

  // Display username
  elements.userNameDisplay.textContent = username;
  elements.welcomeUserName.textContent = username;

  // Dark mode
  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    elements.darkModeToggle.querySelector("i").classList.replace("fa-moon", "fa-sun");
  }

  elements.darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark ? "enabled" : "disabled");
    elements.darkModeToggle.querySelector("i").classList.replace(isDark ? "fa-moon" : "fa-sun", isDark ? "fa-sun" : "fa-moon");
  });

  // Logout
  elements.logoutButton.addEventListener("click", () => {
    localStorage.clear();
    setTimeout(() => window.location.href = "index.html", 1000);
  });

  // Show section
  function showSection(section) {
    elements.dashboardSection.style.display = section === 'dashboard' ? 'block' : 'none';
    elements.resultsSection.style.display = section === 'results' ? 'block' : 'none';
    elements.detailsSection.style.display = section === 'details' ? 'block' : 'none';
    elements.navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.section === section) link.classList.add('active');
    });
  }

  // Event listeners
  elements.navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  elements.viewAllTests.addEventListener("click", (e) => {
    e.preventDefault();
    showSection('results');
  });

  elements.backToResults.addEventListener("click", (e) => {
    e.preventDefault();
    showSection('results');
  });

  elements.searchBox.addEventListener("input", () => {
    renderResultsCards();
  });

  elements.statusSelect.addEventListener("change", () => {
    renderResultsCards();
  });

  // Data
  let allData = [];
  let currentRecord = null;

  // Fetch data
  async function fetchData() {
    try {
      elements.recentLoading.classList.remove('d-none');
      const response = await fetch(`${API_BASE_URL}/api/test-results?username=${username}`);
      if (!response.ok) {
        return;
      }
      allData = await response.json();

      // Update health summary
      elements.totalTests.textContent = allData.length;
      elements.normalResults.textContent = allData.filter(d => d.testresult?.toLowerCase() === 'negative').length;
      elements.abnormalResults.textContent = allData.filter(d => d.testresult?.toLowerCase() === 'inconclusive').length;
      elements.criticalResults.textContent = allData.filter(d => d.testresult?.toLowerCase() === 'positive').length;

      renderRecentTests();
      renderResultsCards();
    } catch (error) {
      console.error(error);
    } finally {
      elements.recentLoading.classList.add('d-none');
    }
  }

  // Badge color
  function getBadgeColor(testResult) {
    switch (testResult?.toLowerCase()) {
      case 'normal': return 'success';
      case 'positive': return 'danger';
      case 'negative': return 'success';
      case 'pending': return 'warning';
      default: return 'secondary';
    }
  }

  // Normalize result for filtering
  function normalizeResult(result) {
    if (!result) return 'pending';
    const lower = result.toLowerCase();
    if (['normal', 'negative'].includes(lower)) return 'normal';
    if (['positive', 'inconclusive'].includes(lower)) return 'abnormal';
    return 'pending';
  }

  // Render recent tests
    function renderRecentTests() {
    elements.recentTestResults.innerHTML = "";
    const recentData = allData.slice(0, 3);
    if (!recentData.length) {
      elements.recentTestResults.innerHTML = `<li class="list-group-item text-center text-muted">No recent tests found.</li>`;
      return;
    }

    recentData.forEach(d => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.innerHTML = `
        <div>
          <strong>${d.testname || '—'}</strong><br>
          <small>Test date: ${d.testdate || '—'}</small>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge bg-${getBadgeColor(d.testresult)}">${d.testresult || '—'}</span>
          <button class="btn btn-sm btn-outline-black view-record" data-id="${d.id || ''}">View</button>
        </div>
      `;
      elements.recentTestResults.appendChild(li);
    });

    attachRecentTestListeners();
  }

  // Filter data
  function filteredData() {
    const searchTerm = elements.searchBox.value.toLowerCase();
    const selectedStatus = elements.statusSelect.value;

    return allData.filter(d => {
      const matchesSearch = d.testname?.toLowerCase().includes(searchTerm);
      const matchesStatus = selectedStatus === 'all' || normalizeResult(d.testresult) === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  // Render results cards
  function renderResultsCards() {
    const data = filteredData();
    elements.resultsCards.innerHTML = "";

    if (!data.length) {
      elements.resultsCards.innerHTML = `<div class="col-12 text-center text-muted">No matching results.</div>`;
      return;
    }

    data.forEach(d => {
      const card = document.createElement("div");
      card.className = "col-md-6 mb-4";
      card.innerHTML = `
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="card-title mb-0">${d.testname || '—'}</h6>
              <span class="badge bg-${getBadgeColor(d.testresult)}">${normalizeResult(d.testresult).charAt(0).toUpperCase() + normalizeResult(d.testresult).slice(1)}</span>
            </div>
            <p class="card-text mb-3"><i class="fas fa-calendar-alt me-1"></i> Test Date: ${d.testdate || '—'}</p>
            <button class="btn btn-outline-primary btn-sm mt-auto view-record" data-id="${d.id || ''}">View Details</button>
          </div>
        </div>
      `;
      elements.resultsCards.appendChild(card);
    });

    attachRecentTestListeners();
  }

  // Listeners for view buttons
  function attachRecentTestListeners() {
    document.querySelectorAll(".view-record").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const record = allData.find(r => r.id == id);
        if (!record) {
          return;
        }

        currentRecord = record;
        showSection('details');

        // Populate Test Details section
        elements.detailsTestName.textContent = record.testname || '—';
        elements.detailsTestStatus.textContent = normalizeResult(record.testresult).charAt(0).toUpperCase() + normalizeResult(record.testresult).slice(1);
        elements.detailsTestStatus.className = `badge bg-${getBadgeColor(record.testresult)}`;
        elements.detailsPatientName.textContent = username;
        elements.detailsTestDate.textContent = record.testdate || '—';
        elements.detailsDoctorNotes.textContent = record.doctornotes || 'No notes available.';
        if (record.pdf) {
          elements.viewPdfButton.classList.remove('disabled');
          elements.pdfViewer.src = record.pdf;
        } else {
          elements.viewPdfButton.classList.add('disabled');
          elements.pdfViewer.src = '';
        }

        // Reset AI Analysis section
        elements.aiAnalysisContent.innerHTML = `
          <i class="fas fa-flask fa-3x text-muted mb-3"></i>
          <p class="text-muted">No Analysis Available</p>
          <p class="text-muted">Get an AI-powered analysis of your test results with explanations in simple language.</p>
          <button id="generateAnalysisButton" class="btn btn-primary">Generate Analysis</button>
        `;
        const newGenerateButton = elements.aiAnalysisContent.querySelector("#generateAnalysisButton");
        newGenerateButton.addEventListener("click", handleGenerateAnalysis);
      });
    });

    elements.analyzeNowButton.addEventListener("click", handleGenerateAnalysis);

    async function handleGenerateAnalysis() {
      if (!currentRecord) {
        return;
      }

      if (!currentRecord.pdf) {
        elements.aiAnalysisContent.innerHTML = `<p style="white-space: pre-line;">No PDF available for analysis.</p>`;
        return;
      }

      elements.analyzeNowButton.disabled = true;
      elements.aiAnalysisContent.innerHTML = `
        <div class="ai-loading">
          <i class="fas fa-robot fa-3x mb-3"></i>
          <p>Analyzing your test results...</p>
        </div>
      `;

      const textToAnalyze = await extractTextFromPDF(currentRecord.pdf);
      if (!textToAnalyze) {
        elements.aiAnalysisContent.innerHTML = `<p style="white-space: pre-line;">Unable to extract text from PDF.</p>`;
        elements.analyzeNowButton.disabled = false;
        return;
      }

      const analysis = await getAIAnalysis(textToAnalyze);
      elements.aiAnalysisContent.innerHTML = `<p style="white-space: pre-line;">${analysis}</p>`;
      elements.analyzeNowButton.disabled = false;
    }
  }

  // Extract PDF text
  async function extractTextFromPDF(pdfUrl) {
    try {
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
    } catch (error) {
      console.error("❌ PDF Extraction Error:", error);
      return null;
    }
  }

  // AI Analysis
  async function getAIAnalysis(text) {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
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
      if (data.candidates && data.candidates.length > 0) {
        const content = data.candidates[0]?.content?.parts?.[0]?.text;
        return content || "Analysis received, but it's empty.";
      }

      return "No valid AI analysis received.";
    } catch (error) {
      console.error("❌ AI Analysis Fetch Error:", error);
      return "Error occurred while analyzing the report.";
    }
  }

  // Initialize
  showSection('dashboard');
  fetchData();
});