// server.js

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const crypto = require('crypto');
const Mailjet = require('node-mailjet');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3002;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL ERROR: JWT_SECRET is not defined.');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key_for_development_only';

// app.use(express.json()); // Temporarily disable for diagnostics

// Diagnostic middleware to capture raw request body
app.use((req, res, next) => {
    if (req.headers['content-type'] === 'application/json') {
        let data = '';
        req.on('data', chunk => {
            data += chunk;
        });
        req.on('end', () => {
            console.log('--- RAW REQUEST BODY ---');
            console.log(data);
            console.log('--- END RAW REQUEST BODY ---');
            try {
                req.body = JSON.parse(data);
            } catch (e) {
                console.error("Failed to parse JSON:", e);
                req.body = {};
            }
            next();
        });
    } else {
        next();
    }
});


// In-memory mapping of characterId to WebSocket connection and player data
const clients = new Map();

// --- Email Setup ---
const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY,
    process.env.MAILJET_SECRET_KEY
);

// --- Database Setup ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Error connecting to database', err);
    else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE,
                verified BOOLEAN DEFAULT FALSE,
                verification_token TEXT
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS characters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT UNIQUE,
                character_data TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);
        });
    }
});

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- API Routes ---

// Register a new user
app.post('/api/register', (req, res) => {
    console.log('Received registration request with body:', req.body);
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Username already exists.' });
        }
        res.status(201).json({ message: 'Registration successful. You can now log in.' });
    });
});

// Get user email status
app.get('/api/user/email', authenticateToken, (req, res) => {
    db.get('SELECT email, verified FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ email: row.email, verified: row.verified });
    });
});

// Add or update user email
app.post('/api/user/email', authenticateToken, (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
    }
    const verificationToken = crypto.randomBytes(20).toString('hex');
    db.run('UPDATE users SET email = ?, verification_token = ?, verified = FALSE WHERE id = ?',
        [email, verificationToken, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Email address may already be in use.' });
        }

        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/api/verify-email?token=${verificationToken}`;

        const request = mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.MAILJET_SENDER_EMAIL || 'no-reply@yourdomain.com',
                        Name: 'MUD Game',
                    },
                    To: [{ Email: email }],
                    Subject: 'Verify Your Email Address',
                    TextPart: `Please verify your email address by clicking the following link: ${verificationUrl}`,
                    HTMLPart: `<p>Please verify your email address by clicking the following link: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
                },
            ],
        });

        request
            .then(() => {
                res.json({ message: 'Verification email sent. Please check your inbox.' });
            })
            .catch((err) => {
                console.error('Error sending verification email:', err.statusCode);
                res.status(500).json({ error: 'Failed to send verification email.' });
            });
    });
});

// Verify email
app.get('/api/verify-email', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Verification token is required.');
    }
    db.run('UPDATE users SET verified = TRUE, verification_token = NULL WHERE verification_token = ?', [token], function(err) {
        if (err) {
            return res.status(500).send('Failed to verify email.');
        }
        if (this.changes === 0) {
            return res.status(400).send('Invalid or expired verification token.');
        }
        res.send('Email verified successfully. You can now log in.');
    });
});

// Login and get a token
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token });
    });
});

// Get a list of characters for the logged-in user
app.get('/api/characters', authenticateToken, (req, res) => {
    db.all('SELECT id, name FROM characters WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to retrieve characters.' });
        }
        res.json(rows);
    });
});

// Create a new character
app.post('/api/characters', authenticateToken, (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Character name is required.' });
    }
    const initialCharacterData = JSON.stringify({
        hp: 10, max_hp: 10, attack: 1, defense: 1, gold: 0,
        inventory: ["leather_armor", "iron_sword", "travelers_clothes", "travelers_boots"],
        equipment: { weapon: null, armor: null, ring: null, chest: null, feet: null },
        currentRoom: "start",
        currentAreaName: "area1",
        reputation: { fairies: 0, nymphs: 0 },
        quests: {},
        inCombat: false, inInn: false,
        returnLocation: { area: null, room: null },
        achievements: [],
        visited_areas: ["area1"],
        skills: {
            blacksmithing: 1,
            alchemy: 1,
            tailoring: 1,
            jewelcrafting: 1,
            enchanting: 1,
            runecrafting: 1
        },
        quest_exp: 0,
        quest_skills: [],
        bank: {
            gold: 0,
            inventory: []
        },
        pvp: {
            wins: 0
        }
    });

    db.run('INSERT INTO characters (user_id, name, character_data) VALUES (?, ?, ?)',
        [req.user.id, name, initialCharacterData], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Character name already exists.' });
        }
        res.status(201).json({ id: this.lastID, name: name });
    });
});

// Load game data for a specific character
app.get('/api/game/load/:characterId', authenticateToken, (req, res) => {
    const { characterId } = req.params;
    db.get('SELECT character_data, name FROM characters WHERE id = ? AND user_id = ?', [characterId, req.user.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Character not found.' });
        }
        const characterData = JSON.parse(row.character_data);
        characterData.name = row.name;
        res.json(characterData);
    });
});

// Save game data for a specific character
app.post('/api/game/save/:characterId', authenticateToken, (req, res) => {
    const { characterId } = req.params;
    const characterData = JSON.stringify(req.body);
    db.run('UPDATE characters SET character_data = ? WHERE id = ? AND user_id = ?',
        [characterData, characterId, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to save game.' });
        }
        res.json({ message: 'Game saved successfully.' });
    });
});

// --- WebSocket Handling ---
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Client authentication
        if (data.type === 'auth') {
            jwt.verify(data.token, JWT_SECRET, (err, user) => {
                if (err) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
                    ws.close();
                } else {
                    db.get('SELECT character_data, name FROM characters WHERE id = ?', [data.characterId], (err, row) => {
                        if (err || !row) {
                            ws.send(JSON.stringify({ type: 'error', message: 'Character not found' }));
                            ws.close();
                        } else {
                            const characterData = JSON.parse(row.character_data);
                            characterData.name = row.name;
                            clients.set(data.characterId, { ws, player: characterData });
                            ws.characterId = data.characterId;
                            ws.send(JSON.stringify({ type: 'info', message: 'Authenticated successfully.' }));
                        }
                    });
                }
            });
        }

        // Chat message handling
        if (data.type === 'chat') {
            const sender = clients.get(ws.characterId);
            if (!sender) return;

            if (data.command === 'talk') {
                const message = `[Room] ${sender.player.name}: ${data.message}`;
                clients.forEach((client, id) => {
                    if (client.player.currentRoom === sender.player.currentRoom && id !== ws.characterId) {
                        client.ws.send(JSON.stringify({ type: 'chat', message }));
                    }
                });
            } else if (data.command === 'lt' || data.command === 'link') {
                const parts = data.message.split(' ');
                const recipientName = parts[0];
                const messageContent = parts.slice(1).join(' ');

                let recipientId = null;
                clients.forEach((client, id) => {
                    if (client.player.name.toLowerCase() === recipientName.toLowerCase()) {
                        recipientId = id;
                    }
                });

                if (recipientId) {
                    const recipient = clients.get(recipientId);
                    const message = `[Direct] ${sender.player.name}: ${messageContent}`;
                    recipient.ws.send(JSON.stringify({ type: 'chat', message }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Player not found.' }));
                }
            } else if (data.command === 'newbiet') {
                const message = `[NEWBIE] ${sender.player.name}: ${data.message}`;
                clients.forEach((client) => {
                    client.ws.send(JSON.stringify({ type: 'chat', message }));
                });
            }
        }

        // PvP message handling
        if (data.type === 'pvp') {
            const sender = clients.get(ws.characterId);
            if (!sender) return;

            if (data.command === 'attack') {
                const targetName = data.target;
                let targetId = null;
                clients.forEach((client, id) => {
                    if (client.player.name.toLowerCase() === targetName.toLowerCase()) {
                        targetId = id;
                    }
                });

                if (targetId) {
                    const target = clients.get(targetId);
                    if (sender.player.currentRoom === target.player.currentRoom) {
                        // For simplicity, we'll just send a message. A real implementation would have combat logic.
                        const message = `${sender.player.name} attacks ${target.player.name}!`;
                        clients.forEach((client) => {
                            if (client.player.currentRoom === sender.player.currentRoom) {
                                client.ws.send(JSON.stringify({ type: 'chat', message }));
                            }
                        });
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Target is not in the same room.' }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'Player not found.' }));
                }
            } else if (data.command === 'board') {
                // For now, we'll just send a placeholder message.
                ws.send(JSON.stringify({ type: 'chat', message: 'PvP leaderboard coming soon!' }));
            }
        }
    });

    ws.on('close', () => {
        if (ws.characterId) {
            clients.delete(ws.characterId);
        }
    });
});

// --- Serve Static Files ---
app.use(express.static(path.join(__dirname, '..', 'mud')));


// --- Server Start ---
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
