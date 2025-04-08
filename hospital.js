document.addEventListener("DOMContentLoaded", () => {
    const hospitalName = localStorage.getItem("loggedInHospital") || "Unknown Hospital";
    document.getElementById("hospitalName").textContent = hospitalName;

    const testForm = document.getElementById("testForm");
    const testDataTable = document.querySelector("#testDataTable tbody");
    const dashboardSelect = document.getElementById("dashboardSelect");
    const uploadSection = document.getElementById("uploadSection");
    const viewSection = document.getElementById("viewSection");
    const darkModeToggle = document.getElementById("darkModeToggle");
    const body = document.body;

    if (localStorage.getItem("darkMode") === "enabled") {
        body.classList.add("dark-mode");
        darkModeToggle.classList.add("active");
    } else {
        darkModeToggle.classList.remove("active");
    }

    darkModeToggle.addEventListener("click", () => {
        body.classList.toggle("dark-mode");
        darkModeToggle.classList.toggle("active");
        localStorage.setItem("darkMode", body.classList.contains("dark-mode") ? "enabled" : "disabled");
    });

    function loadTestData() {
        testDataTable.innerHTML = "";
        const allTestData = JSON.parse(localStorage.getItem("testResults")) || {};
        const hospitalData = allTestData[hospitalName] || [];

        hospitalData.forEach((test) => {
            addRowToTable(test);
        });
    }

    function addRowToTable(test) {
        const row = document.createElement("tr");
        row.classList.add("test-row");

        let pdfUrl = test.pdf.startsWith("data:application/pdf;base64,") ? URL.createObjectURL(new Blob([new Uint8Array(atob(test.pdf.split(",")[1]).split("").map(char => char.charCodeAt(0)))], { type: "application/pdf" })) : test.pdf;

        row.innerHTML = `
            <td>${test.username}</td>
            <td class="test-name">${test.testName}</td>
            <td>${test.testDate}</td>
            <td>${test.testResult}</td>
            <td>${test.doctorNotes}</td>
            <td><a href="${pdfUrl}" target="_blank" class="pdf-link">View PDF</a></td>
            <td><button class="delete-btn">Delete</button></td>
        `;

        testDataTable.appendChild(row);
    }

    testForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const testName = document.getElementById("testName").value;
        const testDate = document.getElementById("testDate").value;
        const testResult = document.getElementById("testResult").value;
        const doctorNotes = document.getElementById("doctorNotes").value;
        const testPdf = document.getElementById("testPdf").files[0];

        if (testPdf) {
            const reader = new FileReader();
            reader.readAsDataURL(testPdf);
            reader.onload = function () {
                saveTestData(username, testName, testDate, testResult, doctorNotes, reader.result);
            };
        } else {
            saveTestData(username, testName, testDate, testResult, doctorNotes, "");
        }
    });

    function saveTestData(username, testName, testDate, testResult, doctorNotes, pdf) {
        const allTestData = JSON.parse(localStorage.getItem("testResults")) || {};
        allTestData[hospitalName] = allTestData[hospitalName] || [];

        const testEntry = { username, testName, testDate, testResult, doctorNotes, pdf, hospital: hospitalName };
        allTestData[hospitalName].push(testEntry);

        localStorage.setItem("testResults", JSON.stringify(allTestData));
        addRowToTable(testEntry);
        testForm.reset();
    }

    testDataTable.addEventListener("click", (event) => {
        if (event.target.classList.contains("delete-btn")) {
            const row = event.target.closest("tr");
            const username = row.children[0].textContent;
            const testName = row.children[1].textContent;

            let allTestData = JSON.parse(localStorage.getItem("testResults")) || {};
            allTestData[hospitalName] = allTestData[hospitalName].filter(
                (test) => !(test.username === username && test.testName === testName)
            );

            localStorage.setItem("testResults", JSON.stringify(allTestData));
            row.remove();
        }
    });

    dashboardSelect.addEventListener("change", (event) => {
        if (event.target.value === "upload") {
            uploadSection.style.display = "block";
            viewSection.style.display = "none";
        } else {
            uploadSection.style.display = "none";
            viewSection.style.display = "block";
        }
    });

    document.getElementById("logoutButton").addEventListener("click", () => {
        localStorage.removeItem("loggedInHospital");
        window.location.href = "login.html";
    });

    loadTestData();
});
