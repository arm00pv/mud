// mud/js/auth.js

import { api } from './api.js';
import { showCharacterSelection, authContainer, characterSelectionContainer } from './ui.js';

let authToken = null;

export function getAuthToken() {
    return authToken;
}

export function setupAuthEventListeners() {
    document.getElementById('register-button').addEventListener('click', handleRegistration);
    document.getElementById('login-button').addEventListener('click', handleLogin);
}

async function handleRegistration() {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    try {
        await api.register(username, password);
        alert('Registration successful! You can now log in.');
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    } catch (error) {
        alert(`Registration failed: ${error.message}`);
    }
}

async function handleLogin() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const { token } = await api.login(username, password);
        authToken = token;
        authContainer.style.display = 'none';
        await showCharacterSelection();
    } catch (error) {
        alert(`Login failed: ${error.message}`);
    }
}
