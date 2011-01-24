  window.bd = null;
  var kick_det;
  var vu;
  var m_BeatTimer = 0;
  var m_BeatCounter = 0;
  var clearClr = [0,0,1];
  var ftimer = 0;


  var bufferSize = 0;
  var signal = new Float32Array(bufferSize);
  var channels = 0;
  var rate = 0;
  var frameBufferLength = 0;
  var fft = null;

  function loadedMetadata()
  {
    var audio = document.getElementById('audio1');

    initVU();

    channels      = audio.mozChannels;
    rate              = audio.mozSampleRate;
    frameBufferLength = audio.mozFrameBufferLength;

    bufferSize = frameBufferLength/channels;

    fft = new FFT(bufferSize, rate);
    signal = new Float32Array(bufferSize);

    audio.addEventListener("MozAudioAvailable",audioWritten,false);
  }
  function audioWritten(event)
  {
    if (fft == null) return;
    var fb = event.frameBuffer;
    for (var i = 0, fbl = bufferSize; i < fbl; i++) {
      // Assuming interlaced stereo channels,
      // need to split and merge into a stero-mix mono signal
      signal[i] = (fb[2*i] + fb[2*i+1]) / 2;
    }

    fft.forward(signal);
    //                              timestamp = document.getElementById('audio1').currentTime;
    timestamp = event.time;

    bd.process( timestamp, fft.spectrum );
    // Bass Kick detection
    kick_det.process(bd);
    if (bd.win_bpm_int_lo)
    {
      m_BeatTimer += bd.last_update;

      if (m_BeatTimer > (60.0/bd.win_bpm_int_lo))
      {
        m_BeatTimer -= (60.0/bd.win_bpm_int_lo);
        clearClr[0] = 0.5+Math.random()/2;
        clearClr[1] = 0.5+Math.random()/2;
        clearClr[2] = 0.5+Math.random()/2;
        m_BeatCounter++;
      }
    }

    ftimer += bd.last_update;
    if (ftimer > 1.0/30.0)
    {
      vu.process(bd,1.0/30.0);
      //                                      drawScene();
      ftimer = 0;
    }

  }

  function initVU() {
    window.bd = new BeatDetektor();
    window.kick_det = new BeatDetektor.modules.vis.BassKick();
    window.vu = new BeatDetektor.modules.vis.VU();
  }

  function updateVU(cubes) {
    if (!vu) return;
    var c = 0;
    for (var i = -5; i < 5; i++)
    {
      for (var j = -5; j < 5; j++)
      {
        var sc = 1+vu.vu_levels[c]*5;
        cubes[c].setZ(-sc/2);
        cubes[c].setScale(1,1,sc);
        c++;
      }
    }
  }

