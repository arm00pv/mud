// game.js

const output = document.getElementById('output');
const input = document.getElementById('input');

let currentArea;
let player = {
  inventory: [],
  currentRoom: null,
  currentAreaName: null,
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
  const currentRoom = currentArea.rooms[player.currentRoom];

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
  } else if (currentRoom.exits && currentRoom.exits[command]) {
    player.currentRoom = currentRoom.exits[command];
    showCurrentRoom();
  } else {
    printToOutput("I don't understand that command.");
  }
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
    if (!player.quests[areaName]) {
      player.quests[areaName] = { completed: false, steps: {} };
    }
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
  checkForQuestObject(room);
}

function checkForQuestObject(room) {
  if (room.quest_object) {
    const questName = Object.keys(currentArea.quests)[0];
    const quest = currentArea.quests[questName];
    const areaQuest = player.quests[player.currentAreaName];

    if (areaQuest && !areaQuest.completed) {
      const stepIndex = quest.steps.findIndex(step => step.toLowerCase().includes(room.quest_object));
      if (stepIndex !== -1 && !areaQuest.steps[stepIndex]) {
        areaQuest.steps[stepIndex] = true;
        printToOutput(`Quest update: You have completed a step in the quest "${quest.name}".`);
        checkQuestCompletion(quest, areaQuest);
      }
    }
  }
}

function checkQuestCompletion(quest, areaQuest) {
  if (quest.steps.length === Object.keys(areaQuest.steps).length) {
    areaQuest.completed = true;
    player.inventory.push(quest.reward);
    printToOutput(`Quest complete: ${quest.name}! You have received: ${quest.reward}`);
  }
}

function showQuestInfo() {
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
    printToOutput('Steps:');
    quest.steps.forEach((step, index) => {
      const status = areaQuest.steps[index] ? '(completed)' : '(incomplete)';
      printToOutput(`- ${step} ${status}`);
    });
  }
}

function startGame() {
  printToOutput('Welcome to the AI-Generated MUD!');
  loadArea('area1');
}

startGame();
