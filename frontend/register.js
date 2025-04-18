document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ register.js loaded!");

    const form = document.getElementById("register-form");
    const message = document.getElementById("message");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        message.textContent = "";
        message.style.color = "red";

        const userType = document.getElementById("userType").value;
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        // Frontend validation
        if (!userType || !username || !email || !password || !confirmPassword) {
            message.textContent = "All fields are required!";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match!";
            return;
        }

        try {
            const response = await fetch("https://hospital-test-management.onrender.com/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userType, username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                message.textContent = data.error || "Registration failed!";
                return;
            }
            alert("Please confirm your email sent to your inbox before logging in");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 1500);
        } catch (err) {
            console.error("❌ Error:", err);
            message.textContent = "Something went wrong!";
        }
    });
});
