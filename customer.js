document.addEventListener("DOMContentLoaded", function () {
    const resultsTable = document.getElementById("resultsTable");
    const hospitalSelect = document.getElementById("hospitalSelect");
    const searchBox = document.getElementById("searchBox");
    const logoutButton = document.getElementById("logoutButton");
    const darkModeToggle = document.getElementById("darkModeToggle");
    const body = document.body;

    // Retrieve logged-in user
    const loggedInUser = localStorage.getItem("loggedInUser");
    if (!loggedInUser || localStorage.getItem("userType") !== "patient") {
        alert("Unauthorized access! Redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    document.querySelector(".logo").textContent = `Welcome, ${loggedInUser}`;

    // Retrieve stored test results
    const allTestData = JSON.parse(localStorage.getItem("testResults")) || {};
    let testResults = [];

    for (const hospital in allTestData) {
        const hospitalTests = allTestData[hospital].filter(test => test.username === loggedInUser);
        testResults = testResults.concat(hospitalTests);
    }

    function populateHospitalDropdown() {
        hospitalSelect.innerHTML = '<option value="all">All Hospitals</option>';
        const hospitals = [...new Set(testResults.map(test => test.hospital))];

        hospitals.forEach(hospital => {
            const option = document.createElement("option");
            option.value = hospital;
            option.textContent = hospital;
            hospitalSelect.appendChild(option);
        });
    }

    function renderTable(filteredResults) {
        resultsTable.innerHTML = "";
        if (filteredResults.length === 0) {
            resultsTable.innerHTML = "<tr><td colspan='6'>No test results found.</td></tr>";
            return;
        }
    
        filteredResults.forEach(test => {
            const row = document.createElement("tr");
            row.classList.add("test-row");
    
            // Convert Base64 PDF to Blob URL
            let pdfUrl = "#"; 
            if (test.pdf.startsWith("data:application/pdf;base64,")) {
                const byteCharacters = atob(test.pdf.split(",")[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const pdfBlob = new Blob([byteArray], { type: "application/pdf" });
                pdfUrl = URL.createObjectURL(pdfBlob);
            } else {
                pdfUrl = test.pdf; // If it's already a valid URL
            }
    
            row.innerHTML = `
                <td class="test-name">${test.testName}</td>
                <td>${test.hospital}</td>
                <td>${test.testDate}</td>
                <td>${test.testResult}</td>
                <td><a href="${pdfUrl}" target="_blank" class="pdf-link">📄 View Report</a></td>
            `;
    
            const notesRow = document.createElement("tr");
            notesRow.classList.add("notes-row");
            notesRow.innerHTML = `<td colspan="5" class="doctor-notes">${test.doctorNotes}</td>`;
            notesRow.style.display = "none";
            notesRow.style.opacity = "0";
            notesRow.style.transition = "max-height 0.3s ease-in-out, opacity 0.3s ease-in-out";
            notesRow.style.overflow = "hidden";
            notesRow.style.maxHeight = "0";
    
            // Show/hide doctor's notes on click
            row.addEventListener("click", function () {
                if (notesRow.style.maxHeight === "0px" || notesRow.style.maxHeight === "") {
                    notesRow.style.display = "table-row";
                    setTimeout(() => {
                        notesRow.style.maxHeight = "100px";
                        notesRow.style.opacity = "1";
                    }, 5);
                } else {
                    notesRow.style.maxHeight = "0";
                    notesRow.style.opacity = "0";
                    setTimeout(() => (notesRow.style.display = "none"), 300);
                }
            });
    
            resultsTable.appendChild(row);
            resultsTable.appendChild(notesRow);
        });
    }
    
    function filterResults() {
        const selectedHospital = hospitalSelect.value;
        const searchQuery = searchBox.value.toLowerCase();
    
        let filteredResults = testResults;
    
        if (selectedHospital !== "all") {
            filteredResults = filteredResults.filter(test => test.hospital === selectedHospital);
        }
    
        if (searchQuery) {
            filteredResults = filteredResults.filter(test =>
                test.testName.toLowerCase().includes(searchQuery)
            );
        }
    
        renderTable(filteredResults);
    }

    // Dark Mode Toggle
    darkModeToggle.addEventListener("click", function () {
        body.classList.toggle("dark-mode");
        localStorage.setItem("darkMode", body.classList.contains("dark-mode"));
    });

    // Apply saved dark mode preference
    if (localStorage.getItem("darkMode") === "true") {
        body.classList.add("dark-mode");
    }

    // Logout Button
    logoutButton.addEventListener("click", function () {
        localStorage.removeItem("loggedInUser"); // Do NOT remove "testResults"
        window.location.href = "index.html";
    });

    populateHospitalDropdown();
    renderTable(testResults);

    hospitalSelect.addEventListener("change", filterResults);
    searchBox.addEventListener("input", filterResults);
});
