const EventEmitter = require('events');

const events = new EventEmitter();

let currentStep = 0;
let maxSteps = 0;
let chainedScenes = [];
let scene = -1;
let isMono = true;
const sequences = [];

let tempo = 150;
let last = Date.now();
let looping = true;
let lastTapTempo = Date.now();

const onStep = (step) => {
  if (scene === -1) { return; }

  events.emit('step', step, currentStep);
  currentStep = step;

  if (currentStep === 0 && chainedScenes.length) {
    const nextScene = chainedScenes.shift();
    chainedScenes.push(nextScene);
    setScene(nextScene);
  }

  const seq = sequences[scene];
  if (!seq) { return; }

  const notes = seq[currentStep];

  if (notes) {
    notes.forEach(msg => {
      events.emit('note', msg);
    });
  }
};

const setScene = (index) => {
  events.emit('scene', index, scene);
  scene = index;
  console.log('Scene', scene);
};

const addScene = (scene) => {
  chainedScenes.push(scene);
  console.log('Chained', scene);
  console.log('Current chain', chainedScenes);
};

const resetScenes = () => {
  chainedScenes = [];
};

const setTempo = (fraction) => {
  const minp = 0;
  const maxp = 1;

  // The result should be between 100 an 10000000
  var minv = Math.log(15);
  var maxv = Math.log(500);

  // calculate adjustment factor
  const scale = (maxv - minv) / (maxp - minp);

  tempo = Math.round(Math.exp(minv + scale * ((maxp - fraction) - minp)));
};

const togglePlay = (toggle) => {
  looping = toggle;
};

const addNote = (msg) => {
  if (scene === -1) { return; }

  let seq = sequences[scene];
  if (!seq) {
    seq = sequences[scene] = [];
  }

  let notes = seq[currentStep];
  if (!notes) { notes = seq[currentStep] = []; }

  // Looping mode
  if (looping) {
    notes.push(msg);
    return;
  }

  // Editing mode
  const existing = seq[currentStep].findIndex(item => item.join() === msg.join());
  if (existing >= 0) {
    notes.splice(existing, 1);
  } else {
    notes.push(msg);
  }
};

const loop = () => {
  const now = Date.now();
  if (scene >= 0 && looping && (now - last >= tempo)) {
    last = now;

    onStep((currentStep + 1) % maxSteps);
  }
  setTimeout(loop, 10);
};

const init = (steps) => {
  maxSteps = steps;

  setScene(0);

  loop();
};

module.exports = {
  on: events.on.bind(events),
  init,
  onStep,
  setScene,
  addScene,
  resetScenes,
  togglePlay,
  addNote,
  setTempo
};
