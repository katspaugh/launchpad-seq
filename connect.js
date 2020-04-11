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

const size = 8;
let scale = allScales.ionian;
let output;

const newMessage = (channel, note, on) => {
  const velocity = on ? 127 : 0;
  const status = (on ? 144 : 128) + channel;
  return [ status, note, velocity ];
};

const setScale = (value) => {
  const keys = Object.keys(allScales);
  const key = keys[value];
  scale = allScales[key] || allScales.semitones;
};

const init = (outputName) => {
  output = midiOut.connect(outputName);

  launchpad.init();

  launchpad.on('drums-add', ({ track, step, on }) => {
    const msg = newMessage(track, track === 3 ? 46 : 36 + track * 2, on);
    sequencer.addNote(msg, step);
  });

  launchpad.on('drums-remove', ({ track, step, on }) => {
    const msg = newMessage(config.channelDrums, track === 3 ? 46 : 36 + track * 2, on);
    sequencer.removeNote(msg, step);
  });

  launchpad.on('notes-add', ({ track, index, step, on }) => {
    const channel = track === 0 ? config.channelA : config.channelB;
    const octaves = Math.floor(index / scale.length);
    const msg = newMessage(channel, 36 + scale[index % scale.length] + octaves * 12, on);
    msg.key = index;
    msg.track = track;

    sequencer.removeNote(msg, step);
    sequencer.addNote(msg, step);

    output.sendMessage(msg);
  });

  launchpad.on('notes-edit', (index, toggle) => {
    sequencer.togglePlay(!toggle);
    if (toggle) {
      sequencer.onStep(index);
    }
  });

  launchpad.on('topButton', index => {
    if (index < 3) {
      launchpad.onLayoutChange(index);
    }
  });

  launchpad.on('sideButton', index => {
    sequencer.setScene(index);
  });

  launchpad.on('init', () => {
    sequencer.on('step', (step, prevStep) => {
      launchpad.onStep(step, prevStep);
    });

    sequencer.on('note', msg => {
      console.log(msg);
      output.sendMessage(msg);

      if (msg.key != null) {
        launchpad.onNote(msg.key, msg.track);
      }
    });

    sequencer.on('scene', (scene, prevScene) => {
      launchpad.onSceneChange(scene, prevScene);
    });

    sequencer.init();
  });
};

exports.init = init;
