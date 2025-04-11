// ✅ Import Supabase Client from CDN
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// ✅ Supabase Project Credentials
const SUPABASE_URL = "https://mcfkgnvjeexmzoxnsanm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZmtnbnZqZWV4bXpveG5zYW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MjI4MDksImV4cCI6MjA1NjM5ODgwOX0.uZIIiZ16TAu9Gqye4Xp2z65nIEjGBETfwWSba_2fnCw"; // ← use your real key

// ✅ Create Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("✅ Supabase client initialized");

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

    // 🔍 Get user email using username
    const { data: userRecord, error: userFetchError } = await supabase
      .from("users")
      .select("email, username, user_type")
      .eq("username", username)
      .single();

    if (userFetchError || !userRecord) {
      console.error("🔍 Username fetch error:", userFetchError);
      alert("❌ User not found. Please check your username.");
      return;
    }

    // ✅ Verify role from database
    if (userRecord.user_type !== userType) {
      alert(`❌ Access denied: You are registered as a ${userRecord.type}, not a ${userType}.`);
      return;
    }

    // 🔐 Attempt login
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: userRecord.email,
      password: password,
    });

    if (loginError) {
      console.error("❌ Login error:", loginError);
      alert("❌ Invalid username or password.");
      return;
    }

    // ✅ Store session
    localStorage.setItem("username", userRecord.username);
    localStorage.setItem("userType", userType);

    alert(`✅ Welcome, ${userRecord.username}! Redirecting...`);

    if (userType === "patient") {
      window.location.href = "customer.html";
    } else if (userType === "hospital") {
      localStorage.setItem("loggedInHospital", userRecord.username);
      window.location.href = "hospital.html";
    } else {
      alert("❌ Unknown user type.");
    }
  });
});
