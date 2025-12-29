// Auth Logic

const API_URL = "/api";

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        initAuthForm();
    }
});

let isLoginMode = true;

function initAuthForm() {
    const formTitle = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const switchBtn = document.getElementById('switchBtn');
    const switchText = document.getElementById('switchText');
    const errorMsg = document.getElementById('errorMsg');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    switchBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            formTitle.textContent = "Login";
            submitBtn.textContent = "Sign In";
            switchText.textContent = "Don't have an account?";
            switchBtn.textContent = "Register";
        } else {
            formTitle.textContent = "Create Account";
            submitBtn.textContent = "Register";
            switchText.textContent = "Already have an account?";
            switchBtn.textContent = "Sign In";
        }
        errorMsg.textContent = "";
    });

    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;
        errorMsg.textContent = "Processing...";
        submitBtn.disabled = true;

        try {
            if (isLoginMode) {
                await login(username, password);
            } else {
                await register(username, password);
            }
        } catch (err) {
            errorMsg.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
        }
    });
}

async function login(username, password) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Login failed');
    }

    const data = await res.json();
    localStorage.setItem('pixelplates_token', data.access_token);
    window.location.href = '/';
}

async function register(username, password) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Registration failed');
    }

    // Auto login after register
    await login(username, password);
}

function logout() {
    localStorage.removeItem('pixelplates_token');
    window.location.href = '/login';
}

function getToken() {
    return localStorage.getItem('pixelplates_token');
}

function checkAuth() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
    }
    return token;
}
