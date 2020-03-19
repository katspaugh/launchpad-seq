const Launchpad = require('launchpad-mini');
const midiOut = require('./midi');

const pad = new Launchpad();
const cvPal = midiOut.connect('CVpal');

const allScales = {
  ionian: [
    0,
    2,
    4,
    5,
    7,
    9,
    11,
    12
  ]
};

const scale = allScales.ionian;

const EDGE_ROW = 8;

let currentStep = 0;
let maxSteps = 8;

const sequences = [
  new Array(maxSteps).fill(null),
  new Array(maxSteps).fill(null)
];

const speed = 300;
let last = Date.now();
let prevs = [];
let manualStep = false;

const onStep = () => {
  for (let i = 0; i < 2; i++) {
    const msg = sequences[i][currentStep];

    if (msg) {
      cvPal.sendMessage(msg);

      pad.col(pad.red, msg.key);
    }

    if (prevs[i]) {
      pad.col(i < 1 ? pad.amber : pad.yellow, prevs[i].key);
    }

    prevs[i] = msg;
  }

  pad.col(pad.green, [ currentStep, EDGE_ROW ]);
};

const loop = () => {
  const now = Date.now();
  if (!manualStep && (now - last >= speed)) {
    last = now;
    pad.col(pad.off, [ currentStep, EDGE_ROW ]);
    currentStep = (currentStep + 1) % maxSteps;
    onStep();
  }
  setTimeout(loop, 100);
};

loop();

pad.connect().then(() => {
  pad.reset(0);

  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      pad.col(y < 4 ? pad.amber : pad.yellow, [ x, y ]);
    }
  }

  pad.on('key', k => {
    const octave = k.y >= 4 ? k.y - 4 : k.y;

    if (k.y < EDGE_ROW && k.x < EDGE_ROW) {
      const msg = [ k.y < 4 ? 146 : 147, 36 + scale[k.x] + octave * 12, k.pressed ? 100 : 0 ];

      msg.key = [ k.x, k.y ];

      if (k.pressed) {
        cvPal.sendMessage(msg);
      }

      if (k.pressed) {
        const seqI = k.y < 4 ? 0 : 1;
        const prevMsg = sequences[seqI][currentStep];
        sequences[seqI][currentStep] = prevMsg && msg.join('') === prevMsg.join('') ? null : msg;
      }

      pad.col(k.pressed ? pad.red : k.y < 4 ? pad.amber : pad.yellow, k);

      if (manualStep) {
        onStep();
      }

    } else if (k.y === EDGE_ROW) {
      if (k.pressed) {
        pad.col(pad.off, [ currentStep, EDGE_ROW ]);
        currentStep = k.x;
        onStep();
      }
      manualStep = k.pressed;
    }
  });
});

process.on('exit', () => {
  pad.reset(0);
});

