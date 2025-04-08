document.addEventListener("DOMContentLoaded", async function () {
  console.log("✅ Register.js loaded successfully!");

  // ✅ Initialize Supabase
  const SUPABASE_URL = "https://mcfkgnvjeexmzoxnsanm.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZmtnbnZqZWV4bXpveG5zYW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4MjI4MDksImV4cCI6MjA1NjM5ODgwOX0.uZIIiZ16TAu9Gqye4Xp2z65nIEjGBETfwWSba_2fnCw"; // Replace with your actual key

  if (typeof supabase === "undefined") {
      console.error("❌ Supabase is not defined. Ensure supabase-js is loaded before register.js.");
      return;
  }

  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log("✅ Supabase initialized successfully!");

  // ✅ Handle User Registration
  async function handleRegistration(event) {
      event.preventDefault();
      console.log("🔍 Register button clicked!");

      // ✅ Get form values
      const userType = document.getElementById("userType").value;
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value.trim();
      const confirmPassword = document.getElementById("confirm-password").value.trim();

      // ✅ Validate inputs
      if (!username || !email || !password || !confirmPassword) {
          alert("❌ All fields are required!");
          return;
      }

      if (password !== confirmPassword) {
          alert("❌ Passwords do not match. Please try again.");
          return;
      }

      console.log(`👤 Registering user: ${username} (${email}) as ${userType}`);

      // ✅ Check if username exists
      const { data: existingUser, error: checkError } = await supabaseClient
          .from("users")
          .select("username")
          .eq("username", username)
          .single();

      if (existingUser) {
          alert("❌ Username already exists. Please choose a different one.");
          return;
      }

      // ✅ Register user in Supabase Authentication
      const { data, error } = await supabaseClient.auth.signUp({
          email: email,
          password: password
      });

      if (error) {
          console.error("❌ Registration Error:", error);
          alert("❌ " + error.message);
          return;
      }

      console.log("✅ User registered successfully!");

      // ✅ Insert user details into the "users" table
      const { error: insertError } = await supabaseClient
          .from("users")
          .insert([{ id: data.user.id, username: username, email: email, user_type: userType }]);

      if (insertError) {
          console.error("❌ Database Insert Error:", insertError);
          alert("❌ Registration failed. Please try again.");
          return;
      }

      alert("✅ Registration successful! Please check your email for verification.");
      console.log("✅ User details saved in database!");

      // ✅ Redirect to login page
      window.location.href = "login.html";
  }

  // ✅ Attach event listener to form
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
      registerForm.addEventListener("submit", handleRegistration);
      console.log("✅ Event listener attached to register form!");
  } else {
      console.error("❌ Register form not found!");
  }
});
