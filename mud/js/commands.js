// mud/js/commands.js

import { printToOutput } from './ui.js';
import { player, currentArea, innArea, items, recipes, achievements, help, ws } from './game.js';
import { loadArea, handleCombat, playerDeath, getTotalStat, checkQuestSkills, checkAchievements } from './game.js';
import { api } from './api.js';
import { getAuthToken } from './auth.js';

export function handleCommand(command) {
    const parts = command.split(' ');
    const action = parts[0];
    const target1 = parts[1];
    const target2 = parts.slice(2).join(' ');

    if (['talk', 'lt', 'link', 'newbiet'].includes(action)) {
        ws.send(JSON.stringify({ type: 'chat', command: action, message: parts.slice(1).join(' ') }));
        return;
    }

    printToOutput(`> ${command}`);
    const room = currentArea.rooms[player.currentRoom];

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
        // ... (Movement logic remains the same)
        player.currentRoom = room.exits[command];
        showCurrentRoom();
        return;
    }

    switch(action) {
        case 'craft': craftItem(target1, target2); break;
        case 'use': useItem(target1); break;
        case 'attack':
            if (room.pvp) {
                ws.send(JSON.stringify({ type: 'pvp', command: 'attack', target: target1 }));
            } else {
                handleCombat(room);
            }
            break;
        case 'look': case 'l': showCurrentRoom(); break;
        case 'quest': showQuestInfo(); break;
        case 'list': listShopItems(room); break;
        case 'buy': buyShopItem(target1, room); break;
        case 'rent': rentInn(room); break;
        case 'leave': if (player.inInn) leaveInn(); else printToOutput("You are not in an inn."); break;
        case 'talk': talkToNpc(target1, room); break;
        case 'interact': interactWithObject(target1, room); break;
        case 'goto':
            if (target1 && ['area1', 'area2', 'area3', 'area4', 'area5', 'area6', 'arena', 'area8'].includes(target1)) loadArea(target1);
            else printToOutput('Invalid area name.');
            break;
        case 'collect': handleCollection(target1, room); break;
        case 'inventory': case 'i': showInventory(); break;
        case 'stats': case 'st': showStats(); break;
        case 'equip': equipItem(target1); break;
        case 'unequip': unequipItem(target1); break;
        case 'achievements': showAchievements(); break;
        case 'skills': showSkills(); break;
        case 'qskills': showQuestSkills(); break;
        case 'help': showHelp(target1); break;
        case 'deposit': deposit(target1, target2); break;
        case 'withdraw': withdraw(target1, target2); break;
        case 'balance': showBalance(); break;
        case 'pvp':
            if (target1 === 'board') ws.send(JSON.stringify({ type: 'pvp', command: 'board' }));
            break;
        case 'email': handleEmailCommand(target1, target2); break;
        default: printToOutput("I don't understand that command.");
    }
}

// All helper functions for commands (useItem, craftItem, showInventory, etc.) go here.
// These functions will now directly manipulate the exported 'player' and 'currentArea' objects.

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
  if (room.bank) {
      printToOutput("You see a bank here. You can 'deposit', 'withdraw', and check your 'balance'.");
  }
  const exits = Object.keys(room.exits).join(', ');
  printToOutput(`Exits: ${exits}`);
}

async function handleEmailCommand(subcommand, emailAddress) {
    if (subcommand === 'add') {
        if (!emailAddress) {
            printToOutput("Usage: email add <your_email@example.com>");
            return;
        }
        try {
            const result = await api.addEmail(getAuthToken(), emailAddress);
            printToOutput(result.message);
        } catch (error) {
            printToOutput(`Error: ${error.message}`);
        }
    } else if (subcommand === 'status') {
        try {
            const { email, verified } = await api.getEmailStatus(getAuthToken());
            if (email) {
                printToOutput(`Your registered email is: ${email}`);
                printToOutput(`Status: ${verified ? 'Verified' : 'Not Verified'}`);
            } else {
                printToOutput("You have not added an email address to your account yet.");
            }
        } catch (error) {
            printToOutput(`Error: ${error.message}`);
        }
    } else {
        printToOutput("Usage: email <add|status>");
    }
}

// ... include all other command helper functions like showInventory, showStats, etc.
// from the original game.js, ensuring they use the imported player and ui functions.

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

    if (!player.effects) player.effects = {};

    if (item.effect === 'heal') {
        player.hp = Math.min(player.max_hp, player.hp + item.amount);
        printToOutput(`You use the ${item.name} and heal for ${item.amount} HP.`);
    } else {
        player.effects[item.effect] = { duration: item.duration };
        printToOutput(`You use the ${item.name}. You feel its effects for ${item.duration} seconds.`);
    }

    player.inventory.splice(player.inventory.indexOf(itemId), 1);
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

    for (const ingredient in recipe.ingredients) {
        const requiredAmount = recipe.ingredients[ingredient];
        const playerAmount = player.inventory.filter(item => item === ingredient).length;
        if (playerAmount < requiredAmount) {
            printToOutput(`You don't have enough ${items[ingredient].name}.`);
            return;
        }
    }

    for (const ingredient in recipe.ingredients) {
        for (let i = 0; i < recipe.ingredients[ingredient]; i++) {
            const index = player.inventory.indexOf(ingredient);
            player.inventory.splice(index, 1);
        }
    }

    player.inventory.push(recipe.result);
    player.skills[trade] += recipe.exp;
    printToOutput(`You successfully crafted a ${items[recipe.result].name}. You gained ${recipe.exp} ${trade} experience.`);

    if (recipe.result === 'reforged_amulet') {
        player.quests.shattered_amulet.completed = true;
        printToOutput("You have reforged the Shattered Amulet and restored balance to the world! Congratulations!");
        checkAchievements('quest_master');
    }
    if (recipe.result === 'starcaller_staff') {
        player.quests.starfall.completed = true;
        printToOutput("You have forged the Starcaller's Staff and saved the world from certain doom! You are a true hero!");
        checkAchievements('quest_master');
    }
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

function rentInn(room) {
    if (!room.inn) { printToOutput("There is no inn here."); return; }
    const cost = room.inn.cost;
    if (player.gold < cost) { printToOutput(`You need ${cost} gold to rent a room.`); return; }
    player.gold -= cost;
    player.inInn = true;
    player.returnLocation = { area: player.currentAreaName, room: player.currentRoom };
    loadArea('inn');
}

function leaveInn() {
    player.inInn = false;
    loadArea(player.returnLocation.area, player.returnLocation.room);
}

function talkToNpc(npcName, room) {
    if (!room.npcs || !room.npcs[npcName]) { printToOutput("There is no one here by that name."); return; }
    const npc = room.npcs[npcName];
    printToOutput(`"${npc.dialogue}"`);
    if (npc.quest && !player.quests[npc.quest]) {
        player.quests[npc.quest] = { completed: false, steps: {} };
        printToOutput(`You have started the quest: "${currentArea.quests[npc.quest].name}"`);
    }
    if (npc.item && !player.inventory.includes(npc.item)) {
        player.inventory.push(npc.item);
        printToOutput(`${npc.name} gives you a ${items[npc.item].name}.`);
    }
    if (npc.transport) {
        const [area, room] = npc.transport.split('_');
        loadArea(area, room);
    }
    if (npcName === 'crystal_guardian' && player.quests.crystal_heart) {
        const hasShards = player.inventory.includes('crystal_shard_1') && player.inventory.includes('crystal_shard_2') && player.inventory.includes('crystal_shard_3');
        if (hasShards) {
            printToOutput(`"${npc.name} takes the three shards... 'The path to the heart is now open.'..."`);
            player.inventory = player.inventory.filter(item => !item.startsWith('crystal_shard'));
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

function handleCollection(target, room) {
  const faction = target.split(' ')[0];
  if (player.currentAreaName !== 'area1' || room.quest_object !== 'acorn_cache') {
      printToOutput("There are no acorns to collect here.");
      return;
  }
  if (['fairy', 'fairies'].includes(faction)) {
    player.reputation.fairies++; player.reputation.nymphs--;
    player.quests.acorn_war.fairy_acorns++;
    printToOutput("You collect acorns for the fairies.");
  } else if (['nymph', 'nymphs'].includes(faction)) {
    player.reputation.nymphs++; player.reputation.fairies--;
    player.quests.acorn_war.nymph_acorns++;
    printToOutput("You collect acorns for the nymphs.");
  } else { printToOutput("Collect for whom? 'collect fairy' or 'collect nymph'."); return; }
  delete room.quest_object;
  room.description = room.description.replace(" You see a hidden cache of acorns here.", "");
}

function showQuestInfo() {
  if (player.currentAreaName === 'area1') {
    printToOutput(`Quest: Acorn War...`);
    printToOutput(`Fairy Reputation: ${player.reputation.fairies}`);
    printToOutput(`Nymph Reputation: ${player.reputation.nymphs}`);
  } else {
      // ... existing quest logic
  }
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
    // ... effects
    printToOutput("--------------------");
}

function showSkills() {
    printToOutput("--- Skills ---");
    for (const skill in player.skills) {
        printToOutput(`- ${skill}: ${player.skills[skill]}`);
    }
    printToOutput("--------------");
}

function showQuestSkills() {
    printToOutput("--- Quest Skills ---");
    printToOutput(`Total Quest Experience: ${player.quest_exp}`);
    if (player.quest_skills.length === 0) {
        printToOutput("You have not unlocked any quest skills yet.");
    } else {
        player.quest_skills.forEach(skill => {
            printToOutput(`- ${skill.name}: ${skill.description}`);
        });
    }
    printToOutput("--------------------");
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
    player.inventory.push(itemId);
    player.equipment[slot] = null;
    if (!silent) printToOutput(`You unequip the ${items[itemId].name}.`);
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

function showHelp(topic) {
    if (!topic) {
        printToOutput("--- Help Topics ---");
        for (const key in help) printToOutput(`- ${key}`);
        printToOutput("Type 'help <topic>' for more information.");
        return;
    }
    if (help[topic]) {
        printToOutput(`--- Help: ${help[topic].name} ---`);
        printToOutput(help[topic].description);
    } else {
        printToOutput("That is not a valid help topic.");
    }
}

function deposit(item, amount) {
    if (!currentArea.rooms[player.currentRoom].bank) {
        printToOutput("There is no bank here.");
        return;
    }
    if (item === 'gold') {
        const goldAmount = parseInt(amount);
        if (isNaN(goldAmount) || goldAmount <= 0 || player.gold < goldAmount) {
            printToOutput("Invalid amount.");
            return;
        }
        player.gold -= goldAmount;
        player.bank.gold += goldAmount;
        printToOutput(`You deposited ${goldAmount} gold.`);
    } else {
        const itemId = Object.keys(items).find(key => items[key].name.toLowerCase() === item);
        if (!itemId || !player.inventory.includes(itemId)) {
            printToOutput("You don't have that item.");
            return;
        }
        player.inventory.splice(player.inventory.indexOf(itemId), 1);
        player.bank.inventory.push(itemId);
        printToOutput(`You deposited ${items[itemId].name}.`);
    }
}

function withdraw(item, amount) {
    if (!currentArea.rooms[player.currentRoom].bank) {
        printToOutput("There is no bank here.");
        return;
    }
    if (item === 'gold') {
        const goldAmount = parseInt(amount);
        if (isNaN(goldAmount) || goldAmount <= 0 || player.bank.gold < goldAmount) {
            printToOutput("Invalid amount.");
            return;
        }
        player.bank.gold -= goldAmount;
        player.gold += goldAmount;
        printToOutput(`You withdrew ${goldAmount} gold.`);
    } else {
        const itemId = Object.keys(items).find(key => items[key].name.toLowerCase() === item);
        if (!itemId || !player.bank.inventory.includes(itemId)) {
            printToOutput("You don't have that item in the bank.");
            return;
        }
        player.bank.inventory.splice(player.bank.inventory.indexOf(itemId), 1);
        player.inventory.push(itemId);
        printToOutput(`You withdrew ${items[itemId].name}.`);
    }
}

function showBalance() {
    if (!currentArea.rooms[player.currentRoom].bank) {
        printToOutput("There is no bank here.");
        return;
    }
    printToOutput("--- Bank Balance ---");
    printToOutput(`Gold: ${player.bank.gold}`);
    if (player.bank.inventory.length === 0) {
        printToOutput("Your bank inventory is empty.");
    } else {
        player.bank.inventory.forEach(itemId => printToOutput(`- ${items[itemId].name}`));
    }
    printToOutput("--------------------");
}
