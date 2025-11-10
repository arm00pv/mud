// game.js

// --- DOM Elements ---
const output = document.getElementById('output');
const input = document.getElementById('input');

const authContainer = document.getElementById('auth-container');
const gameContainer = document.getElementById('game-container');
const characterSelectionContainer = document.getElementById('character-selection-container');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const characterList = document.getElementById('character-list');

// --- Global State ---
let currentArea, innArea, items, recipes, achievements = {};
let player = {};
let authToken = null;
let selectedCharacterId = null;
let gameInterval; // For the main game loop

const API_BASE = '/mud/api'; // Base path for all API calls

// --- Event Listeners ---

// Auth Form Logic
document.getElementById('show-register').addEventListener('click', () => {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
});
document.getElementById('show-login').addEventListener('click', () => {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
});

// Register Button
document.getElementById('register-button').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (response.ok) {
        alert('Registration successful. Please check your email to verify your account.');
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    } else {
        const { error } = await response.json();
        alert(`Registration failed: ${error}`);
    }
});

// Login Button
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (response.ok) {
        const { token } = await response.json();
        authToken = token;
        authContainer.style.display = 'none';
        await showCharacterSelection();
    } else {
        const { error } = await response.json();
        alert(`Login failed: ${error}`);
    }
});

// Create Character Button
document.getElementById('create-character-button').addEventListener('click', async () => {
    const name = document.getElementById('new-character-name').value;
    if (!name) {
        alert('Please enter a name for your new character.');
        return;
    }
    const response = await fetch(`${API_BASE}/characters`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name })
    });
    if (response.ok) {
        document.getElementById('new-character-name').value = '';
        await showCharacterSelection();
    } else {
        const { error } = await response.json();
        alert(`Character creation failed: ${error}`);
    }
});

// Input Handler for game commands
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const command = input.value.toLowerCase().trim();
    input.value = '';
    handleCommand(command);
  }
});


// --- Character and Game Loading ---

async function showCharacterSelection() {
    characterSelectionContainer.style.display = 'block';
    const response = await fetch(`${API_BASE}/characters`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
        const characters = await response.json();
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
    }
}

async function selectCharacter(characterId) {
    selectedCharacterId = characterId;
    characterSelectionContainer.style.display = 'none';
    gameContainer.style.display = 'block';
    await startGame();
}

async function startGame() {
    try {
        const itemResponse = await fetch('items.json');
        items = await itemResponse.json();
        const innResponse = await fetch('areas/inn.json');
        innArea = await innResponse.json();
        const recipeResponse = await fetch('recipes.json');
        recipes = await recipeResponse.json();
        const achievementsResponse = await fetch('achievements.json');
        achievements = await achievementsResponse.json();
    } catch (error) {
        printToOutput("Error: Failed to load essential game data.");
        return;
    }

    const response = await fetch(`${API_BASE}/game/load/${selectedCharacterId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.ok) {
        player = await response.json();
        if (!player.effects) {
            player.effects = {};
        }
        if (!player.achievements) {
            player.achievements = [];
        }
        if (!player.visited_areas) {
            player.visited_areas = ['area1'];
        }
        if (!player.skills) {
            player.skills = { blacksmithing: 1, alchemy: 1, tailoring: 1 };
        }
        loadArea(player.currentAreaName);
    } else {
        alert('Failed to load character data.');
        return;
    }

    gameInterval = setInterval(tick, 1000); // Main game loop
    setInterval(saveGame, 30000);
}

async function saveGame() {
    if (!authToken || !selectedCharacterId) return;
    await fetch(`${API_BASE}/game/save/${selectedCharacterId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(player)
    });
}

function tick() {
    // This function is called every second
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

// --- Command Handler and Game Logic ---

function handleCommand(command) {
  printToOutput(`> ${command}`);
  const room = currentArea.rooms[player.currentRoom];

  const parts = command.split(' ');
  const action = parts[0];
  const target1 = parts[1];
  const target2 = parts.slice(2).join(' ');


  if (player.inCombat && !['attack', 'stats', 'inventory', 'i', 'st', 'look', 'l', 'use'].includes(action)) {
      printToOutput("You are in combat! You must fight!");
      return;
  }

  if (room.exits && room.exits[command] && room.exits[command].startsWith('area')) {
      const targetArea = room.exits[command].split('_')[0];
      loadArea(targetArea);
      return;
  }

  if (room.exits && room.exits[command]) {
    const nextRoomId = room.exits[command];
    // This is a simplified check. A more robust solution might check the area file.
    const isUnderwater = nextRoomId.includes("room_");
    if (currentArea.rooms[nextRoomId].environment === 'underwater' && (!player.effects || !player.effects.water_breathing || player.effects.water_breathing.duration <= 0)) {
        printToOutput("You can't breathe underwater! You need a special potion.");
        return;
    }
    // Crystal Heart quest progression check
    if (nextRoomId === 'cave_19_14' && (!player.quests.crystal_heart || !player.quests.crystal_heart.steps.shards_returned)) {
        printToOutput("A powerful barrier blocks your path. You feel a strange energy coming from the Crystal Guardian's chamber.");
        return;
    }
    player.currentRoom = room.exits[command];
    showCurrentRoom();
    return;
  }

  switch(action) {
      case 'craft':
          craftItem(target1, target2);
          break;
      case 'use':
          useItem(target1);
          break;
      case 'attack': handleCombat(room); break;
      case 'look': case 'l': showCurrentRoom(); break;
      case 'quest': showQuestInfo(); break;
      case 'list': listShopItems(room); break;
      case 'buy': buyShopItem(target1, room); break;
      case 'rent': rentInn(room); break;
      case 'leave': if (player.inInn) leaveInn(); else printToOutput("You are not in an inn."); break;
      case 'talk': talkToNpc(target1, room); break;
      case 'interact': interactWithObject(target1, room); break;
      case 'goto':
          if (target1 && ['area1', 'area2', 'area3', 'area4', 'area5'].includes(target1)) loadArea(target1);
          else printToOutput('Invalid area name.');
          break;
      case 'collect': handleCollection(target1, room); break;
      case 'inventory': case 'i': showInventory(); break;
      case 'stats': case 'st': showStats(); break;
      case 'equip': equipItem(target1); break;
      case 'unequip': unequipItem(target1); break;
      case 'achievements': showAchievements(); break;
      case 'skills': showSkills(); break;
      default: printToOutput("I don't understand that command.");
  }
}

function useItem(itemName) {
    const itemId = Object.keys(items).find(key => items[key].name.toLowerCase() === itemName);
    if (!itemId || !player.inventory.includes(itemId)) {
        printToOutput("You don't have that item.");
        return;
    }
    const item = items[itemId];
    if (item.type !== 'potion') {
        printToOutput("You can only use potions.");
        return;
    }

    // Apply effect
    if (!player.effects) {
        player.effects = {};
    }

    if (item.effect === 'heal') {
        player.hp = Math.min(player.max_hp, player.hp + item.amount);
        printToOutput(`You use the ${item.name} and heal for ${item.amount} HP.`);
    } else {
        player.effects[item.effect] = { duration: item.duration };
        printToOutput(`You use the ${item.name}. You feel its effects for ${item.duration} seconds.`);
    }

    // Remove from inventory
    player.inventory = player.inventory.filter(id => id !== itemId);
}

function craftItem(trade, recipeName) {
    if (!recipes[trade]) {
        printToOutput("That is not a valid trade skill.");
        return;
    }
    const recipeId = Object.keys(recipes[trade]).find(key => recipes[trade][key].name.toLowerCase() === recipeName);
    if (!recipeId) {
        printToOutput("You don't know how to craft that.");
        return;
    }
    const recipe = recipes[trade][recipeId];

    if (player.skills[trade] < recipe.level) {
        printToOutput(`Your ${trade} skill is not high enough. You need to be level ${recipe.level}.`);
        return;
    }

    // Check ingredients
    for (const ingredient in recipe.ingredients) {
        const requiredAmount = recipe.ingredients[ingredient];
        const playerAmount = player.inventory.filter(item => item === ingredient).length;
        if (playerAmount < requiredAmount) {
            printToOutput(`You don't have enough ${items[ingredient].name}.`);
            return;
        }
    }

    // Remove ingredients
    for (const ingredient in recipe.ingredients) {
        for (let i = 0; i < recipe.ingredients[ingredient]; i++) {
            const index = player.inventory.indexOf(ingredient);
            player.inventory.splice(index, 1);
        }
    }

    // Add result and experience
    player.inventory.push(recipe.result);
    player.skills[trade] += recipe.exp;
    printToOutput(`You successfully crafted a ${items[recipe.result].name}. You gained ${recipe.exp} ${trade} experience.`);

    // Check for main quest completion
    if (recipe.result === 'reforged_amulet') {
        player.quests.shattered_amulet.completed = true;
        printToOutput("You have reforged the Shattered Amulet and restored balance to the world! Congratulations!");
        checkAchievements('quest_master');
    }
}


function printToOutput(text) {
  output.innerHTML += `<p>${text}</p>`;
  output.scrollTop = output.scrollHeight;
}

async function loadArea(areaName, specificRoom = null) {
  try {
    const response = await fetch(`areas/${areaName}.json`);
    if (!response.ok) throw new Error(`HTTP error!`);
    currentArea = await response.json();

    player.currentRoom = specificRoom || currentArea.start_room;
    player.currentAreaName = areaName;
    if (!player.visited_areas.includes(areaName)) {
        player.visited_areas.push(areaName);
    }

    if (areaName === 'area1' && !player.quests.acorn_war) player.quests.acorn_war = { fairy_acorns: 0, nymph_acorns: 0 };
    else if (!player.quests[areaName]) player.quests[areaName] = { completed: false, steps: {} };

    output.innerHTML = '';
    printToOutput(`Welcome to ${currentArea.name}!`);
    showCurrentRoom();
    checkAchievements();
  } catch (error) {
    printToOutput(`Error loading area: ${error.message}`);
  }
}

function showCurrentRoom() {
  const room = currentArea.rooms[player.currentRoom];
  printToOutput(room.description);
  if (room.monster) { printToOutput(`A fierce ${room.monster.name} stands here!`); player.inCombat = true; }
  else { player.inCombat = false; }
  if (room.shop) printToOutput(`You see a shop: ${room.shop.name}. ('list')`);
  if (room.inn) printToOutput(`There is an inn here. You can 'rent' a room for ${room.inn.cost} gold.`);
  if (room.npcs) {
      Object.keys(room.npcs).forEach(npcId => printToOutput(`${room.npcs[npcId].name} is here. ('talk to ${npcId}')`));
  }
  const exits = Object.keys(room.exits).join(', ');
  printToOutput(`Exits: ${exits}`);
}

function listShopItems(room) {
    if (!room.shop) { printToOutput("There is no shop here."); return; }
    printToOutput(`--- ${room.shop.name} ---`);
    room.shop.inventory.forEach(itemId => {
        const item = items[itemId];
        printToOutput(`- ${item.name} (${item.cost} gold)`);
    });
    printToOutput("--------------------");
}
function buyShopItem(itemName, room) {
    if (!room.shop) { printToOutput("There is no shop here."); return; }
    const itemId = Object.keys(items).find(key => items[key].name.toLowerCase() === itemName);
    if (!itemId || !room.shop.inventory.includes(itemId)) { printToOutput("That item is not sold here."); return; }
    const item = items[itemId];
    if (player.gold < item.cost) { printToOutput("You don't have enough gold."); return; }
    player.gold -= item.cost;
    player.inventory.push(itemId);
    printToOutput(`You bought the ${item.name}.`);
}
function handleCombat(room) {
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
        if (monster.name === 'Kraken') {
            checkAchievements('defeat_kraken');
        }
        delete room.monster;
        player.inCombat = false;
        return;
    }
    const monsterDamage = Math.max(1, monster.attack - getTotalStat('defense'));
    player.hp -= monsterDamage;
    printToOutput(`The ${monster.name} attacks you for ${monsterDamage} damage.`);
    showStats();
    if (player.hp <= 0) playerDeath();
}
function playerDeath() {
    printToOutput("You have been defeated!");
    const goldLost = Math.ceil(player.gold / 2);
    player.gold -= goldLost;
    printToOutput(`You lose ${goldLost} gold and are revived at the area's entrance.`);
    player.hp = player.max_hp;
    player.inCombat = false;
    player.currentRoom = currentArea.start_room;
    showCurrentRoom();
}
function showInventory() {
    printToOutput("--- Inventory ---");
    if (player.inventory.length === 0) printToOutput("Your inventory is empty.");
    else player.inventory.forEach(itemId => printToOutput(`- ${items[itemId].name}`));
    printToOutput(`Gold: ${player.gold}`);
    printToOutput("-----------------");
}
function showStats() {
    printToOutput("--- Player Stats ---");
    printToOutput(`HP: ${player.hp} / ${player.max_hp}`);
    printToOutput(`Attack: ${getTotalStat('attack')} (Base: ${player.attack})`);
    printToOutput(`Defense: ${getTotalStat('defense')} (Base: ${player.defense})`);
    if(player.effects && player.effects.water_breathing) {
        printToOutput(`Water Breathing: ${player.effects.water_breathing.duration}s`);
    }
    printToOutput("--------------------");
}
function showSkills() {
    printToOutput("--- Skills ---");
    for (const skill in player.skills) {
        printToOutput(`- ${skill}: ${player.skills[skill]}`);
    }
    printToOutput("--------------");
}
function equipItem(itemName) {
    const itemId = Object.keys(items).find(key => items[key].name.toLowerCase() === itemName);
    if (!itemId || !player.inventory.includes(itemId)) { printToOutput("You don't have that item."); return; }
    const item = items[itemId];
    const slot = item.type === 'clothing' ? item.slot : item.type;
    if (player.equipment[slot]) unequipItem(slot, true);
    player.equipment[slot] = itemId;
    player.inventory = player.inventory.filter(id => id !== itemId);
    printToOutput(`You equip the ${item.name}.`);
}
function unequipItem(slot, silent = false) {
    if (!player.equipment[slot]) { if (!silent) printToOutput(`You don't have a ${slot} equipped.`); return; }
    const itemId = player.equipment[slot];
    const item = items[itemId];
    player.equipment[slot] = null;
    player.inventory.push(itemId);
    if (!silent) printToOutput(`You unequip the ${item.name}.`);
}
function getTotalStat(stat) {
    let total = player[stat];
    for (const slot in player.equipment) {
        const itemId = player.equipment[slot];
        if (itemId && items[itemId][stat]) total += items[itemId][stat];
    }
    return total;
}
function handleCollection(target, room) {
  const faction = target.split(' ')[0];
  if (player.currentAreaName !== 'area1') { printToOutput("You can't do that here."); return; }
  if (room.quest_object !== 'acorn_cache') { printToOutput("There are no acorns to collect here."); return; }
  if (faction === 'fairy' || faction === 'fairies') {
    player.reputation.fairies++; player.reputation.nymphs--;
    player.quests.acorn_war.fairy_acorns++;
    printToOutput("You collect acorns for the fairies. Their influence grows stronger.");
  } else if (faction === 'nymph' || faction === 'nymphs') {
    player.reputation.nymphs++; player.reputation.fairies--;
    player.quests.acorn_war.nymph_acorns++;
    printToOutput("You collect acorns for the nymphs. The forest darkens slightly.");
  } else { printToOutput("Collect for whom? 'collect fairy' or 'collect nymph'."); return; }
  delete room.quest_object;
  room.description = room.description.replace(" You see a hidden cache of acorns here.", "");
}
function showQuestInfo() {
  if (player.currentAreaName === 'area1') {
    const quest = currentArea.quests.acorn_war;
    printToOutput(`Quest: ${quest.name}`);
    printToOutput(quest.description);
    printToOutput("---");
    printToOutput(`Fairy Reputation: ${player.reputation.fairies}`);
    printToOutput(`Nymph Reputation: ${player.reputation.nymphs}`);
  } else {
      const questName = Object.keys(currentArea.quests)[0];
      const quest = currentArea.quests[questName];
      const areaQuest = player.quests[player.currentAreaName];
      if (!areaQuest) { printToOutput("There are no active quests in this area."); return; }
      if (areaQuest.completed) { printToOutput(`You have completed the quest: "${quest.name}".`); }
      else { printToOutput(`Current Quest: "${quest.name}"`); printToOutput(`Description: ${quest.description}`); }
  }
}
function rentInn(room) {
    if (!room.inn) { printToOutput("There is no inn here."); return; }
    const cost = room.inn.cost;
    if (player.gold < cost) { printToOutput(`You need ${cost} gold to rent a room.`); return; }
    player.gold -= cost;
    player.inInn = true;
    player.returnLocation = { area: player.currentAreaName, room: player.currentRoom };
    currentArea = innArea;
    player.currentRoom = innArea.start_room;
    output.innerHTML = '';
    printToOutput(`You pay ${cost} gold and are shown to a room.`);
    showCurrentRoom();
}
function leaveInn() {
    player.inInn = false;
    loadArea(player.returnLocation.area, player.returnLocation.room);
}
function talkToNpc(npcName, room) {
    if (!room.npcs || !room.npcs[npcName]) { printToOutput("There is no one here by that name."); return; }
    const npc = room.npcs[npcName];
    printToOutput(`"${npc.dialogue}"`);

    // Quest handling
    if (npc.quest && !player.quests[npc.quest]) {
        player.quests[npc.quest] = { completed: false, steps: {} };
        printToOutput(`You have started the quest: "${currentArea.quests[npc.quest].name}"`);
    }

    // Item reward
    if (npc.item) {
        if (!player.inventory.includes(npc.item)) {
            player.inventory.push(npc.item);
            printToOutput(`${npc.name} gives you a ${items[npc.item].name}.`);
        }
    }

    // Specific quest logic for Crystal Guardian
    if (npcName === 'crystal_guardian' && player.quests.crystal_heart) {
        const hasShards = player.inventory.includes('crystal_shard_1') &&
                          player.inventory.includes('crystal_shard_2') &&
                          player.inventory.includes('crystal_shard_3');
        if (hasShards) {
            printToOutput(`"${npc.name} takes the three shards and they fuse into a glowing key. 'The path to the heart is now open,' the guardian says. 'Follow the easternmost cavern to the end. May you succeed where I cannot.' The key dissolves into light and vanishes."`);
            // Remove shards from inventory
            player.inventory = player.inventory.filter(item => !item.startsWith('crystal_shard'));
            // Update quest state
            player.quests.crystal_heart.steps.shards_returned = true;
        }
    }
}
function interactWithObject(objectName, room) {
    if (!room.interactables || !room.interactables[objectName]) { printToOutput("You can't interact with that."); return; }
    const message = room.interactables[objectName];
    printToOutput(message);
    if (objectName === 'bed') {
        player.hp = player.max_hp;
        printToOutput("You feel fully rested.");
    }
}
function showAchievements() {
    printToOutput("--- Achievements ---");
    if (player.achievements.length === 0) {
        printToOutput("You have not earned any achievements yet.");
    } else {
        player.achievements.forEach(achId => {
            const ach = achievements[achId];
            printToOutput(`- ${ach.name}: ${ach.description}`);
        });
    }
    printToOutput("--------------------");
}
function checkAchievements(event = null) {
    if (event === 'defeat_kraken' && !player.achievements.includes('defeat_kraken')) {
        player.achievements.push('defeat_kraken');
        printToOutput("Achievement unlocked: Ocean's Conqueror!");
    }
    if (player.visited_areas.length >= 4 && !player.achievements.includes('visit_all_areas')) {
        player.achievements.push('visit_all_areas');
        printToOutput("Achievement unlocked: World Traveler!");
    }
    if (event === 'quest_master' && !player.achievements.includes('quest_master')) {
        player.achievements.push('quest_master');
        printToOutput("Achievement unlocked: Legendary Hero!");
    }
}
