/*******************************************************************************************
  sequencer.js - a demo sequencer.

  Copyright: David Humphrey, Charles Cliffe (2010).
  License: MIT License


  Usage:

    var s = new Sequencer({ foo: "bar"}, // A global, shared namespace for data
                            function(shared) {
                              // Controller Function run on each call to runFrame

                              // Globals are accessible via the shared variable
                              doSomethingWithGlobal(shared.foo);
                            }
                          });

    s.setDebug(true); // debug messages are off by default

    // Adding a simple Sequence to the Sequencer
    s.add(new Sequence({timeIndex: 3}));

    // Other optional things can be specified for a Sequence
    s.add(new Sequence({ timeIndex: 4,
                         name: "The City",
                         preload: function(shared) {}, // preload data for this Sequence..
                         start:   function(shared) {}, // do something when Sequence starts
                         stop:    function(shared) {}, // do something when Sequence stops
                         step:    function(shared) {} // iterate the sequence
                       });

    // Sequences can have Overlays, which are like Sequences, but are bound to a Sequence
    var o1 = new Overlay({ name: "Picture1"
                           start: function(shared) {}, // what to do when it gets shown.
                           stop:  function(shared) {}, // what to do when it gets removed.
                         });

    var o2 = new Overlay({ preload: function(shared) {}, // this needs preloading
                           preloadTime: 2, // when to preload
                           start: function(shared) {}, // do this on start
                           step:  function(shared) {}, // do this every call iteration
                           stop:  function(shared) {}, // do this when stopping
                         });

    // A Sequence can have Overlays
    s.add(new Sequence({ name: "Monster",
                         overlays: [o1, o2], // add both Overlays to this Sequence
                       });

    // Start the Sequencer to kick-off preloading (e.g., during intro)
    s.start();

    // ... within timeout or other callback, run Sequencer frames:
    s.runFrame(someTimeIndex);


  Notes:

    Sequence and Overlay functions are always passed the shared object namespace,
    and all global variables should be attached to this object.  As a convenience
    the current time index is also automatically stored on the shared object, and
    any Sequence of Overlay function that needs to know the current time index can
    use:

      shared.currentTimeIndex

*******************************************************************************************/

(function(undefined) {

  var __empty_func = function(){},
      __debug      = false,
      __log        = function(msg) {
                       if (!__debug || !console) return;
                       console.log("Sequencer Debug: " + msg);
                     };

  /* Overlay: an object representing a "scene within a scene".  Sequences contain
   *          overlays, and are started, stoped, and run in time with them.
   *
   * Overlay Properties:
   *  name: optional overlay name.
   *  preloadTime: optional time to start preloading, otherwise 0 (zero).
   *  loaded: whether the overlay is fully loaded (i.e., has preload run).
   *  requiresPreloading: true if this overlay needs to be preloaded.
   *
   * Overlay Functions: All functions take one arg, shared -- a shared namespace.
   *  preload: optional function called at startup (or preloadTime) to
   *           preload resources.
   *  start: optional function called when overlay is shown.
   *  step: optional function called on each draw iteration.
   *  stop: optional function called when overlay is removed.
   */
  var Overlay = this.Overlay = (function() {
    var count = 0;

    return function(config) {
      this.name               = config.name || 'overlay-' + count++;
      this.preload            = config.preload || __empty_func;
      this.requiresPreloading = !!config.preload;
      this.preloadTime        = this.requiresPreloading ?
                                  config.preloadTime || 0 :
                                  undefined;
      this.loaded             = config.preload ? false : true;
      this.start              = config.start || __empty_func;
      this.step               = config.step || __empty_func;
      this.stop               = config.stop || __empty_func;
    };
  })();

  /* Sequence: an object representing a timed sequence, with zero or more
   *           child overlays.  Sequences are maintained by the Sequencer.
   *
   * Sequence Properties:
   *  name: a unique name for this sequence, used as a key.
   *  timeIndex: the time at which this sequence is to be started.
   *  timeOffset: TODO...
   *  running: true if the sequence is currently running.
   *  overlays: an array of zero or more Overlay objects.
   *  preloadTime: optional time to start preloading, otherwise zero.
   *  loaded: whether the sequence is loaded (preload has run).
   *
   * Sequence Functions:
   *  preload: optional function called at startup (or preloadTime) to
   *           preload resources.  Preload triggers preloading of Overlays.
   *  start: optional function called when sequence is shown.
   *  step: optional function called on each draw iteration.
   *  stop: optional function called when sequence should be stopped.
   */
  var Sequence = this.Sequence = (function() {
    var count = 0;

    return function(config) {
      this.name = config.name || "sequence-" + count++;
      this.timeIndex = config.timeIndex;
      this.timeOffset = config.timeOffset;
      this.running = false;

      this.overlays = config.overlays || [];

      var __controller = null;

      this.setController = function(sequencer) {
        __controller = sequencer;
      };

      this.loaded = config.preload ? false : true;

      this.requiresPreloading = !!config.preload;
      this.preloadTime        = this.requiresPreloading ?
                                  config.preloadTime || 0 :
                                  undefined;
      this.preload = (function(aFunc, aSequence) {
        var func = aFunc,
            sequence = aSequence,
            overlays = aSequence.overlays;
        return function(shared) {
          if (!sequence.loaded) {
            func(shared);
            sequence.loaded = true;
          }
        };
      })(config.preload || __empty_func, this);

      this.requiresPreload = !!config.preload;

      this.start = (function(aFunc, aOverlays) {
        var func = aFunc,
            overlays = aOverlays;
        return function(shared) {
          for (var i=0, ol=overlays.length; i<ol; i++) {
            overlays[i].start(shared);
            __log("Started overlay " + overlays[i].name);
          }
          func(shared);
          this.running = true;
        };
      })(config.start || __empty_func, this.overlays);

      this.step = (function(aFunc, aOverlays) {
        var func = aFunc,
            overlays = aOverlays;
        return function(shared) {
          for (var i=0, ol=overlays.length; i<ol; i++) {
            overlays[i].step(shared);
            __log("Stepped overlay " + overlays[i].name);
          }
          func(shared);
        };
      })(config.step || __empty_func, this.overlays);

      this.stop = (function(aFunc, aOverlays) {
        var func = aFunc,
            overlays = aOverlays;
        return function(shared) {
          for (var i=0, ol=overlays.length; i<ol; i++) {
            overlays[i].stop(shared);
            __log("Stopped overlay " + overlays[i].name);
          }
          func(shared);
          this.running = false;
        };
      })(config.stop || __empty_func, this.overlays);
    };
  })();


  /* Sequencer: a controller used to run sequences, and their overlays.
   *
   * Sequencer Properties:
   *  shared: an optional shared namespace object for variables shared between
   *          sequences and overlays.  The shared object is always passed to
   *          Sequence and Overlay functions.
   *
   * Sequence Functions:
   *  add: adds a Sequence (and all its Overlays).
   *  runFrame: for a given time index, figures out what to do for all Sequences
   *            and Overlays.
   *  getSequenceByName: returns a Sequence, given a unique name.
   *  setDebug: enable or disable debug output.
   */
  this.Sequencer = function(shared, runFrameFunc) {
    var _shared       = this.shared = shared || {},
        _runFrameFunc = runFrameFunc || __empty_func,
        _preloadList  = [],
        _sequenceList = [],
        _sequences    = {};

    this.shared.currentTimeIndex = -1;

    this.add = function(seq) {
      seq.setController(this);

      _sequenceList.push(seq);
      _sequenceList.sort(function(a, b) {
        return (a.timeIndex - b.timeIndex);
      });
      _sequences[seq.name] = seq;

      if (seq.requiresPreloading) {
        _preloadList.push(seq);
        _preloadList.sort(function(a, b) {
          return (a.preloadTime - b.preloadTime);
        });
      };

      for (var i=0, ol=seq.overlays.length; i<ol; i++) {
        var overlay = seq.overlays[i];
        if (overlay.requiresPreloading) {
          _preloadList.push(overlay);
          _preloadList.sort(function(a, b) {
            return (a.preloadTime - b.preloadTime);
          });
        }
      }
    };

    this.preload = this.start = function() {
      preload(0);
    };

    function preload(timeIndex) {
      for (var i=0, sl=_preloadList.length; i<sl; i++) {
        var p = _preloadList[i];
        if (timeIndex >= p.preloadTime && !p.loaded) {
          __log("Preloading " + p.name);
          p.preload(_shared);
          p.loaded = true;
        }
        // TODO: should rewrite to not iterate beyond this timeIndex...
      }
    }

    var _lastSequence = new Sequence({timeIndex: -1});

    this.runFrame = function(timeIndex) {
      var seqChoice = null;

      preload(timeIndex);

      for (var i=0, sl=_sequenceList.length; i<sl; i++) {
        var seq = _sequenceList[i];
        if (timeIndex >= seq.timeIndex) {
          seqChoice = seq;
        }
      }

      if (!seqChoice) {
        return;
      }

      // Cache current time index on the global shared object.
      this.shared.currentTimeIndex = timeIndex;

      if (seqChoice.timeIndex !== _lastSequence.timeIndex) {
        _lastSequence.stop(this.shared);
        __log("Stopped sequence " + _lastSequence.name);

        if (!seqChoice.running) {
          seqChoice.start(this.shared);
          __log("Started sequence " + seqChoice.name);
        }

        _lastSequence = seqChoice;
      } else {
        _lastSequence.step(this.shared);
        __log("Stepped sequence " + _lastSequence.name);
      }

      // TODO: should this run first (e.g., above if) or here?
      _runFrameFunc(this.shared);
    };

    this.getSequenceByName = function(name) {
      return _.sequences[name];
    };

    this.setDebug = function(debugState) {
      __debug = debugState;
    }
  };
})();
