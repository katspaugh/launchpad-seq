const Launchpad = require('launchpad-mini');
const EventEmitter = require('events');

const SIZE = 8;
const STEPS = 16;
const EDGE_ROW = SIZE;
const REC_Y = EDGE_ROW - 1;
const PLAY_Y = EDGE_ROW - 2;

const pad = new Launchpad();
const events = new EventEmitter();

const buttons = [];
const prevButtons = [];
for (let x = 0; x <= SIZE; x++) {
  buttons[x] = [];
  prevButtons[x] = [];
  for (let y = 0; y <= SIZE; y++) {
    buttons[x][y] = pad.off;
    prevButtons[x][y] = pad.off;
  }
}

let scene = 0;
let layout = 0;
let recording = false;
let playing = true;

const updateButtons = () => {
  buttons.forEach((row, x) => {
    row.forEach((val, y) => {
      if (val && prevButtons[x][y] !== val) {
        pad.col(val, [ x, y ]);
        prevButtons[x][y] = val;
      }
    });
  });
};

const layoutTypes = {
  drums: {
    activePads: {},

    color([ x, y ]) {
      const { activePads } = this;
      const rows = Math.round(STEPS / SIZE);

      const color = y < rows ? pad.green :
        y < rows * 2 ? pad.amber :
        y < rows * 3 ? pad.green :
        pad.amber;

      const id = `${x}_${y}`;
      return id in (activePads[scene] || {}) ? color.full : color.low;
    },

    onPad(k) {
      const { activePads } = this;
      const rows = Math.round(STEPS / SIZE);
      const id = `${k.x}_${k.y}`;
      const isActive = id in (activePads[scene] || {});

      events.emit((isActive ? 'drums-remove' : 'drums-add'), {
        track: Math.floor(k.y / rows),
        step: k.x + SIZE * (k.y % rows),
        on: k.pressed
      });

      if (!k.pressed) { return; }

      if (isActive) {
        delete activePads[scene][id];
      } else {
        activePads[scene] = activePads[scene] || {};
        activePads[scene][id] = true;
      }

      buttons[k.x][k.y] = this.color([ k.x, k.y ]);
      updateButtons();
    },

    onStep(step) {
      const rows = Math.round(STEPS / SIZE);
      for (let y = 0; y < SIZE; y += rows) {
        const kx = step % SIZE;
        const ky = y + (step < SIZE ? 0 : 1);
        buttons[kx][ky] =  pad.red;
      }
      updateButtons();
    },

    onSceneCopy(newScene) {
      const { activePads } = this;
      activePads[newScene] = { ...activePads[scene] };
    }
  },

  notes: {
    track: 4,
    noteColor: pad.amber,

    editStep: -1,
    activeKey: null,

    color([ x, y ]) {
      const { noteColor } = this;
      return y < (STEPS / SIZE) ? pad.green : noteColor;
    },

    onPad(k) {
      const { editStep } = this;
      const rows = Math.round(STEPS / SIZE);

      if (k.y < rows) {
        events.emit('notes-edit', k.x + k.y * SIZE, k.pressed);
        this.activeStep = k.pressed ? k.x + k.y * SIZE : -1;
        return;
      }

      buttons[k.x][k.y] = k.pressed ? pad.red : this.noteColor;
      updateButtons();

      events.emit('notes-add', {
        step: editStep === -1 ? undefined : editStep,
        on: k.pressed,
        track: this.track,
        index: k.x + (k.y - rows) * SIZE
      }, k);
    },

    onStep(step) {
      const x = step % SIZE;
      const y = Math.floor(step / SIZE);
      buttons[x][y] = pad.red;
      updateButtons();
    },

    onNote(k, track) {
      if (track !== this.track) { return; }

      drawLayout();
      buttons[k.x][k.y] = k.pressed ? pad.red : this.noteColor;
      updateButtons();
    }
  }
};

const layouts = [
  layoutTypes.drums,
  layoutTypes.notes,
  {
    ...layoutTypes.notes,
    track: 5,
    noteColor: pad.yellow
  }
];

const drawLayout = () => {
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const color = layouts[layout].color([ x, y ]);
      buttons[x][y] = color;
    }

    buttons[EDGE_ROW][x] = pad.off;
  }

  layouts.forEach((item, index) => {
    buttons[index][EDGE_ROW] = index === layout ? pad.green.full : pad.green.low;
  });
  buttons[EDGE_ROW][scene] = pad.green;
  buttons[EDGE_ROW][PLAY_Y] = playing ? pad.green.full : pad.green.low;
  buttons[EDGE_ROW][REC_Y] = recording ? pad.red.full : pad.red.low;
};

const onPad = (k) => {
  layouts[layout].onPad(k);
};

const onTopButton = (k) => {
  if (!k.pressed && k.x < layouts.length) {
    onLayoutChange(k.x);
  }
};

const onSideButton = (k) => {
  if (!k.pressed) { return; }

  if (k.y === REC_Y) {
    return onRecButton();
  }
  if (k.y === PLAY_Y) {
    return onPlayButton();
  }

  const copyKey = pad.pressedButtons.find(([ x, y ]) => x === k.x && y !== k.y);
  if (copyKey) {
    onSceneCopy(k.y);
    events.emit('scene-copy', k.y, copyKey[1]);
  } else {
    events.emit('scene-change', k.y);
  }
};

const onRecButton = () => {
  recording = !recording;
  events.emit('recButton', recording);

  drawLayout();
  updateButtons();
};

const onPlayButton = () => {
  playing = !playing;
  events.emit('playButton', playing);

  drawLayout();
  updateButtons();
};

const onStep = (step) => {
  drawLayout();
  layouts[layout].onStep(step);
};

const onNote = (index, track) => {
  layouts[layout].onNote && layouts[layout].onNote(index, track);
};

const onSceneChange = (index, prevIndex) => {
  scene = index;
  drawLayout();
  buttons[EDGE_ROW][index] = pad.green;
  updateButtons();
};

const onSceneCopy = (index) => {
  layouts[layout].onSceneCopy && layouts[layout].onSceneCopy(index);
};

const onLayoutChange = (index) => {
  layout = index;
  drawLayout();
  updateButtons();
};

const init = () => {
  // Connect
  pad.connect().then(() => {
    pad.reset(0);

    drawLayout();

    // Initial scene
    events.emit('init');

    // On button press
    pad.on('key', k => {
      // Square buttons
      if (k.y < EDGE_ROW && k.x < EDGE_ROW) {
        onPad(k);
        return;
      }

      // Top row
      if (k.y === EDGE_ROW) {
        onTopButton(k);
      }

      // Rightmost column
      if (k.x === EDGE_ROW) {
        onSideButton(k);
      }
    });

    process.on('exit', () => {
      pad.reset(0);
      pad.disconnect();
    });
  });
};

module.exports = {
  on: events.on.bind(events),
  init,
  onStep,
  onNote,
  onSceneChange
};
