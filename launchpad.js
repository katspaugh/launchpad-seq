const Launchpad = require('launchpad-mini');
const EventEmitter = require('event-emitter');

const EDGE_ROW = 8;
const SIZE = 8;

let manualStep = false;
let maxSteps = 0;

const events = new EventEmitter();

let pad = new Launchpad();

const clearKey = (key) => {
  pad.col(key.y < (SIZE / 2) ? pad.amber : pad.yellow, key);
};

const onStep = (step, prevStep) => {
  pad.col(pad.off, [ Math.round(prevStep * (SIZE / maxSteps)), EDGE_ROW ]);
  pad.col(pad.green, [ Math.round(step * (SIZE / maxSteps)), EDGE_ROW ]);
};

const onSceneChange = (scene, prevScene) => {
  pad.col(pad.off, [ EDGE_ROW, prevScene ]);
  pad.col(pad.green, [ EDGE_ROW, scene ]);
};

const init = () => {
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
    events.on('init');

    // On button press
    pad.on('key', k => {
      // Square buttons
      if (k.y < EDGE_ROW && k.x < EDGE_ROW) {
        pad.col(k.pressed ? pad.red : k.y < (SIZE / 2) ? pad.amber : pad.yellow, k);

        if (k.pressed) {
          events.on('key', k);
        }

        return;
      }

      // Top row – steps
      if (k.y === EDGE_ROW) {
        if (k.pressed) {
          let nextStep =  Math.round(k.x * (maxSteps / SIZE));
          if (pad.isPressed([ ((k.x + 1) % SIZE), k.y ])) {
            nextStep += 1;
          } else if (pad.isPressed([ ((k.x + 1) % SIZE), k.y ])) {
            nextStep -= 1;
          }
          events.on('step', nextStep % maxSteps);
        }
        events.on('step', null);
        return;
      }

      // Rightmost column – scenes
      if (k.x === EDGE_ROW) {
        if (k.pressed) {
          events.on('scene', k.y);
        }
      }
    });

    process.on('exit', () => {
      pad.reset(0);
      pad.disconnect();
    });
  });
};
