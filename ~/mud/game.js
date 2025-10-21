// game.js

const output = document.getElementById('output');
const input = document.getElementById('input');

let currentArea;
let player = {
  inventory: []
};

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const command = input.value;
    input.value = '';
    handleCommand(command);
  }
});

function handleCommand(command) {
  // Command handling logic will go here
  printToOutput(`> ${command}`);
}

function printToOutput(text) {
  output.innerHTML += `<p>${text}</p>`;
  output.scrollTop = output.scrollHeight;
}

function loadArea(areaName) {
  // Area loading logic will go here
}

function startGame() {
  printToOutput('Welcome to the AI-Generated MUD!');
  loadArea('area1');
}

startGame();
