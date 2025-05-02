require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const PORT = 5000;

// 🔐 Load from .env
const GEMINI_API_URL = process.env.GEMINI_API_URL;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

// ✅ Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);

// 📌 Analyze medical report using Gemini
app.post('/analyze', async (req, res) => {
  const { text } = req.body;

  try {
    // Make the request to Gemini API for analysis
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an experienced medical expert and pathologist.

Analyze the following medical report values carefully and provide a detailed health analysis for the patient in simple, easy-to-understand language.

Health Analysis

For each value in the report, explain whether it is normal, high, or low. If a value is abnormal (either high or low), describe what this means for the patient's health and what conditions it might indicate.

Recommendations

Based on the report values, provide suggestions or recommendations to improve the patient's health if needed. Focus on practical steps the patient can take or further tests that might be necessary.

Important Notes

Do not include any location, lab name, patient details, or extra information beyond the medical report values.
Focus only on the health analysis and recommendations based on the provided values.
Medical Report:
${text}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    res.json(data); // Return the analysis result

  } catch (error) {
    console.error('❌ Error analyzing report:', error);
    res.status(500).json({ error: 'Internal Server Error while analyzing the report.' });
  }
});

// 🔐 Login route
app.post('/api/login', async (req, res) => {
  const { username, password, userType } = req.body;

  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('email, username, user_type')
      .eq('username', username)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check the user type
    if (user.user_type !== userType) {
      return res.status(403).json({ error: `Access denied. You are registered as ${user.user_type}.` });
    }

    // Perform login using Supabase auth
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (loginError) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    return res.json({
      message: 'Login successful',
      username: user.username,
      userType: user.user_type
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// 📝 Register route
app.post('/register', async (req, res) => {
  const { userType, username, email, password } = req.body;

  if (!userType || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required!' });
  }

  try {
    // Step 1: Supabase auth signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      return res.status(400).json({ error: signUpError.message });
    }

    // Step 2: Insert user profile data into the 'users' table
    const { error: insertError } = await supabase.from('users').insert([{
      email,
      username,
      user_type: userType
    }]);


    if (insertError) {
      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({ message: 'Registration successful' });

  } catch (err) {
    console.error('❌ Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// 🧪 Fetch test results for a given user from Supabase
app.get('/api/test-results', async (req, res) => {
  const { username, hospital } = req.query;

  if (!username && !hospital) {
    return res.status(400).json({ error: 'Username or hospital is required.' });
  }

  try {
    let query = supabase.from('test_results').select('*');

    if (username) {
      query = query.eq('username', username);
    }
    if (hospital) {
      query = query.eq('hospital', hospital);
    }

    const { data: testResults, error } = await query.order('id', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Error fetching test results from Supabase.' });
    }

    if (!testResults || testResults.length === 0) {
      return res.status(404).json({ error: 'No test results found.' });
    }

    return res.json(testResults);

  } catch (err) {
    console.error('❌ Error fetching test results:', err);
    return res.status(500).json({ error: 'Internal server error while fetching test results.' });
  }
});

app.post('/api/test-results', async (req, res) => {
  const { username, testname, testdate, testresult, doctornotes, hospital, pdf } = req.body;

  if (!username || !testname || !testdate || !testresult || !hospital) {
    return res.status(400).json({ error: 'All required fields must be provided.' });
  }

  try {
    const { error } = await supabase.from('test_results').insert([{
      username,
      testname,
      testdate,
      testresult,
      doctornotes,
      hospital,
      pdf
    }]);

    if (error) {
      return res.status(500).json({ error: 'Error inserting test result.' });
    }

    return res.json({ message: 'Test result inserted successfully.' });

  } catch (err) {
    console.error('❌ Error inserting test result:', err);
    return res.status(500).json({ error: 'Internal server error while inserting test result.' });
  }
});

app.put('/api/test-results/:id', async (req, res) => {
  const { id } = req.params;
  const { username, testname, testdate, testresult, doctornotes, hospital, pdf } = req.body;

  if (!username || !testname || !testdate || !testresult || !hospital) {
    return res.status(400).json({ error: 'All required fields must be provided.' });
  }

  try {
    const { error } = await supabase
      .from('test_results')
      .update({ username, testname, testdate, testresult, doctornotes, hospital, pdf })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Error updating test result.' });
    }

    return res.json({ message: 'Test result updated successfully.' });

  } catch (err) {
    console.error('❌ Error updating test result:', err);
    return res.status(500).json({ error: 'Internal server error while updating test result.' });
  }
});

// 🧪 Delete test result
app.delete('/api/test-results/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('test_results')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: 'Error deleting test result.' });
    }

    return res.json({ message: 'Test result deleted successfully.' });

  } catch (err) {
    console.error('❌ Error deleting test result:', err);
    return res.status(500).json({ error: 'Internal server error while deleting test result.' });
  }
});

// 🧪 Upload PDF to Supabase storage
app.post('/api/upload-pdf', async (req, res) => {
  if (!req.files || !req.files.pdf || !req.body.username) {
    console.error('Missing required fields:', { files: !!req.files, pdf: !!req.files?.pdf, username: !!req.body.username });
    return res.status(400).json({ error: 'PDF file and username are required.' });
  }

  const file = req.files.pdf;
  const username = req.body.username;
  const filePath = `${username}_${Date.now()}.pdf`;

  try {
    console.log('Uploading PDF to Supabase:', { bucket: 'medical-reports', filePath });
    const { error: uploadError } = await supabase.storage
      .from('medical-reports')
      .upload(filePath, file.data, { contentType: 'application/pdf' });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: `Error uploading PDF: ${uploadError.message}` });
    }

    const { data } = supabase.storage.from('medical-reports').getPublicUrl(filePath);
    console.log('Generated PDF URL:', data.publicUrl);
    return res.json({ publicUrl: data.publicUrl });
  } catch (err) {
    console.error('Unexpected error uploading PDF:', err);
    return res.status(500).json({ error: 'Internal server error while uploading PDF.' });
  }
});

// 🧪 Optional test route to verify Supabase connection and data fetching
app.get('/supabase-test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('test_results').select('*');
    if (error) {
      return res.status(500).json({ error: 'Error fetching test data' });
    }
    res.json(data);
  } catch (err) {
    console.error('❌ Supabase test error:', err);
    return res.status(500).json({ error: 'Error testing Supabase connection.' });
  }
});

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
