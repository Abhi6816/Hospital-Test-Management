document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ register.js loaded!");

    const SUPABASE_URL = "https://mcfkgnvjeexmzoxnsanm.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZmtnbnZqZWV4bXpveG5zYW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MjI4MDksImV4cCI6MjA1NjM5ODgwOX0.uZIIiZ16TAu9Gqye4Xp2z65nIEjGBETfwWSba_2fnCw";

    if (typeof supabase === "undefined") {
        console.error("❌ Supabase is not defined! Please include supabase-js CDN before this script.");
        return;
    }

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase connected...");

    const form = document.getElementById("register-form");
    const message = document.getElementById("message");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const userType = document.getElementById("userType").value;
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        // Validation
        if (!userType || !username || !email || !password || !confirmPassword) {
            message.textContent = "All fields are required!";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match!";
            return;
        }

        // Register user with Supabase Auth
        const { user, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error("❌ Error:", error.message);
            message.textContent = error.message;
            return;
        }
        
        // Insert extra user data into 'users' table
        const { data, error: insertError } = await supabaseClient
            .from("users")
            .insert([
                {
                    email: email,
                    username: username,
                    user_type: userType // Correct field name in Supabase
                },
            ]);

        if (insertError) {
            console.error("❌ Error:", insertError.message);
            message.textContent = insertError.message;
            return;
        }

        console.log("✅ User registered & data inserted successfully.");
        alert("A confirmation email has been sent to your inbox. Please confirm your email before logging in.");
        window.location.href = "index.html"; // Redirect to login page
    });
});
