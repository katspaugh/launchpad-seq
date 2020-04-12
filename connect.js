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
let recording = false;
let editingStep = null;;

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

  launchpad.on('recButton', rec => {
    recording = rec;
  });

  launchpad.on('playButton', play => {
    sequencer.togglePlay(play);
  });

  launchpad.on('drums-add', ({ track, step, on }) => {
    const msg = newMessage(track, track === 3 ? 46 : 36 + track * 2, on);
    sequencer.addNote(msg, step);
  });

  launchpad.on('drums-remove', ({ track, step, on }) => {
    const msg = newMessage(track, track === 3 ? 46 : 36 + track * 2, on);
    sequencer.removeNote(msg, step);
  });

  launchpad.on('notes-add', ({ track, index, step, on }, key) => {
    const channel = track === 0 ? config.channelA : config.channelB;
    const octaves = Math.floor(index / scale.length);
    const msg = newMessage(channel, 36 + scale[index % scale.length] + octaves * 12, on);

    if (editingStep != null) {
      sequencer.replaceNote(msg, editingStep);
    } else if (recording) {
      msg.key = key;
      msg.track = track;
      sequencer.addNote(msg, step);
    }

    output.sendMessage(msg);
  });

  launchpad.on('notes-edit', (index, toggle) => {
    editingStep = toggle ? index : null;
    sequencer.togglePlay(!toggle);

    if (toggle) {
      sequencer.onStep(index);
    }
  });

  launchpad.on('scene-change', index => {
    sequencer.setScene(index);
  });

  launchpad.on('scene-copy', (index, copyIndex) => {
    sequencer.copyScene(index, copyIndex);
  });

  launchpad.on('init', () => {
    sequencer.on('step', (step) => {
      launchpad.onStep(step);
    });

    sequencer.on('note', msg => {
      console.log(msg.join(', '));
      output.sendMessage(msg);

      if (msg.key != null && msg[2] > 0) {
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
