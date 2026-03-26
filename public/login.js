let isLoginMode = true;

const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const nameInput = document.getElementById('nameInput');
const submitBtn = document.getElementById('submitBtn');
const authSwitch = document.getElementById('authSwitch');
const errorMsg = document.getElementById('errorMsg');

function toggleMode(e) {
  if (e) e.preventDefault();
  isLoginMode = !isLoginMode;
  errorMsg.style.display = 'none';
  
  if (isLoginMode) {
    authTitle.textContent = 'Welcome Back';
    authSubtitle.textContent = 'Login to continue to CardRadar';
    nameInput.style.display = 'none';
    nameInput.required = false;
    submitBtn.textContent = 'Log In';
    authSwitch.innerHTML = `Don't have an account? <a href="#" onclick="toggleMode(event)">Sign up</a>`;
  } else {
    authTitle.textContent = 'Create Account';
    authSubtitle.textContent = 'Sign up to continue to CardRadar';
    nameInput.style.display = 'block';
    nameInput.required = true;
    submitBtn.textContent = 'Sign Up';
    authSwitch.innerHTML = `Already have an account? <a href="#" onclick="toggleMode(event)">Log in</a>`;
  }
}

async function handleAuth(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  const name = document.getElementById('nameInput').value;

  const url = isLoginMode ? '/api/auth/login' : '/api/auth/register';
  const body = isLoginMode ? { email, password } : { name, email, password };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Please wait...';
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (res.ok) {
      window.location.href = '/dashboard.html';
    } else {
      // For passport-local errors on login, the response might be a 401 Unauthorized
      if (res.status === 401) {
          showError('Invalid email or password');
      } else {
          showError(data.error || 'Authentication failed');
      }
    }
  } catch (err) {
    showError('Network error. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
  }
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = 'block';
}

// Check if there was a google auth error from redirect
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('error') === 'google') {
  showError('Google authentication failed. Please try again.');
}
