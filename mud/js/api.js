// mud/js/api.js

const API_BASE = '/mud/api';

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
    }
    return response.json();
}

export const api = {
    register: (username, password) => apiRequest('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }),

    login: (username, password) => apiRequest('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    }),

    getCharacters: (token) => apiRequest('/characters', {
        headers: { 'Authorization': `Bearer ${token}` }
    }),

    createCharacter: (token, name) => apiRequest('/characters', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    }),

    loadGame: (token, characterId) => apiRequest(`/game/load/${characterId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }),

    saveGame: (token, characterId, playerData) => apiRequest(`/game/save/${characterId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(playerData)
    }),

    addEmail: (token, email) => apiRequest('/user/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
    }),

    getEmailStatus: (token) => apiRequest('/user/email', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
};
