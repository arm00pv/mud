// game.js

const output = document.getElementById('output');
const input = document.getElementById('input');

let currentArea;
let player = {
  inventory: [],
  currentRoom: null,
  currentAreaName: null,
  reputation: { fairies: 0, nymphs: 0 },
  quests: {}
};

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const command = input.value.toLowerCase().trim();
    input.value = '';
    handleCommand(command);
  }
});

function handleCommand(command) {
  printToOutput(`> ${command}`);
  const room = currentArea.rooms[player.currentRoom];

  const parts = command.split(' ');
  const action = parts[0];
  const target = parts[1];

  if (action === 'quest') {
    showQuestInfo();
  } else if (action === 'goto' && target) {
    if (['area1', 'area2', 'area3'].includes(target)) {
      loadArea(target);
    } else {
      printToOutput('Invalid area.');
    }
  } else if (action === 'collect' && target) {
    handleCollection(target, room);
  } else if (room.exits && room.exits[command]) {
    player.currentRoom = room.exits[command];
    showCurrentRoom();
  } else {
    printToOutput("I don't understand that command.");
  }
}

function handleCollection(faction, room) {
  if (player.currentAreaName !== 'area1') {
    printToOutput("You can't do that here.");
    return;
  }

  if (room.quest_object !== 'acorn_cache') {
    printToOutput("There are no acorns to collect here.");
    return;
  }

  if (faction === 'fairy' || faction === 'fairies') {
    player.reputation.fairies++;
    player.reputation.nymphs--;
    player.quests.acorn_war.fairy_acorns++;
    printToOutput("You collect the acorns for the fairies. Their influence grows stronger.");
  } else if (faction === 'nymph' || faction === 'nymphs') {
    player.reputation.nymphs++;
    player.reputation.fairies--;
    player.quests.acorn_war.nymph_acorns++;
    printToOutput("You collect the acorns for the nymphs. The forest darkens slightly.");
  } else {
    printToOutput("You must specify who to collect for: 'collect fairy' or 'collect nymph'.");
    return;
  }

  // Remove the acorn cache after collection
  delete room.quest_object;
  room.description = room.description.replace(" You see a hidden cache of acorns here.", "");
}

function printToOutput(text) {
  output.innerHTML += `<p>${text}</p>`;
  output.scrollTop = output.scrollHeight;
}

async function loadArea(areaName) {
  try {
    const response = await fetch(`areas/${areaName}.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    currentArea = await response.json();
    player.currentRoom = currentArea.start_room;
    player.currentAreaName = areaName;

    // Initialize quest for this area if it doesn't exist
    if (areaName === 'area1' && !player.quests.acorn_war) {
      player.quests.acorn_war = { fairy_acorns: 0, nymph_acorns: 0 };
    } else if (!player.quests[areaName]) {
      player.quests[areaName] = { completed: false, steps: {} };
    }

    output.innerHTML = ''; // Clear the screen
    printToOutput(`Welcome to ${currentArea.name}!`);
    printToOutput(currentArea.description);
    showCurrentRoom();
  } catch (error) {
    printToOutput(`Error loading area: ${error.message}`);
    console.error('Error loading area:', error);
  }
}

function showCurrentRoom() {
  const room = currentArea.rooms[player.currentRoom];
  printToOutput(room.description);
  const exits = Object.keys(room.exits).join(', ');
  printToOutput(`Exits: ${exits}`);
}

function showQuestInfo() {
  if (player.currentAreaName === 'area1') {
    const quest = currentArea.quests.acorn_war;
    printToOutput(`Quest: ${quest.name}`);
    printToOutput(quest.description);
    printToOutput("---");
    printToOutput(`Fairy Reputation: ${player.reputation.fairies}`);
    printToOutput(`Nymph Reputation: ${player.reputation.nymphs}`);
    printToOutput(`Acorns collected for Fairies: ${player.quests.acorn_war.fairy_acorns}`);
    printToOutput(`Acorns collected for Nymphs: ${player.quests.acorn_war.nymph_acorns}`);
  } else {
      // Logic for quests in other areas
      const questName = Object.keys(currentArea.quests)[0];
      const quest = currentArea.quests[questName];
      const areaQuest = player.quests[player.currentAreaName];

      if (!areaQuest) {
          printToOutput("There are no active quests in this area.");
          return;
      }

      if (areaQuest.completed) {
          printToOutput(`You have completed the quest: "${quest.name}".`);
      } else {
          printToOutput(`Current Quest: "${quest.name}"`);
          printToOutput(`Description: ${quest.description}`);
      }
  }
}

function startGame() {
  loadArea('area1');
}

startGame();
