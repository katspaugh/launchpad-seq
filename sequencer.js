const EventEmitter = require('events');

const events = new EventEmitter();

const maxSteps = 16;
let currentStep = 0;
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
  const seq = sequences[scene];
  seq && seq.forEach(notes => {
    (notes || []).forEach(msg => {
      if (msg[0] >= 144) {
        events.emit('note', [ msg[0] - 16, msg[1], 0 ]);
      }
    });
  });

  events.emit('scene', index, scene);
  scene = index;
  console.log('Scene', scene);
};

const copyScene = (index, copyIndex) => {
  sequences[index] = sequences[copyIndex].slice().map(notes => notes.slice());
  console.log('Copied scene', copyIndex, 'to', index);
};

const chainScene = (scene) => {
  chainedScenes.push(scene);
  console.log('Chained', scene);
  console.log('Current chain', chainedScenes);
};

const resetChainedScenes = () => {
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

const addNote = (msg, step = currentStep) => {
  if (scene === -1) { return; }

  let seq = sequences[scene];
  if (!seq) { seq = sequences[scene] = []; }

  let notes = seq[step];
  if (!notes) { notes = seq[step] = []; }

  // Looping mode
  if (looping) {
    notes.push(msg);
    return;
  }

  // Editing mode
  const existing = notes.findIndex(item => item.join() === msg.join());
  if (existing >= 0) {
    notes.splice(existing, 1);
  } else {
    notes.push(msg);
  }
};

const removeNote = (msg, step = currentStep) => {
  if (scene === -1) { return; }

  let seq = sequences[scene];
  if (!seq) {
    seq = sequences[scene] = [];
  }

  const notes = seq[step] || [];
  seq[step] = notes.filter(item => item[0] !== msg[0]);
};

const replaceNote = (msg, step) => {
  if (scene === -1) { return; }

  let seq = sequences[scene];
  if (!seq) {
    seq = sequences[scene] = [];
  }

  const notes = seq[step] || [];
  if (notes.some((item) => item.key === msg.key)) {
    seq[step] = [];
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

const init = () => {
  setScene(0);

  loop();
};

module.exports = {
  on: events.on.bind(events),
  init,
  onStep,
  setScene,
  copyScene,
  chainScene,
  resetChainedScenes,
  togglePlay,
  addNote,
  removeNote,
  replaceNote,
  setTempo
};
