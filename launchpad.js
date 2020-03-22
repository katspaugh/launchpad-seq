const Launchpad = require('launchpad-mini');
const EventEmitter = require('events');

const EDGE_ROW = 8;
const SHIFT_KEY = 7;
const SIZE = 8;

let manualStep = false;
let maxSteps = 0;
let isShift = false;
let modValue = -1;

const events = new EventEmitter();

let pad = new Launchpad();

const setKey = (key) => {
  const color = key.pressed ? pad.red :
        key.y < (SIZE / 2) ? pad.amber : pad.yellow
  pad.col(color, key);
};

const onStep = (step, prevStep) => {
  if (isShift) { return; }

  const ratio = maxSteps / SIZE;
  if ((step % ratio) === 0) {
    pad.col(pad.off, [ Math.floor(prevStep / ratio), EDGE_ROW ]);
    pad.col(pad.green, [ Math.ceil(step / ratio), EDGE_ROW ]);
  }
};

const onSceneChange = (scene, prevScene) => {
  if (prevScene !== -1) {
    pad.col(pad.off, [ EDGE_ROW, prevScene ]);
  }
  if (scene !== -1) {
    pad.col(pad.green, [ EDGE_ROW, scene ]);
  }

  resetButtons();

  if (scene === -1) {
    colorTopRow(-1);
  }
};

const colorTopRow = (val) => {
  for (let i = 0; i < SIZE; i++) {
    pad.col(i <= val ? pad.green : pad.off, [ i, EDGE_ROW ]);
  }
};

const setModValue = (val) => {
  console.log('Modified', val);
  events.emit('modifier', val);
  modValue = val;
  colorTopRow(val);
};

const resetButtons = () => {
  // Initial colors
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      pad.col(y < 4 ? pad.amber : pad.yellow, [ x, y ]);
    }
  }
};

const init = (steps) => {
  maxSteps = steps;

  // Connect
  pad.connect().then(() => {
    pad.reset(0);

    resetButtons();

    // Initial scene
    events.emit('init');

    // On button press
    pad.on('key', k => {
      isShift = pad.isPressed([ EDGE_ROW, SHIFT_KEY ]);

      // Square buttons
      if (k.y < EDGE_ROW && k.x < EDGE_ROW) {
        setKey(k);
        events.emit('key', k);
        return;
      }

      // Top row – steps
      if (k.y === EDGE_ROW) {
        if (isShift) {
          if (k.pressed) { setModValue(k.x); }
          return;
        }

        if (k.pressed) {
          let nextStep =  Math.round(k.x * (maxSteps / SIZE));
          if (pad.isPressed([ ((k.x + 1) % SIZE), k.y ])) {
            nextStep += 1;
          } else if (pad.isPressed([ ((k.x + 1) % SIZE), k.y ])) {
            nextStep -= 1;
          }
          events.emit('edit', nextStep % maxSteps);
        } else {
          events.emit('edit', null);
        }
        return;
      }

      // Shift key
      if (k.x === EDGE_ROW && k.y === SHIFT_KEY) {
        colorTopRow(isShift ? modValue : -1);
        return;
      }

      // Rightmost column, upper part – scenes
      if (k.x === EDGE_ROW && k.y != SHIFT_KEY) {
        if (!k.pressed) { return; }
        events.emit('scene', k.y, isShift);
      }
    });

    process.on('exit', () => {
      pad.reset(0);
      pad.disconnect();
    });
  });

  return SIZE;
};

const getSize = () => SIZE;

module.exports = {
  on: events.on.bind(events),
  init,
  setKey,
  onStep,
  onSceneChange,
  getSize
};
