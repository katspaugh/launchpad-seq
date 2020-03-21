const Launchpad = require('launchpad-mini');
const midiOut = require('./midi');

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

const EDGE_ROW = 8;
const SIZE = 8;

let currentStep = 0;
let maxSteps = 16;
let scene = -1;
const sequences = new Array(SIZE).fill(null).map(() => []);

let tempo = 150;
let last = Date.now();
let manualStep = false;

const pad = new Launchpad();
const cvPal = midiOut.connect('CVpal');

const clearStep = () => {
  const seq = sequences[scene];
  const notes = seq[currentStep];

  if (notes) {
    notes.forEach(msg => {
      const offMsg = [ msg[0] - 16, msg[1], 0 ];
      //cvPal.sendMessage(offMsg);
      pad.col(msg.key.y < (SIZE / 2) ? pad.amber : pad.yellow, msg.key);
    });
  }

  pad.col(pad.off, [ Math.round(currentStep * (SIZE / maxSteps)), EDGE_ROW ]);
};

const onStep = () => {
  const seq = sequences[scene];
  const notes = seq[currentStep];

  if (notes) {
    notes.forEach(msg => {
      cvPal.sendMessage(msg);
      pad.col(pad.red, msg.key);
    });
  }

  pad.col(pad.green, [ Math.round(currentStep * (SIZE / maxSteps)), EDGE_ROW ]);
};

const newScene = (index) => {
  pad.col(pad.off, [ EDGE_ROW, scene ]);
  scene = index;
  pad.col(pad.green, [ EDGE_ROW, scene ]);
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

const loop = () => {
  const now = Date.now();
  if (scene >= 0 && !manualStep && (now - last >= tempo)) {
    last = now;

    clearStep();

    currentStep = (currentStep + 1) % maxSteps;

    onStep();
  }
  setTimeout(loop, 10);
};

// Connect
pad.connect().then(() => {
  pad.reset(0);

  // Initial colors
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      pad.col(y < 4 ? pad.amber : pad.yellow, [ x, y ]);
    }
  }

  // Initial scene
  newScene(scene);

  // On button press
  pad.on('key', k => {
    // Square buttons
    if (k.y < EDGE_ROW && k.x < EDGE_ROW) {
      pad.col(k.pressed ? pad.red : k.y < (SIZE / 2) ? pad.amber : pad.yellow, k);

      if (k.pressed) {
        const msg = newMessage(k);
        cvPal.sendMessage(msg);

        const seq = sequences[scene];
        if (!seq) { return; }

        let notes = seq[currentStep];
        if (!notes) {
          notes = seq[currentStep] = [];
        }

        if (manualStep) {
          const existing = seq[currentStep].findIndex(item => item.join() === msg.join());
          if (existing >= 0) {
            notes.splice(existing, 1);
          } else {
            notes.push(msg);
          }
        } else {
          notes.push(msg);
        }
      }

      if (manualStep) {
        clearStep();
        onStep();
      }

      return;
    }

    // Top row – steps
    if (k.y === EDGE_ROW) {
      if (!sequences[scene]) { return; }

      if (k.pressed) {
        pad.col(pad.off, [ currentStep, EDGE_ROW ]);
        clearStep();

        let nextStep =  Math.round(k.x * (maxSteps / SIZE));
        if (pad.isPressed([ ((k.x + 1) % SIZE), k.y ])) {
          nextStep += 1;
        } else if (pad.isPressed([ ((k.x + 1) % SIZE), k.y ])) {
          nextStep -= 1;
        }
        currentStep = nextStep % maxSteps;

        onStep();
      }
      manualStep = k.pressed;
      return;
    }

    // Rightmost column – scenes
    if (k.x === EDGE_ROW) {
      if (k.pressed) {
        newScene(k.y === scene ? -1 : k.y);
      }
    }
  });

  loop();

  process.on('exit', () => {
    pad.reset(0);
    pad.disconnect();
  });
});
