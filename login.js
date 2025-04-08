document.addEventListener("DOMContentLoaded", async function () {
    // ✅ Initialize Supabase
    const SUPABASE_URL = "https://mcfkgnvjeexmzoxnsanm.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZmtnbnZqZWV4bXpveG5zYW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MjI4MDksImV4cCI6MjA1NjM5ODgwOX0.uZIIiZ16TAu9Gqye4Xp2z65nIEjGBETfwWSba_2fnCw";

    if (typeof supabase === "undefined") {
        console.error("❌ Supabase is not defined. Ensure supabase-js is loaded before login.js.");
        return;
    }

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase initialized successfully");

    // ✅ Handle User Login
    async function validateLogin(event) {
        event.preventDefault();

        // ✅ Get form values
        const userType = document.getElementById("userType").value;
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        // ✅ Validate input
        if (!username || !password) {
            alert("❌ Please enter both username and password.");
            return;
        }

        // ✅ Fetch user details by username
        const { data: userRecord, error: userFetchError } = await supabaseClient
            .from("users")
            .select("email, username")  // Fetch both email & username
            .eq("username", username)
            .single();

        if (userFetchError) {
            console.error("🔍 Username fetch error:", userFetchError);
            alert("❌ User not found. Please check your username.");
            return;
        }

        // ✅ Attempt to log in using the fetched email
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: userRecord.email,
            password: password
        });

        if (error) {
            console.error("❌ Login error:", error);
            alert("❌ Invalid username or password. Please try again.");
            return;
        }

        // ✅ Store login details in localStorage
        localStorage.setItem("loggedInUser", userRecord.email);
        localStorage.setItem("username", username); // Store the username
        localStorage.setItem("userType", userType);

        alert(`✅ Welcome, ${userRecord.username}! Redirecting to dashboard...`);

        // ✅ Redirect based on user type
        if (userType === "patient") {
            window.location.href = "customer.html";
        } else {
            localStorage.setItem("loggedInHospital", userRecord.email);
            window.location.href = "hospital.html";
        }
    }

    // ✅ Attach event listener to login form
    const loginForm = document.getElementById("login-form");
    loginForm.addEventListener("submit", validateLogin);
});
