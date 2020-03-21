const Launchpad = require('launchpad-mini');
const EventEmitter = require('events');

const EDGE_ROW = 8;
const FN_START_ROW = 4;
const SIZE = 8;

const MODS = { 4: 'E', 5: 'F', 6: 'G', 7: 'H' };

let manualStep = false;
let maxSteps = 0;
let modifier = null;

const events = new EventEmitter();

let pad = new Launchpad();

const setKey = (key) => {
  const color = key.pressed ? pad.red :
        key.y < (SIZE / 2) ? pad.amber : pad.yellow
  pad.col(color, key);
};

const onStep = (step, prevStep) => {
  if (modifier) { return; }

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
    resetTopRow();
  }
};

const setModifier = (newMod) => {
  modifier = newMod;
  resetTopRow();
};

const setModValue = (val) => {
  for (let i = 0; i < SIZE; i++) {
    pad.col(i <= val ? pad.green : pad.off, [ i, EDGE_ROW ]);
  }

  console.log('Modified', MODS[modifier], 'value', val);

  events.emit('modifier', MODS[modifier], val);
};

const resetButtons = () => {
  // Initial colors
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 8; y++) {
      pad.col(y < 4 ? pad.amber : pad.yellow, [ x, y ]);
    }
  }
};

const resetTopRow = () => {
  for (let i = 0; i < SIZE; i++) {
    pad.col(pad.off, [ i, EDGE_ROW ]);
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
      // Square buttons
      if (k.y < EDGE_ROW && k.x < EDGE_ROW) {
        setKey(k);
        events.emit('key', k);
        return;
      }

      // Top row – steps
      if (k.y === EDGE_ROW) {
        if (modifier) {
          if (k.pressed) {
            setModValue(k.x);
          }
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

      // Rightmost column, upper part – scenes
      if (k.x === EDGE_ROW && k.y < FN_START_ROW) {
        if (k.pressed) {
          events.emit('scene', k.y);
        }
        return;
      }

      setModifier(k.pressed ? k.y : null);
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
