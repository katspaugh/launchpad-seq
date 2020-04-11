const Launchpad = require('launchpad-mini');
const EventEmitter = require('events');

const SIZE = 8;
const STEPS = 16;
const EDGE_ROW = SIZE;

const pad = new Launchpad();
const events = new EventEmitter();

const layouts = {
  drums: {
    rows: 2,

    activePads: {},

    color([ x, y ]) {
      const { rows, activePads } = this;

      const color = y < rows ? pad.green :
        y < rows * 2 ? pad.amber :
        y < rows * 3 ? pad.green :
        pad.amber;

      const id = `${x}_${y}`;
      return id in activePads ? color.full : color.low;
    },

    onPad(k) {
      const { rows, activePads } = this;
      const id = `${k.x}_${k.y}`;
      const isActive = id in activePads;

      events.emit((isActive ? 'drums-remove' : 'drums-add'), {
        track: Math.floor(k.y / rows),
        step: k.x + SIZE * (k.y % rows),
        on: k.pressed
      });

      if (!k.pressed) { return; }

      if (isActive) {
        delete activePads[id];
      } else {
        activePads[id] = true;
      }

      pad.col(this.color([ k.x, k.y ]), k);
    },

    onStep(step, prevStep) {
      const { rows } = this;
      for (let y = 0; y < SIZE; y += rows) {
        const prevKey = [ prevStep % SIZE, y + (prevStep < SIZE ? 0 : 1)];
        pad.col(this.color(prevKey), prevKey);
        pad.col(pad.red, [ step % SIZE, y + (step < SIZE ? 0 : 1) ]);
      }
    }
  },

  notes: {
    rows: 2,

    track: 0,

    noteColor: pad.amber,

    editStep: -1,
    activeIndex: -1,

    color([ x, y ]) {
      const { rows, noteColor } = this;
      return y < rows ? pad.green : noteColor;
    },

    onPad (k) {
      const { rows, editStep, track, noteColor } = this;

      if (k.y < rows) {
        events.emit('notes-edit', k.x + k.y * SIZE, k.pressed);
        this.activeStep = k.pressed ? k.x + k.y * SIZE : -1;
        return;
      }

      pad.col(k, k.pressed ? pad.red : noteColor);

      events.emit('notes-add', {
        step: editStep === -1 ? undefined : editStep,
        on: k.pressed,
        track: track,
        index: k.x + (k.y - rows) * SIZE
      });
    },

    onStep(step, prevStep) {
      const { rows } = this;

      [ step, prevStep ].forEach(item => {
        const x = item % SIZE;
        const y = Math.floor(item / SIZE);
        const key = [ x, y ];
        pad.col(item === step ? pad.red : this.color(key), key);
      });
    },

    _colorIndex(index, color) {
      const { rows } = this;
      const x = index % SIZE;
      const y = Math.floor(index / SIZE) + rows;
      pad.col(color, [ x, y ]);
    },

    onNote(index, track) {
      if (track !== this.track) { return; }

      const { activeIndex, noteColor } = this;

      if (activeIndex != -1) {
        this._colorIndex(activeIndex, noteColor);
      }
      this._colorIndex(index, pad.red);
      this.activeIndex = index;
    }
  }
};

layouts.notes2 = {
  ...layouts.notes,
  noteColor: pad.yellow,
  track: 1
};

let currentLayout = layouts.notes;

const drawLayout = () => {
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      const k = [ x, y ];
      const color = currentLayout.color(k);
      pad.col(color, k);
    }
  }
};

const onPad = (k) => {
  currentLayout.onPad(k);
};

const onTopButton = (k) => {
  events.emit('topButton', k.x);
};

const onSideButton = (k) => {
  events.emit('sideButton', k.y);
};

const onStep = (step, prevStep) => {
  currentLayout.onStep(step, prevStep);
};

const onNote = (index, track) => {
  currentLayout.onNote && currentLayout.onNote(index, track);
};

const onSceneChange = (index) => {
};

const onLayoutChange = (index) => {
  const keys = Object.keys(layouts);
  currentLayout = layouts[keys[index]];
  drawLayout();
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
  onSceneChange,
  onLayoutChange
};
