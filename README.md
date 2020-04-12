# Novation Launchpad Sequencer

A polyphonic 16-step sequencer. Sequences can be chained for complete songs.

### Install

```
npm install
```

### Configure
In `config.js`, you can set which MIDI channels the sequencer outputs to. By default, it's 1, 2, 3 and 4.
Can be configured to up to 6 different channels.

### Run

Connect a Launchpad device (tested with Launchpad Mini) to the computer. Launch the script:

```
npm start PreenFM
```

Where PreenFM is your destination MIDI device.

### Pad layout

<img src="https://user-images.githubusercontent.com/381895/79075517-a11ab280-7cf3-11ea-9ad9-0720ae1f14da.png" width="430" />

The right-side column represents patterns.

* Pads A-F switch between 6 multi-channel sequences.
* Pad G toggles play/pause
* Pad H (the last pad) triggers the recording mode.

The top row switches launchpad layouts and activates special functions.

1. Four drum tracks
2. A single melody track with 48 note keys
3. A second melody track
4. _No function yet_
5. _No function yet_
6. _No function yet_
7. _No function yet_
8. Scene chaining – hold it and press pads A-F in a desired order to chain them.

#### Drum tracks

<img src="https://user-images.githubusercontent.com/381895/79075748-f99e7f80-7cf4-11ea-8682-c26055d6d5c8.jpeg" width="430" />

#### Melody track

<img src="https://user-images.githubusercontent.com/381895/79075760-0327e780-7cf5-11ea-9d84-981912d41f48.jpeg" width="430" />
