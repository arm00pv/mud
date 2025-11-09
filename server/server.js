// server.js

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_key';

app.use(express.json());

// --- Database Setup ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Error connecting to database', err);
    else {
        console.log('Connected to the SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE,
                password TEXT
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
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run('INSERT INTO users (email, password) VALUES (?, ?)',
        [email, hashedPassword], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Email already exists.' });
        }
        res.status(201).json({ message: 'User registered successfully' });
    });
});

// Login and get a token
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
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
        inventory: ["leather_armor", "iron_sword"],
        equipment: { weapon: null, armor: null, ring: null },
        currentRoom: "start",
        currentAreaName: "area1",
        reputation: { fairies: 0, nymphs: 0 },
        quests: {},
        inCombat: false, inInn: false,
        returnLocation: { area: null, room: null }
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
    db.get('SELECT character_data FROM characters WHERE id = ? AND user_id = ?', [characterId, req.user.id], (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Character not found.' });
        }
        res.json(JSON.parse(row.character_data));
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


// --- Serve Static Files ---
// This will serve the main MUD game files from the parent directory
app.use(express.static(path.join(__dirname, '..', 'mud')));


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
