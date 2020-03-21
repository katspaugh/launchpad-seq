const EventEmitter = require('event-emitter');

const events = new EventEmitter();

const allScales = {
  semitones: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  ],

  ionian: [
    0, 2, 4, 5, 7, 9, 11, 12
  ]
};

const scale = allScales.ionian;

const CHANNEL_1 = 3;
const CHANNEL_2 = 4;

const SIZE = 8;

let currentStep = 0;
let maxSteps = 16;
let scene = -1;
const sequences = new Array(SIZE).fill(null).map(() => []);

let tempo = 150;
let last = Date.now();
let looping = true;

const clearStep = () => {
  const seq = sequences[scene];
  const notes = seq[currentStep];

  if (notes) {
    notes.forEach(msg => {
      const offMsg = [ msg[0] - 16, msg[1], 0 ];

      events.emit('clear', msg);
    });
  }
};

const onStep = () => {
  const seq = sequences[scene];
  const notes = seq[currentStep];

  if (notes) {
    notes.forEach(msg => {
      events.emit('note', msg);
    });
  }

  events.emit('step', currentStep);
};

const newScene = (index) => {
  events.emit('scene', index, scene);
  scene = index;
  console.log('Scene', scene);
};

const newMessage = (k) => {
  const channel = k.y < (SIZE / 2) ? CHANNEL_1 : CHANNEL_2;
  const row = k.y % (SIZE / 2);
  const octave = Math.floor((k.x + SIZE * row) / scale.length);
  const note = 36 + scale[(k.x + SIZE * row) % scale.length] + octave * 12;
  const velocity = k.pressed ? 127 : 0;
  const msg = [ 143 + channel, note, velocity ];
  msg.key = k;
  return msg;
};

const togglePlay = (toggle) => {
  looping = toggle;
};

const loop = () => {
  const now = Date.now();
  if (scene >= 0 && looping && (now - last >= tempo)) {
    last = now;

    clearStep();

    currentStep = (currentStep + 1) % maxSteps;

    onStep();
  }
  setTimeout(loop, 10);
};

const init = () => {
  // Initial scene
  newScene(scene);

  loop();

  return maxSteps;
};
