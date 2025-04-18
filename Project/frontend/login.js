document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const userType = document.getElementById("userType").value;
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      alert("❌ Please enter both username and password.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, userType })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`❌ ${result.error}`);
        return;
      }

      // ✅ Store session
      localStorage.setItem("username", result.username);
      localStorage.setItem("userType", result.userType);

      alert(`✅ Welcome, ${result.username}! Redirecting...`);

      if (userType === "patient") {
        window.location.href = "customer.html";
      } else if (userType === "hospital") {
        localStorage.setItem("loggedInHospital", result.username);
        window.location.href = "hospital.html";
      } else {
        alert("❌ Unknown user type.");
      }

    } catch (error) {
      console.error("❌ Login request failed:", error);
      alert("❌ Server error. Please try again.");
    }
  });
});
