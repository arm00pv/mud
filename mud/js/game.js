// mud/js/game.js

import { api } from './api.js';
import { getAuthToken, setupAuthEventListeners } from './auth.js';
import { printToOutput, setupUIEventListeners, gameContainer, characterSelectionContainer, input } from './ui.js';
import { handleCommand } from './commands.js';

// --- Global State ---
export let player = {};
export let currentArea, innArea, items, recipes, achievements, help = {};
export let ws;
let selectedCharacterId = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupAuthEventListeners();
    setupUIEventListeners();
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            handleCommand(input.value.toLowerCase().trim());
            input.value = '';
        }
    });
});

// --- Game Flow ---
export async function selectCharacter(characterId) {
    selectedCharacterId = characterId;
    characterSelectionContainer.style.display = 'none';
    gameContainer.style.display = 'block';
    await startGame();
}

async function startGame() {
    try {
        // Load all game data
        [items, innArea, recipes, achievements, help] = await Promise.all([
            fetch('../items.json').then(res => res.json()),
            fetch('../areas/inn.json').then(res => res.json()),
            fetch('../recipes.json').then(res => res.json()),
            fetch('../achievements.json').then(res => res.json()),
            fetch('../help.json').then(res => res.json())
        ]);

        player = await api.loadGame(getAuthToken(), selectedCharacterId);
        initializePlayerData();

        connectWebSocket();

        await loadArea(player.currentAreaName);

        setInterval(tick, 1000); // Main game loop
        setInterval(saveGame, 30000);

    } catch (error) {
        alert(`Error starting game: ${error.message}`);
    }
}

function connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/mud/`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token: getAuthToken(), characterId: selectedCharacterId }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat') {
            printToOutput(data.message);
        }
    };
}

async function saveGame() {
    if (!getAuthToken() || !selectedCharacterId) return;
    try {
        await api.saveGame(getAuthToken(), selectedCharacterId, player);
    } catch (error) {
        console.error("Failed to save game:", error);
    }
}

function tick() {
    // Game loop logic (e.g., effects timing out)
    if (player.effects) {
        for (const effect in player.effects) {
            if (player.effects[effect].duration > 0) {
                player.effects[effect].duration--;
            }
            if (player.effects[effect].duration <= 0) {
                delete player.effects[effect];
                printToOutput(`The effect of ${effect} has worn off.`);
            }
        }
    }
}

export async function loadArea(areaName, specificRoom = null) {
  try {
    const response = await fetch(`../areas/${areaName}.json`);
    if (!response.ok) throw new Error(`Area not found: ${areaName}`);
    currentArea = await response.json();

    player.currentRoom = specificRoom || currentArea.start_room;
    player.currentAreaName = areaName;
    if (!player.visited_areas.includes(areaName)) {
        player.visited_areas.push(areaName);
    }

    // Initialize quests for the area if not already present
    if (areaName === 'area1' && !player.quests.acorn_war) player.quests.acorn_war = { fairy_acorns: 0, nymph_acorns: 0 };
    else if (!player.quests[areaName]) player.quests[areaName] = { completed: false, steps: {} };

    printToOutput(`Welcome to ${currentArea.name}!`);
    handleCommand('look'); // Show the room description
    checkAchievements();
  } catch (error) {
    printToOutput(`Error loading area: ${error.message}`);
  }
}

export function handleCombat(room) {
    if (!room.monster) { printToOutput("There is nothing to attack here."); return; }
    const monster = room.monster;
    const playerAttack = getTotalStat('attack');
    const playerDamage = Math.max(1, playerAttack - monster.defense);
    monster.hp -= playerDamage;
    printToOutput(`You attack the ${monster.name} for ${playerDamage} damage.`);

    if (monster.hp <= 0) {
        printToOutput(`You have defeated the ${monster.name}!`);
        player.gold += monster.gold;
        printToOutput(`You loot ${monster.gold} gold.`);
        if (monster.loot) {
            player.inventory.push(monster.loot);
            printToOutput(`You find a ${items[monster.loot].name}.`);
        }
        // Quest/Achievement checks
        delete room.monster;
        player.inCombat = false;
        return;
    }

    const monsterDamage = Math.max(1, monster.attack - getTotalStat('defense'));
    player.hp -= monsterDamage;
    printToOutput(`The ${monster.name} attacks you for ${monsterDamage} damage.`);
    handleCommand('stats');
    if (player.hp <= 0) playerDeath();
}

export function playerDeath() {
    printToOutput("You have been defeated!");
    const goldLost = Math.ceil(player.gold / 2);
    player.gold -= goldLost;
    printToOutput(`You lose ${goldLost} gold and are revived.`);
    player.hp = player.max_hp;
    player.inCombat = false;
    loadArea(currentArea.start_room.startsWith('area') ? currentArea.start_room.split('_')[0] : player.currentAreaName, currentArea.start_room);
}

export function getTotalStat(stat) {
    let total = player[stat] || 0;
    for (const slot in player.equipment) {
        const itemId = player.equipment[slot];
        if (itemId && items[itemId] && items[itemId][stat]) total += items[itemId][stat];
    }
    return total;
}

export function checkQuestSkills() {
    // Logic for unlocking quest skills
}

export function checkAchievements(event = null) {
    // Logic for checking and awarding achievements
}

function initializePlayerData() {
    // Ensures new player data fields are initialized if they don't exist
    player.effects = player.effects || {};
    player.achievements = player.achievements || [];
    player.visited_areas = player.visited_areas || ['area1'];
    player.skills = player.skills || { blacksmithing: 1, alchemy: 1, tailoring: 1 };
    player.quest_exp = player.quest_exp || 0;
    player.quest_skills = player.quest_skills || [];
    player.bank = player.bank || { gold: 0, inventory: [] };
    player.pvp = player.pvp || { wins: 0 };
    player.quests = player.quests || {};
}
