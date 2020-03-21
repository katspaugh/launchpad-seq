const midiOut = require('./midi');
const launchpad = require('./launchpad');
const sequencer = require('./sequencer');
const config = require('./config.json');

const allScales = {
  semitones: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
  ],

  ionian: [
    0, 2, 4, 5, 7, 9, 11, 12
  ],

  aeolian: [
    0, 2, 3, 5, 7, 8, 10, 12
  ]
};

const size = launchpad.getSize();
let scale = allScales.ionian;
let output;

const newMessage = (k) => {
  const channel = k.y < (size / 2) ? config.channelA : config.channelB;
  const row = k.y % (size / 2);
  const octave = Math.floor((k.x + size * row) / scale.length);
  const note = 36 + scale[(k.x + size * row) % scale.length] + octave * 12;
  const velocity = k.pressed ? 127 : 0;
  const msg = [ (k.pressed ? 144 : 128) + channel, note, velocity ];
  msg.key = k;
  return msg;
};

const setScale = (value) => {
  const keys = Object.keys(allScales);
  const key = keys[value];
  scale = allScales[key] || allScales.semitones;
};

const modifiers = {
  E: (val) => sequencer.setTempo(val / size),
  F: setScale
};

const init = (outputName) => {
  output = midiOut.connect(outputName);

  launchpad.init(config.maxSteps);

  // On button press
  launchpad.on('key', k => {
    const msg = newMessage(k);
    output.sendMessage(msg);
    sequencer.addNote(msg);
  });

  launchpad.on('scene', scene => {
    sequencer.setScene(scene);
  });

  launchpad.on('edit', step => {
    sequencer.togglePlay(step == null);
    sequencer.onStep(step);
  });

  launchpad.on('modifier', (mod, value) => {
    if (modifiers[mod]) {
      modifiers[mod](value);
    }
  });

  launchpad.on('init', () => {
    sequencer.on('step', (step, prevStep) => {
      launchpad.onStep(step, prevStep);
    });

    sequencer.on('note', msg => {
      launchpad.setKey(msg.key);
      output.sendMessage(msg);
    });

    sequencer.on('scene', (scene, prevScene) => {
      launchpad.onSceneChange(scene, prevScene);
    });

    sequencer.init(config.maxSteps);
  });
};

exports.init = init;
