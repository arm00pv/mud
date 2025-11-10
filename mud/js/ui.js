// mud/js/ui.js
import { api } from './api.js';
import { getAuthToken } from './auth.js';
import { selectCharacter } from './game.js';

// --- DOM Elements ---
export const output = document.getElementById('output');
export const input = document.getElementById('input');
export const authContainer = document.getElementById('auth-container');
export const gameContainer = document.getElementById('game-container');
export const characterSelectionContainer = document.getElementById('character-selection-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const characterList = document.getElementById('character-list');

export function setupUIEventListeners() {
    document.getElementById('show-register').addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    document.getElementById('show-login').addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });
    document.getElementById('create-character-button').addEventListener('click', createNewCharacter);
}

export function printToOutput(text) {
    output.innerHTML += `<p>${text}</p>`;
    output.scrollTop = output.scrollHeight;
}

export async function showCharacterSelection() {
    characterSelectionContainer.style.display = 'block';
    try {
        const characters = await api.getCharacters(getAuthToken());
        characterList.innerHTML = '';
        if (characters.length > 0) {
            characters.forEach(char => {
                const charElement = document.createElement('div');
                charElement.textContent = char.name;
                charElement.className = 'character-entry';
                charElement.addEventListener('click', () => selectCharacter(char.id));
                characterList.appendChild(charElement);
            });
        } else {
            characterList.innerHTML = '<p>No characters found. Create a new one!</p>';
        }
    } catch (error) {
        alert(`Failed to load characters: ${error.message}`);
    }
}

async function createNewCharacter() {
    const name = document.getElementById('new-character-name').value;
    if (!name) {
        alert('Please enter a name for your new character.');
        return;
    }
    try {
        await api.createCharacter(getAuthToken(), name);
        document.getElementById('new-character-name').value = '';
        await showCharacterSelection();
    } catch (error) {
        alert(`Character creation failed: ${error.message}`);
    }
}
