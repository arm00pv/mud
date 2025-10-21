// game.js

const output = document.getElementById('output');
const input = document.getElementById('input');

let currentArea, innArea, items = {};

let player = {
  hp: 10, max_hp: 10, attack: 1, defense: 1, gold: 0,
  inventory: ["leather_armor", "iron_sword"],
  equipment: { weapon: null, armor: null, ring: null },
  currentRoom: null, currentAreaName: null,
  reputation: { fairies: 0, nymphs: 0 },
  quests: {},
  inCombat: false,
  inInn: false,
  returnLocation: { area: null, room: null }
};

// --- Event Listener ---
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const command = input.value.toLowerCase().trim();
    input.value = '';
    handleCommand(command);
  }
});

// --- Command Handler (REVISED) ---
function handleCommand(command) {
  printToOutput(`> ${command}`);
  const room = currentArea.rooms[player.currentRoom];
  const parts = command.split(' ');
  const action = parts[0];
  const target = parts.slice(1).join(' ');

  if (player.inCombat && !['attack', 'stats', 'inventory', 'i', 'st', 'look', 'l'].includes(action)) {
      printToOutput("You are in combat! You must fight!");
      return;
  }

  // Inn-specific command
  if (player.inInn && action === 'leave') {
      leaveInn();
      return;
  }

  if (room.exits && room.exits[command] && room.exits[command].startsWith('area')) {
      const targetArea = room.exits[command].split('_')[0];
      loadArea(targetArea);
      return;
  }

  if (room.exits && room.exits[command]) {
    player.currentRoom = room.exits[command];
    showCurrentRoom();
    return;
  }

  switch(action) {
      case 'attack': handleCombat(room); break;
      case 'look': case 'l': showCurrentRoom(); break;
      case 'quest': showQuestInfo(); break;
      case 'list': listShopItems(room); break;
      case 'buy': buyShopItem(target, room); break;
      case 'rent': rentInn(room); break;
      case 'talk': talkToNpc(target, room); break;
      case 'interact': interactWithObject(target, room); break;
      case 'goto':
          if (target && ['area1', 'area2', 'area3'].includes(target)) loadArea(target);
          else printToOutput('Invalid area name.');
          break;
      case 'collect': handleCollection(target, room); break;
      case 'inventory': case 'i': showInventory(); break;
      case 'stats': case 'st': showStats(); break;
      case 'equip': equipItem(target); break;
      case 'unequip': unequipItem(target); break;
      default: printToOutput("I don't understand that command.");
  }
}

// --- NEW NPC and Inn Systems ---
function rentInn(room) {
    if (!room.inn) {
        printToOutput("There is no inn here.");
        return;
    }
    const cost = room.inn.cost;
    if (player.gold < cost) {
        printToOutput(`You need ${cost} gold to rent a room.`);
        return;
    }
    player.gold -= cost;
    player.inInn = true;
    player.returnLocation = { area: player.currentAreaName, room: player.currentRoom };

    // Temporarily load the inn area
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
    if (!room.npcs || !room.npcs[npcName]) {
        printToOutput("There is no one here by that name.");
        return;
    }
    const npc = room.npcs[npcName];
    printToOutput(`"${npc.dialogue}"`);
}

function interactWithObject(objectName, room) {
    if (!room.interactables || !room.interactables[objectName]) {
        printToOutput("You can't interact with that.");
        return;
    }
    const message = room.interactables[objectName];
    printToOutput(message);

    // Special interactions
    if (objectName === 'bed') {
        player.hp = player.max_hp;
        printToOutput("You feel fully rested.");
    }
}


// --- Existing Systems (with minor adjustments) ---
function listShopItems(room) { /* ... */ }
function buyShopItem(itemName, room) { /* ... */ }
function handleCombat(room) { /* ... */ }
function playerDeath() { /* ... */ }
function showInventory() { /* ... */ }
function showStats() { /* ... */ }
function equipItem(itemName) { /* ... */ }
function unequipItem(itemType, silent = false) { /* ... */ }
function getTotalStat(stat) { /* ... */ }
function handleCollection(target, room) { /* ... */ }
function printToOutput(text) { output.innerHTML += `<p>${text}</p>`; output.scrollTop = output.scrollHeight; }

async function loadArea(areaName, specificRoom = null) {
  try {
    const response = await fetch(`areas/${areaName}.json`);
    if (!response.ok) throw new Error(`HTTP error!`);
    currentArea = await response.json();

    player.currentRoom = specificRoom || currentArea.start_room;
    player.currentAreaName = areaName;

    if (areaName === 'area1' && !player.quests.acorn_war) player.quests.acorn_war = { fairy_acorns: 0, nymph_acorns: 0 };
    else if (!player.quests[areaName]) player.quests[areaName] = { completed: false, steps: {} };

    output.innerHTML = '';
    printToOutput(`Welcome to ${currentArea.name}!`);
    showCurrentRoom();
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
      Object.keys(room.npcs).forEach(npcId => {
          printToOutput(`${room.npcs[npcId].name} is here. ('talk to ${npcId}')`);
      });
  }

  const exits = Object.keys(room.exits).join(', ');
  printToOutput(`Exits: ${exits}`);
}
function showQuestInfo() { /* ... */ }

async function startGame() {
  try {
      const itemResponse = await fetch('items.json');
      items = await itemResponse.json();

      const innResponse = await fetch('areas/inn.json');
      innArea = await innResponse.json();

  } catch (error) {
      printToOutput("Error: Failed to load essential game data.");
      return;
  }
  loadArea('area1');
}

// --- Minimized Implementations for brevity ---
function listShopItems(room){if(!room.shop){printToOutput("There is no shop here.");return}printToOutput(`--- ${room.shop.name} ---`);room.shop.inventory.forEach(itemId=>{const item=items[itemId];printToOutput(`- ${item.name} (${item.cost} gold)`)});printToOutput("--------------------")}
function buyShopItem(itemName,room){if(!room.shop){printToOutput("There is no shop here.");return}const itemId=Object.keys(items).find(key=>items[key].name.toLowerCase()===itemName);if(!itemId||!room.shop.inventory.includes(itemId)){printToOutput("That item is not sold here.");return}const item=items[itemId];if(player.gold<item.cost){printToOutput("You don't have enough gold.");return}player.gold-=item.cost;player.inventory.push(itemId);printToOutput(`You bought the ${item.name}.`)}
function handleCombat(room){if(!room.monster){printToOutput("There is nothing to attack here.");return}const monster=room.monster;const playerAttack=getTotalStat('attack');const playerDamage=Math.max(1,playerAttack-monster.defense);monster.hp-=playerDamage;printToOutput(`You attack the ${monster.name} for ${playerDamage} damage.`);if(monster.hp<=0){printToOutput(`You have defeated the ${monster.name}!`);player.gold+=monster.gold;printToOutput(`You loot ${monster.gold} gold.`);delete room.monster;player.inCombat=false;return}const monsterDamage=Math.max(1,monster.attack-getTotalStat('defense'));player.hp-=monsterDamage;printToOutput(`The ${monster.name} attacks you for ${monsterDamage} damage.`);showStats();if(player.hp<=0)playerDeath()}
function playerDeath(){printToOutput("You have been defeated!");const goldLost=Math.ceil(player.gold/2);player.gold-=goldLost;printToOutput(`You lose ${goldLost} gold and are revived at the area's entrance.`);player.hp=player.max_hp;player.inCombat=false;player.currentRoom=currentArea.start_room;showCurrentRoom()}
function showInventory(){printToOutput("--- Inventory ---");if(player.inventory.length===0)printToOutput("Your inventory is empty.");else player.inventory.forEach(itemId=>printToOutput(`- ${items[itemId].name}`));printToOutput(`Gold: ${player.gold}`);printToOutput("-----------------")}
function showStats(){printToOutput("--- Player Stats ---");printToOutput(`HP: ${player.hp} / ${player.max_hp}`);printToOutput(`Attack: ${getTotalStat('attack')} (Base: ${player.attack})`);printToOutput(`Defense: ${getTotalStat('defense')} (Base: ${player.defense})`);printToOutput("--------------------")}
function equipItem(itemName){const itemId=Object.keys(items).find(key=>items[key].name.toLowerCase()===itemName);if(!itemId||!player.inventory.includes(itemId)){printToOutput("You don't have that item.");return}const item=items[itemId];if(player.equipment[item.type])unequipItem(item.type,true);player.equipment[item.type]=itemId;player.inventory=player.inventory.filter(id=>id!==itemId);printToOutput(`You equip the ${item.name}.`)}
function unequipItem(itemType,silent=false){if(!player.equipment[itemType]){if(!silent)printToOutput(`You don't have a ${itemType} equipped.`);return}const itemId=player.equipment[itemType];const item=items[itemId];player.equipment[itemType]=null;player.inventory.push(itemId);if(!silent)printToOutput(`You unequip the ${item.name}.`)}
function getTotalStat(stat){let total=player[stat];for(const slot in player.equipment){const itemId=player.equipment[slot];if(itemId&&items[itemId][stat])total+=items[itemId][stat]}return total}
function handleCollection(target,room){const faction=target.split(' ')[0];if(player.currentAreaName!=='area1'){printToOutput("You can't do that here.");return}if(room.quest_object!=='acorn_cache'){printToOutput("There are no acorns to collect here.");return}if(faction==='fairy'||faction==='fairies'){player.reputation.fairies++;player.reputation.nymphs--;player.quests.acorn_war.fairy_acorns++;printToOutput("You collect acorns for the fairies. Their influence grows stronger.")}else if(faction==='nymph'||faction==='nymphs'){player.reputation.nymphs++;player.reputation.fairies--;player.quests.acorn_war.nymph_acorns++;printToOutput("You collect acorns for the nymphs. The forest darkens slightly.")}else{printToOutput("Collect for whom? 'collect fairy' or 'collect nymph'.");return}delete room.quest_object;room.description=room.description.replace(" You see a hidden cache of acorns here.","")}
function showQuestInfo(){if(player.currentAreaName==='area1'){const quest=currentArea.quests.acorn_war;printToOutput(`Quest: ${quest.name}`);printToOutput(quest.description);printToOutput("---");printToOutput(`Fairy Reputation: ${player.reputation.fairies}`);printToOutput(`Nymph Reputation: ${player.reputation.nymphs}`)}else{const questName=Object.keys(currentArea.quests)[0];const quest=currentArea.quests[questName];const areaQuest=player.quests[player.currentAreaName];if(!areaQuest){printToOutput("There are no active quests in this area.");return}if(areaQuest.completed){printToOutput(`You have completed the quest: "${quest.name}".`)}else{printToOutput(`Current Quest: "${quest.name}"`);printToOutput(`Description: ${quest.description}`)}}}

startGame();
