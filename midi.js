const midi = require('midi');

function connect(outputName) {
  const output = new midi.Output();

  const outs = output.getPortCount();
  for (let i = 0; i < outs; i++) {
    const name = output.getPortName(i);
    console.log(name);
    if (name.includes(outputName)) {
      output.openPort(i);
      console.log('Connected output', outputName);
    }
  }

  process.on('exit', () => {
    output.close();
  });

  return output;
}

exports.connect = connect;
