(function () {

  var gl,
      canvas,
      video,
      fxChain,
      db = new CubicVR.DeferredBin(),
      shaderScanlineShake,
      shaderScanlineShake2,
      shaderKickSine,
      shaderColorTear,
      shaderQuarterBloom,
      shaderCheapTV,
      currentCamera,
      playing = true,
      aspect = 1280 / 720;

  var startResourceLoading = (function () {
    function loadResource(loadFunc, sceneId) {
      var done = loadFunc(sceneId);
      if (done) {
        return;
      }

      setTimeout((function (loadFunc, sceneId) {
        return function () {
          loadResource(loadFunc, sceneId);
        };
      })(loadFunc, sceneId), 25);
    }

    return function (sceneId) {
      loadResource(function (sceneId) {
        db.loadNextImage(sceneId);
        return db.isImageBinEmpty(sceneId);
      }, sceneId);

      loadResource(function (sceneId) {
        db.loadNextMesh(sceneId);
        return db.isMeshBinEmpty(sceneId);
      }, sceneId);
    };
  })();

  this.setSize = function () {
    function resize(id) {
      var elem = document.getElementById(id);
      var canvas_w, canvas_h, aspect;
      aspect = 1280 / 720;
      canvas_w = window.innerWidth;
      canvas_h = canvas_w * (1.0 / aspect);
      var toppx, leftpx;
      if (canvas_h > window.innerHeight) {
        canvas_h = window.innerHeight;
        canvas_w = window.innerHeight * aspect;
        toppx = 0;
        leftpx = (window.innerWidth / 2) - (canvas_w / 2);
      } else {
        toppx = (window.innerHeight / 2) - (canvas_h / 2);
        leftpx = 0;
      }

      elem.width = canvas_w;
      elem.height = canvas_h;
      elem.style.width = canvas_w + "px";
      elem.style.height = canvas_h + "px";
      elem.style.left = leftpx + "px";
      elem.style.top = toppx + "px";
    }

    resize('cubicvr-canvas');

    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      fxChain.resize(canvas.width, canvas.height);
    }
  };

  var intro = this.intro = (function () {

    var scene,
        stopSign,
        goSign,
        startPlane,
        titlePlane,
        titleFunc,
        titlePlaneMat,
        loadingPlane,
        introCredits = [],
        introLoaded = false,
        moveMonitor,
        revTimer = false,
        timerMilliseconds,
        timerSeconds = 0,
        timerLastSeconds = 0,
        lp12,
        audioOutput,
        qSource = 0,
        fSource = 0;

    function setupShaderFX(width, height) {
      fxChain = new CubicVR.PostProcessChain(width, height, true);

      // simple convolution test shader 3
      shaderScanlineShake = new CubicVR.PostProcessShader({
        shader_vertex: "fx_general.vs",
        shader_fragment: "scanline_shake.fs",
        init: function (shader) {
          shader.addFloat("kickSource", 4.0);
          shader.addFloat("timerSeconds", 0.0);
        },
        onupdate: function (shader) {
          shader.setFloat("timerSeconds", timerSeconds);
          shader.setFloat("kickSource", fSource);
        },
        enabled: false
      });

      // sine wave color tear + kick
      shaderColorTear = new CubicVR.PostProcessShader({
        shader_vertex: "fx_general.vs",
        shader_fragment: "kick_sine.fs",
        init: function (shader) {
          shader.addFloat("kickSource", 0.0);
        },
        onupdate: function (shader) {
          shader.setFloat("kickSource", qSource);
        },
        enabled: false
      });

      // Bloom + 1/4 divisor + blend
      shaderQuarterBloom = new CubicVR.PostProcessShader({
        shader_vertex: "CubicVR/post_shaders/fx_general.vs",
        shader_fragment: "CubicVR/post_shaders/bloom_6tap.fs",
        outputMode: CubicVR.enums.post.output.ADD,
        outputDivisor: 2,
        enabled: false
      });

      // sine wave color tear + kick
      shaderKickSine = new CubicVR.PostProcessShader({
        shader_vertex: "CubicVR/post_shaders/fx_general.vs",
        shader_fragment: "shader_custom/kick_sine.fs",
        init: function (shader) {
          shader.addFloat("kickSource", 0.0);
        },
        onupdate: function (shader) {
          shader.setFloat("kickSource", audioData.clap.val / 2);
        },
        enabled: false
      });

      shaderCheapTV = new CubicVR.PostProcessShader({
        shader_vertex: "CubicVR/post_shaders/fx_general.vs",
        shader_fragment: "shader_custom/cheap_tv.fs",
        init: function (shader) {
          shader.addFloat("kickSource", 0.0);
        },
        onupdate: function (shader) {
          shader.setFloat("kickSource", audioData.glitch.val / 2);
        },
        enabled: false
      });

      fxChain.addShader(shaderKickSine);
      fxChain.addShader(shaderScanlineShake);
      fxChain.addShader(shaderColorTear);
      fxChain.addShader(shaderQuarterBloom);
      fxChain.addShader(shaderCheapTV);
    }

    var mix = (function () {
      var w = window.innerWidth,
          h = window.innerHeight,
          clientX,
          clientY,
          lastMove;

      function fade() {
        if (lp12.cutoff === 22050 && lp12.resonance === 1) {
          qSource = 0;
          fSource = 0;
          return;
        }

        var cutoff = Math.floor(Math.min(lp12.cutoff * 1.2, 22050));
        var resonance = Math.floor(Math.max(lp12.resonance * 0.8, 1));

        lp12.set(cutoff, resonance);

        qSource = qSource * 0.8;
        fSource = fSource * 0.8;
      }

      moveMonitor = setInterval(function () {
        if ((new Date().getTime()) - lastMove >= 100) {
          fade();
        }
      }, 0);

      return function (event) {
        lastMove = +new Date();
        clientX = event.clientX;
        clientY = event.clientY;
        qSource = (clientY / h);
        fSource = (clientX / w);
        var w2 = w / 2,
            h2 = h / 2,
            rads = -Math.atan2(w2 - clientX, h2 - clientY),
            dist = Math.sqrt(Math.pow(clientX - w2, 2) + Math.pow(clientY - h2, 2));
            x = Math.floor((rads + Math.PI) / (Math.PI * 8) * 22050 + 60),
            y = Math.floor(dist / w2 * 20 + 1);
        lp12.set(x, y);
      };
    })();

    function runTimer() {
      if (!timerMilliseconds) {
        timerMilliseconds = (new Date()).getTime();
        return;
      }

      var newTimerMilliseconds = (new Date()).getTime();

      timerLastSeconds = (newTimerMilliseconds - timerMilliseconds) / 1000.0;

      if (timerLastSeconds > (1 / 10)) {
        timerLastSeconds = (1 / 10);
      }

      if (timerSeconds > 21) {
        revTimer = true;
        timerSeconds = 21;
      }
      if (timerSeconds < 0) {
        revTimer = false;
        timerSeconds = 0;
      }

      timerSeconds += revTimer ? -timerLastSeconds : timerLastSeconds;
      timerMilliseconds = newTimerMilliseconds;
    }

    var drawScene = function () {
      runTimer();

      if (video.canPlayThrough) {
        onIntroLoaded();
      }

      scene.evaluate(timerSeconds);

      titleFunc();

      fxChain.begin();
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      var current_time = (new Date()).getTime();
      if (!introLoaded) {
        loadingPlane.visible = Math.round(current_time / 500) % 2 == 0;
      } else {
        startPlane.visible = Math.round(current_time / 1000) % 2 == 0;
      }
      scene.render();
      fxChain.end();

      gl.clearColor(0.0, 0.0, 1.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      fxChain.render();

      window.mozRequestAnimationFrame();
    };

    var onIntroLoaded = function () {
      if (introLoaded) {
        return;
      }
      introLoaded = true;
      loadingPlane.visible = false;
      stopSign.visible = false;
      goSign.visible = true;
    };

    var audioAvailable = function (event) {
      var signal = DSP.getChannel(DSP.MIX, event.frameBuffer);
      lp12.process(signal);
      audioOutput.mozWriteAudio(signal);
    };

    const TITLE_WAIT_TIME = 2000;
    var introCreditsIdx = 0;

    function titleOut() {
      titlePlane.rotation[1] = (titlePlane.rotation[1] + 5);
      if (titlePlane.rotation[1] >= 180) {
        titleFunc = titleWait;
        setTimeout(function () {
          titleFunc = titleIn;
          titlePlane.rotation[1] = -180;
          introCreditsIdx = (introCreditsIdx + 1) % introCredits.length;
          titlePlaneMat.setTexture(introCredits[introCreditsIdx], CubicVR.enums.texture.map.COLOR);
        }, 100);
      }
    }

    function titleIn() {
      titlePlane.rotation[1] = (titlePlane.rotation[1] + 5) % 360;
      if (titlePlane.rotation[1] >= 0) {
        titleFunc = titleWait;
        setTimeout(function () {
          titleFunc = titleOut;
        }, TITLE_WAIT_TIME);
      }
    }

    function titleWait() {}

    var introInterval;
    var name = "kraddy_intro_ff_logo_3d2.dae";

    return {
      start: function (aCanvas, glContext, aVideo) {
        gl = glContext;
        canvas = aCanvas;
        video = aVideo;

        scene = CubicVR.loadCollada(name, "./scene_images/", db);
        scene.evaluate(0);
        startResourceLoading(name);

        scene.setSkyBox(new CubicVR.SkyBox("./scene_images/sky1.jpg"));
        scene.camera.setDimensions(canvas.width, canvas.height);
        scene.camera.setTargeted(true);
        scene.camera.target = scene.getSceneObject("Empty").position;
        currentCamera = scene.camera;

        var light = new CubicVR.Light(CubicVR.enums.light.type.POINT);
        light.position = [6, 10, 8];
        light.distance = 75;
        light.diffuse = [1, 1, 1];
        light.specular = [1, 1, 1];
        scene.bindLight(light);

        loadingPlane = scene.getSceneObject("LoadingBox");

        titlePlane = scene.getSceneObject('TitleBox');
        titlePlaneMat = titlePlane.obj.getMaterial('TitleBoxMat-fx');
        titlePlane.rotation[1] = -180;
        titleFunc = titleIn;

        introCredits.push(new CubicVR.Texture('./scene_images/intro_credits_1.png'));
        introCredits.push(new CubicVR.Texture('./scene_images/intro_credits_2.png'));
        introCredits.push(new CubicVR.Texture('./scene_images/intro_credits_3.png'));
        introCredits.push(new CubicVR.Texture('./scene_images/intro_credits_4.png'));
        introCredits.push(new CubicVR.Texture('./scene_images/intro_credits_5.png'));
        introCredits.push(new CubicVR.Texture('./scene_images/intro_credits_6.png'));

        startPlane = scene.getSceneObject("StartBox");
        startPlane.visible = false;
        stopSign = scene.getSceneObject("StopSign");
        goSign = scene.getSceneObject("GoSign");
        goSign.visible = false;

        setupShaderFX(canvas.width, canvas.height);

        canvas.addEventListener('mousemove', mix, false);

        mono = document.getElementById('mono');
        lp12 = new IIRFilter(DSP.LOWPASS, 22050, 1, 44100);
        audioOutput = new Audio();
        audioOutput.mozSetup(1, 44100);

        mono.addEventListener('ended', function () {
          this.currentTime = 0;
        }, false);

        mono.addEventListener('MozAudioAvailable', audioAvailable, false);
        mono.play();

        shaderScanlineShake.enabled = true;
        shaderColorTear.enabled = true;

        window.addEventListener('MozBeforePaint', drawScene, false);
        window.mozRequestAnimationFrame();
      },
      resize: function () {
        setSize();
      },
      stop: function () {
        clearInterval(moveMonitor);
        canvas.removeEventListener('mousemove', mix, false);

        mono.removeEventListener('MozAudioAvailable', audioAvailable, false);
        mono.pause();
        audioOutput = null;
        window.removeEventListener('MozBeforePaint', drawScene, false);

        // Wipe the canvas for reuse by demo
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        shaderScanlineShake.enabled = false;
        shaderColorTear.enabled = false;
      }
    };
  })();


  /**
   * Sequences for Demo:
   *
   * createSequencer() returns sequencer:
   *   sequencer.start()
   *   sequencer.stop()
   */
    this.createSequencer = function (globals, callback) {

    var canvas = globals.canvas,
        audio = globals.audio,
        video = globals.video,
        gl = globals.gl,
        finishedCallback = callback || function(){};

    var runFrameFunc = window.runFrameFunc = function (shared) {
      if (!timerData.timerMilliseconds) {
        timerData.timerMilliseconds = +new Date();
        return;
      }

      gfxData.frameCounter++;

      var newTimerMilliseconds = new Date();
      timerData.timerLastSeconds = (newTimerMilliseconds - timerData.timerMilliseconds) / 1000.0;
      timerData.timerSeconds += timerData.timerLastSeconds;
      timerData.timerMilliseconds = newTimerMilliseconds;

      if (Math.abs(audio.currentTime - timerData.timerSeconds) > 0.3) {
        timerData.timerSeconds = audio.currentTime;
      }
    };

    var demoRunning = false,
        demoAnimationFunc = function (event) {
        seq.runFrame(timerData.timerSeconds);
        if (window.burst.on) {
          window.burst.frame(timerData.timerSeconds);
          if (window.updateSprites) window.updateSprites();
        }
        window.mozRequestAnimationFrame();
    };

    function startDemoInterval() {
      if (demoRunning) {
        return;
      }
      demoRunning = true;
      window.addEventListener('MozBeforePaint', demoAnimationFunc, false);
      window.mozRequestAnimationFrame();
    }

    function stopDemoInterval() {
      if (!demoRunning) {
        return;
      }

      demoRunning = false;
      window.removeEventListener('MozBeforePaint', demoAnimationFunc, false);
    }

    function update_scanline(shader) {
      shader.setFloat("timerSeconds", timerData.timerSeconds);
      shader.setFloat("kickSource", shader_val);
    } //update_scanline

    function update_tear(shader) {
      shader.setFloat("kickSource", shader_val);
    } //update_tear

    audio.addEventListener('pause', function () {
      stopDemoInterval();
    }, false);

    audio.addEventListener('play', function () {
      startDemoInterval();
    }, false);

    var seq = window.seq = new Sequencer(globals, runFrameFunc);

    /**
     * Sequences
     */
    var theCity = (function () {

      var collada,
          skybox,
          light,
          bitWall,
          kraddy,
          thug1,
          thug2,
          thug3,
          thug4,
          thug5;

      function initSprites() {

        // Instantiate BitWall Singleton
        bitWall = window.bitWall = new BitWall();

        // Load BitWall Sprites
        bitWall.addSprites([
          'models/kraddy.sprite',
          'models/thug1.sprite',
          'models/thug2.sprite',
          'models/thug3.sprite',
          'models/thug4.sprite',
          'models/thug5.sprite'
          ]);

        // Alias sprites for convenience
        kraddy = bitWall.kraddy;
        thug1 = bitWall.thug1;
        thug2 = bitWall.thug2;
        thug3 = bitWall.thug3;
        thug4 = bitWall.thug4;
        thug5 = bitWall.thug5;

        collada.getSceneObject("KraddySprite").obj.triangulateQuads();
        collada.getSceneObject("KraddySprite").obj.compile();
        collada.getSceneObject("KraddySprite").obj.segment_state[0] = 0;
        collada.getSceneObject("KraddySprite").bindChild(kraddy.sceneObject);
        kraddy.sceneObject.rotation = [0, 180, 0];
        kraddy.sceneObject.scale = [3, 3, 3];
        kraddy.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("BadDude1").bindChild(thug1.sceneObject);
        thug1.sceneObject.rotation = [0, 180, 0];
        thug1.sceneObject.scale = [3, 3, 3];
        thug1.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("BadDude2").bindChild(thug2.sceneObject);
        thug2.sceneObject.rotation = [0, 90, 0];
        thug2.sceneObject.scale = [3, 3, 3];
        thug2.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("BadDude3").bindChild(thug3.sceneObject);
        thug3.sceneObject.rotation = [0, 90, 0];
        thug3.sceneObject.scale = [3, 3, 3];
        thug3.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("BadDude4").bindChild(thug4.sceneObject);
        thug4.sceneObject.rotation = [0, 90, 0];
        thug4.sceneObject.scale = [3, 3, 3];
        thug4.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("BadDude5").bindChild(thug5.sceneObject);
        thug5.sceneObject.rotation = [0, 90, 0];
        thug5.sceneObject.scale = [3, 3, 3];
        thug5.sceneObject.position = [0, 0.5, 0];

        ////////////////////////////////////////////////////////////////////////////
        window.burst.load('city');

        var updateSprite = function (sprite) {
          if (window.burst.on) {
            var spriteName = sprite.spriteName,
                sceneObject = sprite.sceneObject,
                exports = burst.exports;
            sprite.action = exports[spriteName + 'Action'].action;

            var oldOpt = sprite.action;

            if (findActiveTrack("clap", audioData.audioPositionInRadians) !== null && spriteName.indexOf('thug') > -1) {
              var opts = ['punch'],
                  rndAct = opts[parseInt(Math.random() * opts.length)];;
              sprite.action = rndAct;
            } else {
              sprite.action = oldOpt;
            }

            sceneObject.position = exports[spriteName + 'Position'].position;
            sceneObject.rotation = exports[spriteName + 'Rotation'].rotation;
            sceneObject.scale = exports[spriteName + 'Scale'].scale;

          }
        };

        window.updateSprites = function () {
          updateSprite(kraddy);
          updateSprite(thug1);
          updateSprite(thug2);
          updateSprite(thug3);
          updateSprite(thug4);
          updateSprite(thug5);
        };

        if (window.location.hash === '#spriteGUI') {
          loadSpriteGUI();
        }

      };

      //////////////////////////////////////////////////////////////////////////

      function fxInit(width, height) {
        fxChain.setBlurOpacity(0.2);
        fxChain.setBlurIntensity(0.1);
        CubicVR.setGlobalAmbient([0.2, 0.2, 0.3]);
      }

      var vidSource, vidTexture;
      var vidActive = true;

      function setVidTex(state) {
        if (state) {
          collada.getSceneObject("Cube_028").obj
                 .getMaterial("JumboTron-fx")
                 .setTexture(vidTexture, CubicVR.enums.texture.map.COLOR);
          collada.getSceneObject("Cube_028").obj
                 .getMaterial("JumboTron-fx")
                 .setTexture(vidTexture, CubicVR.enums.texture.map.AMBIENT);
        } else {
          collada.getSceneObject("Cube_028").obj
                 .getMaterial("JumboTron-fx")
                 .setTexture(fxChain.inputBuffer.texture, CubicVR.enums.texture.map.COLOR);
          collada.getSceneObject("Cube_028").obj
                 .getMaterial("JumboTron-fx")
                 .setTexture(fxChain.inputBuffer.texture, CubicVR.enums.texture.map.AMBIENT);
        }
        vidActive = state;
      }

      function videoTextureInit() {
        vidSource = document.getElementById("intro-sleep");
        vidTexture = new CubicVR.Texture();
        setVidTex(true);
      }

      function updateVideoTexture() {
        if (timerData.timerSeconds > 23.2 && vidActive) setVidTex(false);
        else if (timerData.timerSeconds < 23.2 && !vidActive) setVidTex(true);

        if (!vidActive) return;
        gl.bindTexture(gl.TEXTURE_2D, CubicVR.Textures[vidTexture.tex_id]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vidSource);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      var name = 'models/intro_city-anim.dae';

      return new Sequence({
        name: name,
        timeIndex: 0,
        preload: function (shared) {
          collada = CubicVR.loadCollada(name, "./scene_images/"); // don't use deferred load
          collada.evaluate(0);

          skybox = new CubicVR.SkyBox(new CubicVR.Texture("./scene_images/sky1.jpg"));
          collada.setSkyBox(skybox);

          var camera = collada.camera;
          camera.setDimensions(canvas.width, canvas.height);
          camera.setTargeted(true);
          camera.target = collada.getSceneObject("Empty").position;

          initSprites();
          window.burst.on = false;
        },
        start: function (shared) {
          window.burst.on = true;
          canvas.style.display = "block";
          currentCamera = collada.camera;
          collada.attachOcTree(new CubicVR.OcTree(800, 6));

          shaderColorTear.enabled = true;
          shaderScanlineShake.enabled = true;

          fxInit(canvas.width, canvas.height);
          videoTextureInit();

          // Start audio analysis
          audioData.init(audio);
          audio.addEventListener("MozAudioAvailable", audioData.update, false);

          shaderScanlineShake.onupdate = function (shader) {
            shader.setFloat("kickSource", audioData.clap.val / 4.0);
            shader.setFloat("timerSeconds", timerData.timerSeconds);
          }

          shaderColorTear.onupdate = function (shader) {
            shader.setFloat("kickSource", audioData.glitch.val / 8.0);
          }

          audio.play();
          video.play();
        },
        step: function (shared) {
          bitWall.run(timerData.timerSeconds);
          shaderColorTear.enabled = (timerData.timerSeconds > 23.2) && (audioData.glitch.val > 0);
          shaderScanlineShake.enabled = (timerData.timerSeconds > 23.2) && (audioData.clap.val > 0);

          if (timerData.timerSeconds > 23.2) {
            fxChain.setBlurIntensity(audioData.bassdrum.val / 2);
          }

          for (var i = 0, l = collada.lights.length; i < l; i++) {
            var scaleVal = 1.0 + (((i % 2) == 0) ? audioData.clap.val : audioData.bassdrum.val) * 2.0;
            collada.lights[i].intensity = scaleVal;
          } //for
          updateVideoTexture();

          fxChain.begin();
          collada.evaluate(timerData.timerSeconds);
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          collada.render();
          fxChain.end();

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          fxChain.render();
        },
        stop: function (shared) {
          window.burst.on = false;
          shaderColorTear.enabled = false;
          shaderScanlineShake.enabled = false;
          collada.octree.destroy();
          collada = null;
          light = null;
          skybox = null;
          CubicVR.setGlobalAmbient([0, 0, 0]);
          fxChain.setBlurOpacity(1);
          fxChain.setBlurIntensity(0);
        }
      });
    })();

    var theStairs = (function () {
      var collada,
          light,
          ps,
          cylViz,
          gmlModels = [],
          currentTag = 0;

      function initParticles() {
        ps = new CubicVR.ParticleSystem(20000,
                                        true,
                                        new CubicVR.Texture("images/flare.png"),
                                        canvas.width,
                                        canvas.height,
                                        true);
      }

      function fxInit(width, height) {
        fxChain.setBlurOpacity(0.1);
        fxChain.setBlurIntensity(0.8);

        cylViz = new CubicVR.PJSTexture("pjstextures/cylinder_wrap.pde");
        collada.getSceneObject("Silo").obj
               .getMaterial("Material_001-fx")
               .setTexture(cylViz, CubicVR.enums.texture.map.COLOR);
        collada.getSceneObject("Silo").obj
               .getMaterial("Material_001-fx")
               .setTexture(cylViz, CubicVR.enums.texture.map.AMBIENT);
      }

      function evaluateGMLExplosion() {
        if (currentTag >= gmlModels.length) {
          return;
        }

        var targetObj = gmlModels[currentTag].targetObj;
        targetObj.visible = false;
        var iMax = targetObj.obj.points.length;

        for (var i = 0; i < iMax; i++) {
          var dVec = [10.0 * Math.sin(targetObj.rotation[1] * M_PI / 180.0) + (Math.random() - 0.5) * 30.0, (Math.random() - 0.5) * 40.0, 10.0 * Math.cos(targetObj.rotation[1] * M_PI / 180.0) + (Math.random() - 0.5) * 30.0];

          var p = new CubicVR.Particle(CubicVR.mat4.vec3_multiply(gmlModels[currentTag].targetObj.obj.points[i], gmlModels[currentTag].targetObj.tMatrix), timerData.timerSeconds, 5, dVec, [0, -9.8, 0]);

          p.color = new Float32Array([1, 1, 1]);
          ps.addParticle(p);
        }

        currentTag++;
      }

      (function () {
        var gmlData = [
          {
          expTime: 2963,
          gml: "gml/15-now.xml",
          ofs: [-1, -3, 0],
          scale: 1.5,
          res: [0.04, 0.007]
        },
          {
          expTime: 2964,
          gml: "gml/14-is.xml",
          ofs: [0, -4, 2],
          scale: 1.2,
          res: [0.03, 0.01]
        },
          {
          expTime: 2916,
          gml: "gml/13-future.xml",
          ofs: [-1, -4, 0],
          scale: 1.2,
          res: [0.03, 0.008]
        },
          {
          expTime: 2878,
          gml: "gml/12-the.xml",
          ofs: [0, -2, -2],
          scale: 1.2,
          res: [0.03, 0.008]
        },
          {
          expTime: 2841,
          gml: "gml/11-webgl.xml",
          ofs: [0, -2, 0],
          scale: 1.2,
          res: [0.03, 0.008]
        },
          {
          expTime: 2804,
          gml: "gml/10-canvas.xml",
          ofs: [0, -4, 0],
          scale: 1.2,
          res: [0.03, 0.008]
        },
          {
          expTime: 2766,
          gml: "gml/09-webm.xml",
          ofs: [0, -2, 0],
          scale: 1.4,
          res: [0.03, 0.008]
        },
          {
          expTime: 2729,
          gml: "gml/08-video.xml",
          ofs: [0, -4, 0],
          scale: 1.2,
          res: [0.03, 0.008]
        },
          {
          expTime: 2729,
          gml: "gml/07-ogg.xml",
          ofs: [0, -4, 0],
          scale: 1.2,
          res: [0.03, 0.008]
        },
          {
          expTime: 2690,
          gml: "gml/06-audio.xml",
          ofs: [0, -4.5, 1],
          scale: 1.4,
          res: [0.03, 0.01]
        },
          {
          expTime: 2653,
          gml: "gml/05-page.xml",
          ofs: [0, -3, 0],
          scale: 1.2,
          res: [0.04, 0.015]
        },
          {
          expTime: 2615,
          gml: "gml/04-web.xml",
          ofs: [0, -3.5, 0],
          scale: 1.5,
          res: [0.04, 0.015]
        },
          {
          expTime: 2578,
          gml: "gml/03-a.xml",
          ofs: [-3, -5, 0],
          scale: 2,
          res: [0.04, 0.02]
        },
          {
          expTime: 2541,
          gml: "gml/02-is.xml",
          ofs: [0, -5, 2],
          scale: 1.5,
          res: [0.04, 0.02]
        },
          {
          expTime: 2503,
          gml: "gml/01-this.xml",
          ofs: [1, -5, 0],
          scale: 1.7,
          res: [0.04, 0.02]
        }
        ];

        var logoTarget = 1;

        function loadGML() {
          var gmlModel = gmlData.pop();
          if (!gmlModel) {
            return;
          }

          var start = new Date().getTime();

          gml = new CubicVR.GML(gmlModel.gml);
          gml.recenter();
          gml.obj = gml.generateObject(0, 0, gmlModel.res[0], gmlModel.res[1]);
          gml.info = {
            scale: gmlModel.scale,
            ofs: gmlModel.ofs,
            res: gmlModel.res
          };
          gml.expTime = gmlModel.expTime;
          gmlModels.push(gml);
          setTimeout(loadGML, 10);
        }
        loadGML();
      })();

      function bindGML() {
        var rval = 180;

        for (var i = 0, l = gmlModels.length; i < l; i++) {
          var gml = gmlModels[i];

          var targetObj = collada.getSceneObject("LogoTarget" + (i + 1));
          targetObj.obj = gml.obj

          targetObj.rotation = [0, rval, 0];
          targetObj.scale = [8 * gml.info.scale, 8 * gml.info.scale, 5];
          var targetOfs = [0.15 * Math.sin(rval * M_PI / 180.0), 0, 0.15 * Math.cos(rval * M_PI / 180.0)];
          targetObj.position = CubicVR.vec3.add(CubicVR.vec3.add(targetObj.position, targetOfs), gml.info.ofs);
          gml.targetObj = targetObj;

          rval -= 90;
        }
      }

      function resetGML() {
        for (var i = 0, l = gmlModels.length; i < l; i++) {
          gmlModels[i].targetObj.visible = true;
        }
        currentTag = 0;
      }

      var name = '../models/json/viz_segment1.dae.json';

      return new Sequence({
        name: name,
        timeIndex: 97.88,
        preloadTime: 50,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            collada.camera.setDimensions(canvas.width, canvas.height);
            collada.camera.setTargeted(true);
            collada.camera.target = collada.getSceneObject("CamTarget").position;

            light = new CubicVR.Light(CubicVR.enums.light.type.POINT);
            light.distance = 100;
            light.intensity = 1.0;
            light.diffuse = [1, 1, 1];
            light.specular = [0.5, 0.5, 0.5];

            collada.bindLight(light);

            gl.clearColor(0.0, 0.0, 1.0, 1.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.depthFunc(gl.LEQUAL);
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0.3, 0.3, 0.3]);
          currentCamera = collada.camera;
          initParticles();
          bindGML();
          resetGML();
          fxInit(canvas.width, canvas.height);
          shaderQuarterBloom.enabled = true;
          shaderQuarterBloom.shader.use();
          shaderQuarterBloom.shader.setFloat("bloomRadius", 2.0);
        },
        step: function (shared) {
          collada.evaluate(shared.currentTimeIndex);
          light.position = CubicVR.vec3.add(CubicVR.vec3.add(collada.camera.position, CubicVR.vec3.multiply(CubicVR.vec3.normalize(CubicVR.vec3.subtract(collada.camera.target, collada.camera.position)), -10.0)), [0, 10, 0]);

          cylViz.update();

          if (timerData.timerSeconds > 118.52) {
            fxChain.setBlurIntensity(1.0);
          } else {
            fxChain.setBlurIntensity(0.3 + audioData.vu.vu_levels[0]);
          }

          fxChain.begin();
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          if (timerData.timerSeconds < 119) {
            collada.render();
          }

          ps.draw(collada.camera.mvMatrix, collada.camera.pMatrix, timerData.timerSeconds);
          fxChain.end();

          if (currentTag < gmlModels.length) {
            if (timerData.timerSeconds > gmlModels[currentTag].expTime / 25.0) {
              evaluateGMLExplosion();
            }
          }

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          fxChain.render();
        },
        stop: function (shared) {
          shaderQuarterBloom.enabled = false;
          shaderQuarterBloom.onupdate = null;
          fxChain.setBlurOpacity(1.0);
          fxChain.setBlurIntensity(0);
          light = null;
          ps = null;
          cylViz = null;
          collada = null;
        }
      });
    })();

    var subwayStation = (function () {
      var collada, light, thug1, thug2, rat1, rat2;

      var name = '../models/json/subway_station.dae.json';

      function initSprites() {

        // Instantiate BitWall Singleton
        bitWall = window.bitWall = new BitWall()

        // Load BitWall Sprites
        bitWall.addSprites([
          'models/thug1.sprite',
          'models/thug2.sprite',
          'models/smallrat1.sprite',
          'models/smallrat2.sprite'
          ]);

        // Alias sprites for convenience
        thug1 = bitWall.thug1;
        thug2 = bitWall.thug2;
        rat1 = bitWall.smallrat1;
        rat2 = bitWall.smallrat2;

        collada.getSceneObject("BadDude1").obj.triangulateQuads();
        collada.getSceneObject("BadDude1").obj.compile();
        collada.getSceneObject("BadDude1").obj.segment_state[0] = 0;

        collada.getSceneObject("BadDude2").obj.triangulateQuads();
        collada.getSceneObject("BadDude2").obj.compile();
        collada.getSceneObject("BadDude2").obj.segment_state[0] = 0;

        collada.getSceneObject("Rat1").obj.triangulateQuads();
        collada.getSceneObject("Rat1").obj.compile();
        collada.getSceneObject("Rat1").obj.segment_state[0] = 0;

        collada.getSceneObject("Rat2").obj.triangulateQuads();
        collada.getSceneObject("Rat2").obj.compile();
        collada.getSceneObject("Rat2").obj.segment_state[0] = 0;

        collada.getSceneObject("BadDude1").bindChild(thug1.sceneObject);
        thug1.sceneObject.rotation = [0, 180, 0];
        thug1.sceneObject.scale = [3, 3, 3];
        thug1.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("BadDude2").bindChild(thug2.sceneObject);
        thug2.sceneObject.rotation = [0, 90, 0];
        thug2.sceneObject.scale = [3, 3, 3];
        thug2.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("Rat1").bindChild(rat1.sceneObject);
        rat1.sceneObject.rotation = [0, 90, 0];
        rat1.sceneObject.scale = [4, 4, 4];
        rat1.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("Rat2").bindChild(rat2.sceneObject);
        rat2.sceneObject.rotation = [0, 90, 0];
        rat2.sceneObject.scale = [4, 4, 4];
        rat2.sceneObject.position = [0, 0.5, 0];


        ////////////////////////////////////////////////////////////////////////////
        window.burst.load('subway');

        var updateSprite = function (sprite) {
          if (window.burst.on) {
            var spriteName = sprite.spriteName + "Subway",
                sceneObject = sprite.sceneObject,
                exports = burst.exports;

            sceneObject.position = exports[spriteName + 'Position'].position;
            sceneObject.rotation = exports[spriteName + 'Rotation'].rotation;
            sceneObject.scale = exports[spriteName + 'Scale'].scale;

          }
        };

        window.updateSprites = function () {
          updateSprite(thug1);
          updateSprite(thug2);
          updateSprite(rat1);
          updateSprite(rat2);
        };

        if (window.location.hash === '#spriteGUI') {
          loadSpriteGUI();
        }

      };

      return new Sequence({
        name: name,
        preloadTime: 90,
        timeIndex: 119.8,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            collada.camera.setDimensions(canvas.width, canvas.height);
            collada.camera.setTargeted(true);
            collada.camera.target = collada.getSceneObject("CamTarget").position;
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          initSprites();
          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0.0, 0.0, 0.0]);
          currentCamera = collada.camera;
          fxChain.setBlurOpacity(1);
          fxChain.setBlurIntensity(0);
          collada.attachOcTree(new CubicVR.OcTree(1200, 6));
          shaderCheapTV.enabled = true;
          shaderCheapTV.onupdate = function (shader) {
            shader.setFloat("kickSource", audioData.clap.val);
          }
          window.burst.on = true;
        },
        step: function (shared) {
          collada.evaluate(timerData.timerSeconds);

          if (timerData.timerSeconds < 119.8 + 4.0) {
            var val = (timerData.timerSeconds - 119.8) / 4.0;

            for (var i = 0, iMax = collada.lights.length; i < iMax; i++) {
              collada.lights[i].intensity *= val;
            }
          }

          bitWall.run(timerData.timerSeconds);
          fxChain.begin();

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          collada.render();

          fxChain.end();

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          fxChain.render();
        },
        stop: function (shared) {
          light = null;
          collada.octree.destroy();
          collada = null;
          shaderCheapTV.enabled = false;
          window.burst.on = false;
        }
      });
    })();

    var subwayRun = (function () {
      var collada, light;

      var camera_x;
      var target_camera_x;
      var old_camera_x;
      var current_track_number;
      var next_track_number;
      var segments = [];
      var current_segment;
      var last_segment;
      var curve_length;
      var NUM_SEGMENTS = 5;
      var particle_systems;
      var won_last_segment;
      var starting_segment;
      var ending_segment;
      var div;
      var blink;
      var segments_visibility = [];
      var time_started;
      var shader_val;
      var pjs_viz;

      function onKeyDown(e) {
        if (current_segment) {
          if (e.keyCode == 37) {
            var new_number = Math.max(0, next_track_number - 1);
            if (current_segment.tracks[current_track_number].options[new_number]) {
              next_track_number = new_number;
            } //if
          } else if (e.keyCode == 39) {
            var new_number = Math.min(2, next_track_number + 1);
            if (current_segment.tracks[current_track_number].options[new_number]) {
              next_track_number = new_number;
            } //if
          } //if
          rotateArrow();
        } //if
      } //onKeyDown

      function onLoad() {
        window.addEventListener("keydown", onKeyDown, false);
      } //onLoad

      function onUnload() {
        window.removeEventListener("keydown", onKeyDown, false);
      } //onUnload

      function rotateArrow() {
        var img_arrow = document.getElementById('subway-gui-arrow');
        if (next_track_number === 0) {
          img_arrow.style.MozTransform = 'rotate(10deg)';
          img_arrow.style.left = "77px";
          img_arrow.style.top = "125px";
        } else if (next_track_number === 1) {
          img_arrow.style.MozTransform = 'rotate(97deg)';
          img_arrow.style.left = "90px";
          img_arrow.style.top = "115px";
        } else {
          img_arrow.style.MozTransform = 'rotate(170deg)';
          img_arrow.style.left = "100px";
          img_arrow.style.top = "125px";
        } //if
      } //rotateArrow

      function prepare_next_segment() {
        old_camera_x = camera_x;
        current_track_number = next_track_number;
        target_camera_x = -70 + next_track_number * 70;
        last_segment = current_segment;
        showNextSegment();
        current_segment = segments.shift();
        prepare_lights();
        adjustGui();
      } //prepare_next_segment

      function prepare_lights() {
        if (current_segment !== undefined) {
          for (var i = 0; i < 3; ++i) {
            if (current_segment.tracks[current_track_number].valid[i]) {
              current_segment.lights[i].diffuse = [0, 1, 0.1];
              current_segment.lights[i].specular = [0, 1, 0.1];
            } //if
          } //for
        } //if
      } //prepare_lights
      var startGame = function () {
        var tunnel_so,
            tunnel_r_so,
            tunnel_l_so,
            tracks_so,
            tracks_l_so,
            tracks_r_so,
            space_so,
            curve_mr_so,
            curve_ml_so,
            curve_lm_so,
            curve_rm_so,
            end_wall_so,
            stations_so,
            aabb,
            tracks_length,
            tunnel_length,
            space_length,
            curve_length;

        function copy_obj(original, z, x) {
          var obj = original.obj;
          if (x === undefined) {
            x = original.position[0];
          }
          var so = new CubicVR.SceneObject(obj);
          so.position = [x, original.position[1], z];
          so.scale = [original.scale[0], original.scale[1], original.scale[2]];
          so.rotation = [original.rotation[0], original.rotation[1], original.rotation[2]];
          collada.bindSceneObject(so);
          return so;
        }

        function make_red_light(position) {
          var red_light = new CubicVR.Light(CubicVR.enums.light.type.POINT,
                                            CubicVR.enums.light.method.STATIC);
          red_light.distance = 50;
          red_light.intensity = 1.5;
          red_light.diffuse = [1, 0, 0];
          red_light.specular = [1, 0, 0];
          red_light.position = position;
          collada.bindLight(red_light);
          return red_light;
        } //make_red_light

        function make_tunnel(x, zs, segment, segment_lights) {
          var zz = zs;
          for (var i = 0, maxI = tunnel_so.length; i < maxI; ++i) {
            var tunnel, red_light;
            if (i > 0) {
              zz = zs - (Math.abs(tunnel_so[i].position[2] - tunnel_so[0].position[2]));
            } //if
            tunnel = copy_obj(tunnel_so[i], zz, x);
            if (i === 0) {
              red_light = make_red_light([tunnel.position[0], 0, tunnel.position[2]]);
              segment_lights.push(red_light);
              segment_objs.push(red_light);
            } //if
            segment_objs.push(tunnel);
          } //for
        } //make_tunnel
        tunnel_so = [collada.getSceneObject("Tunnel1"),
                     collada.getSceneObject("Tunnel2"),
                     collada.getSceneObject("Tunnel3")];
        tunnel_r_so = [collada.getSceneObject("TunnelR1"),
                       collada.getSceneObject("TunnelR2"),
                       collada.getSceneObject("TunnelR3")];
        tunnel_l_so = [collada.getSceneObject("TunnelL1"),
                       collada.getSceneObject("TunnelL2"),
                       collada.getSceneObject("TunnelL3")];
        tracks_so = collada.getSceneObject("TracksM");
        tracks_l_so = collada.getSceneObject("TracksL");
        tracks_r_so = collada.getSceneObject("TracksR");
        space_so = collada.getSceneObject("StationSpace");
        curve_mr_so = collada.getSceneObject("CurvedTrackMR");
        curve_ml_so = collada.getSceneObject("CurvedTrackML");
        curve_lm_so = collada.getSceneObject("CurvedTrackLM");
        curve_rm_so = collada.getSceneObject("CurvedTrackRM");
        end_wall_so = collada.getSceneObject("EndWall");
        stations_so = [];
        stations_so.push(collada.getSceneObject("EmptyMesh"));
        stations_so.push(collada.getSceneObject("EmptyMesh_001"));
        stations_so.push(collada.getSceneObject("EmptyMesh_002"));
        stations_so.push(collada.getSceneObject("EmptyMesh_003"));
        stations_so.push(collada.getSceneObject("EmptyMesh_004"));
        stations_so.push(collada.getSceneObject("EmptyMesh_005"));

        aabb = tracks_so.getAABB();
        tracks_length = Math.abs(aabb[0][2] - aabb[1][2]) * 3;
        aabb = space_so.getAABB();
        space_length = Math.abs(aabb[0][2] - aabb[1][2]);
        aabb = curve_mr_so.getAABB();
        curve_length = Math.abs(aabb[0][2] - aabb[1][2]);
        tunnel_length = Math.abs(tunnel_so[0].getAABB()[0][2] - tunnel_so[2].getAABB()[1][2]);

        starting_segment = [];
        starting_segment.push(tunnel_so, tunnel_r_so, tunnel_l_so, tracks_so, tracks_l_so, tracks_r_so, space_so, curve_mr_so, curve_ml_so, curve_lm_so, curve_rm_so, stations_so[0], stations_so[1], stations_so[2], stations_so[3], stations_so[4], stations_so[5]);
        z = tracks_so.position[2] - tracks_length / 3;
        starting_segment.push(copy_obj(tracks_so, z, tracks_so.position[0]));
        starting_segment.push(copy_obj(tracks_so, z, tracks_l_so.position[0]));
        starting_segment.push(copy_obj(tracks_so, z, tracks_r_so.position[0]));
        z -= tracks_length / 3;
        starting_segment.push(copy_obj(tracks_so, z, tracks_so.position[0]));
        starting_segment.push(copy_obj(tracks_so, z, tracks_l_so.position[0]));
        starting_segment.push(copy_obj(tracks_so, z, tracks_r_so.position[0]));
        segments_visibility.push(starting_segment);

        var start_z = -tracks_so.position[2] + tracks_length;
        for (var i = 0; i < NUM_SEGMENTS; ++i) {
          var segment_objs = [];
          var segment_lights = [];
          var seg_tracks = [];
          var z;
          z = -start_z - (3 * i) * tracks_length;
          make_tunnel(tunnel_l_so[0].position[0], z, segment_objs, segment_lights);
          make_tunnel(tunnel_so[0].position[0], z, segment_objs, segment_lights);
          make_tunnel(tunnel_r_so[0].position[0], z, segment_objs, segment_lights);
          z = -start_z - (3 * i) * tracks_length - tracks_length * 3 + tracks_length / 2 - 1;
          segment_objs.push(copy_obj(space_so, z));
          segment_objs.push(copy_obj(stations_so[0], stations_so[0].position[2] - space_so.position[2] + z));
          segment_objs.push(copy_obj(stations_so[1], stations_so[1].position[2] - space_so.position[2] + z));
          segment_objs.push(copy_obj(stations_so[2], stations_so[2].position[2] - space_so.position[2] + z));
          segment_objs.push(copy_obj(stations_so[3], stations_so[3].position[2] - space_so.position[2] + z));
          segment_objs.push(copy_obj(stations_so[4], stations_so[4].position[2] - space_so.position[2] + z));
          segment_objs.push(copy_obj(stations_so[5], stations_so[5].position[2] - space_so.position[2] + z));
          for (var j = 0; j < 3; ++j) {
            z = -start_z - (3 * i + j) * tracks_length;
            segment_objs.push(copy_obj(tracks_so, z));
            segment_objs.push(copy_obj(tracks_so, z, tracks_l_so.position[0]));
            segment_objs.push(copy_obj(tracks_so, z, tracks_r_so.position[0]));
            segment_objs.push(copy_obj(tracks_so, z - tracks_length / 3));
            segment_objs.push(copy_obj(tracks_so, z - tracks_length / 3, tracks_l_so.position[0]));
            segment_objs.push(copy_obj(tracks_so, z - tracks_length / 3, tracks_r_so.position[0]));
            segment_objs.push(copy_obj(tracks_so, z - 2 * tracks_length / 3));
            segment_objs.push(copy_obj(tracks_so, z - 2 * tracks_length / 3, tracks_l_so.position[0]));
            segment_objs.push(copy_obj(tracks_so, z - 2 * tracks_length / 3, tracks_r_so.position[0]));

            var choice = Math.round(Math.random() * 3);
            var track_options = [false, false, false];
            var track_valids = [false, false, false];
            track_options[j] = true;
            track_valids[j] = true;

            z = -start_z - (3 * i) * tracks_length + tracks_length / 2;
            if (choice === 0) {
              //straight only
            } else if (choice === 1) {
              //left
              if (j > 0) {
                track_options[j - 1] = true;
                if (j == 1) {
                  segment_objs.push(copy_obj(curve_ml_so, z));
                } else {
                  segment_objs.push(copy_obj(curve_rm_so, z));
                } //if
                if (Math.random() < 0.5) {
                  track_valids[j] = false;
                  track_valids[j - 1] = true;
                } //if
              } //if
            } else if (choice === 2) {
              //right
              if (j < 2) {
                track_options[j + 1] = true;
                if (j == 1) {
                  segment_objs.push(copy_obj(curve_mr_so, z));
                } else {
                  segment_objs.push(copy_obj(curve_lm_so, z));
                } //if
                if (Math.random() < 0.5) {
                  track_valids[j] = false;
                  track_valids[j + 1] = true;
                } //if
              } //if
            } else {
              //all
              //left
              if (j > 0) {
                track_options[j - 1] = true;
                if (j == 1) {
                  segment_objs.push(copy_obj(curve_ml_so, z));
                } else {
                  segment_objs.push(copy_obj(curve_rm_so, z));
                } //if
              } //if
              //right
              if (j < 2) {
                track_options[j + 1] = true;
                if (j == 1) {
                  segment_objs.push(copy_obj(curve_mr_so, z));
                } else {
                  segment_objs.push(copy_obj(curve_lm_so, z));
                } //if
              } //if
              var r = Math.random();
              if (r < 0.33 && j < 2) {
                track_valids[j] = false;
                track_valids[j + 1] = true;
              } else if (r < 0.66 && j > 0) {
                track_valids[j] = false;
                track_valids[j - 1] = true;
              } //if
            } //if
            var track = {
              options: track_options,
              valid: track_valids
            };
            seg_tracks.push(track);
          } //for j - tracks
          var segment = {
            start: -start_z - (3 * i) * tracks_length + tracks_length * 0.66,
            end: -start_z - (3 * i) * tracks_length,
            tracks: seg_tracks,
            objects: segment_objs,
            lights: segment_lights
          };
          segments.push(segment);
          segments_visibility.push(segment.objects);

          for (var j = 0, max_j = segment_objs.length; j < max_j; ++j) {
            segment_objs[j].visible = false;
          } //for j
        } //for i
        var z, tunnel;
        ending_segment = [];
        ending_lights = [];
        z = -start_z - (3 * NUM_SEGMENTS) * tracks_length;
        make_tunnel(tunnel_l_so[0].position[0], z, ending_segment, ending_lights);
        make_tunnel(tunnel_so[0].position[0], z, ending_segment, ending_lights);
        make_tunnel(tunnel_r_so[0].position[0], z, ending_segment, ending_lights);
        for (var j = 0; j < 3; ++j) {
          z = -start_z - (3 * NUM_SEGMENTS + j) * tracks_length;
          ending_segment.push(copy_obj(tracks_so, z));
          ending_segment.push(copy_obj(tracks_so, z, tracks_l_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z, tracks_r_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - tracks_length / 3));
          ending_segment.push(copy_obj(tracks_so, z - tracks_length / 3, tracks_l_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - tracks_length / 3, tracks_r_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - 2 * tracks_length / 3));
          ending_segment.push(copy_obj(tracks_so, z - 2 * tracks_length / 3, tracks_l_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - 2 * tracks_length / 3, tracks_r_so.position[0]));
        } //for
        z = -start_z - (3 * NUM_SEGMENTS + 1) * tracks_length;
        make_tunnel(tunnel_l_so[0].position[0], z, ending_segment, ending_lights);
        make_tunnel(tunnel_so[0].position[0], z, ending_segment, ending_lights);
        make_tunnel(tunnel_r_so[0].position[0], z, ending_segment, ending_lights);
        end_wall_so.position[2] = -3986;
        ending_segment.push(end_wall_so);
        for (var j = 0; j < 3; ++j) {
          z = -start_z - (3 * (NUM_SEGMENTS + 1) + j) * tracks_length;
          ending_segment.push(copy_obj(tracks_so, z));
          ending_segment.push(copy_obj(tracks_so, z, tracks_l_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z, tracks_r_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - tracks_length / 3));
          ending_segment.push(copy_obj(tracks_so, z - tracks_length / 3, tracks_l_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - tracks_length / 3, tracks_r_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - 2 * tracks_length / 3));
          ending_segment.push(copy_obj(tracks_so, z - 2 * tracks_length / 3, tracks_l_so.position[0]));
          ending_segment.push(copy_obj(tracks_so, z - 2 * tracks_length / 3, tracks_r_so.position[0]));
        } //for
        for (var j = 0, max_j = ending_segment.length; j < max_j; ++j) {
          ending_segment[j].visible = false;
        } //for j
        segments_visibility.push(ending_segment);

        current_segment = segments.shift();

        collada.camera.setDimensions(canvas.width, canvas.height);
        collada.camera.setTargeted(true);
        collada.camera.target = collada.getSceneObject("CamTarget").position;

        camera_x = target_camera_x = 0;
        current_track_number = 1;
        next_track_number = 1;

        showNextSegment(1);

        adjustGui();
        rotateArrow();
        prepare_lights();

        //collada.collect_stats = true;
      } //startGame

      function showNextSegment(i) {
        if (i === undefined) {
          i = 2;
        } //if
        var segment_objs = segments_visibility[i];
        for (var j = 0, max_j = segment_objs.length; j < max_j; ++j) {
          segment_objs[j].visible = true;
        } //for j
      } //showNextSegment

      function hideLastSegment() {
        var segment_objs = segments_visibility.shift();
        for (var j = 0, max_j = segment_objs.length; j < max_j; ++j) {
          segment_objs[j].visible = false;
        } //for j
      } //hideLastSegment

      function adjustGui() {
        var img_red_left = document.getElementById('subway-gui-red-left');
        var img_red_up = document.getElementById('subway-gui-red-up');
        var img_red_right = document.getElementById('subway-gui-red-right');
        var img_green_left = document.getElementById('subway-gui-green-left');
        var img_green_up = document.getElementById('subway-gui-green-up');
        var img_green_right = document.getElementById('subway-gui-green-right');

        if (current_segment !== undefined) {
          if (current_segment.tracks[current_track_number].valid[0]) {
            img_red_left.style.visibility = "hidden";
            img_green_left.style.visibility = "visible";
          } else {
            img_red_left.style.visibility = "visible";
            img_green_left.style.visibility = "hidden";
          } //if
          if (current_segment.tracks[current_track_number].valid[1]) {
            img_red_up.style.visibility = "hidden";
            img_green_up.style.visibility = "visible";
          } else {
            img_red_up.style.visibility = "visible";
            img_green_up.style.visibility = "hidden";
          } //if
          if (current_segment.tracks[current_track_number].valid[2]) {
            img_red_right.style.visibility = "hidden";
            img_green_right.style.visibility = "visible";
          } else {
            img_red_right.style.visibility = "visible";
            img_green_right.style.visibility = "hidden";
          } //if
        } //if
      } //adjustGui

      function blinkGui() {
        function doBlink() {
          ++blink;
          if (blink % 2 == 0) {
            div.style.display = "none";
          } else {
            div.style.display = "block";
          } //if
        } //doBlink
        setTimeout(doBlink, 100);
        setTimeout(doBlink, 300);
        setTimeout(doBlink, 600);
        setTimeout(doBlink, 900);
        setTimeout(doBlink, 1200);
        setTimeout(doBlink, 1400);
        setTimeout(doBlink, 1600);
      } //blinkGui

      function update_scanline(shader) {
        shader.setFloat("timerSeconds", timerData.timerSeconds);
        shader.setFloat("kickSource", shader_val);
      } //update_scanline

      function update_tear(shader) {
        shader.setFloat("kickSource", shader_val);
      } //update_tear

      var name = '../models/json/subway_tunnel_run_simple.dae.json';

      return new Sequence({
        name: name,
        timeIndex: 164,
        preloadTime: 120,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            light = new CubicVR.Light(CubicVR.enums.light.type.POINT);
            light.distance = 150;
            light.intensity = 1.5;
            light.diffuse = [0.8, 0.8, 0.8];
            light.specular = [0.8, 0.8, 0.8];
            collada.bindLight(light);

            particle_systems = [
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_01.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_02.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_03.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_04.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_05.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_06.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_07.png"), canvas.width, canvas.height, true),
              new CubicVR.ParticleSystem(700, true, new CubicVR.Texture("images/sparks/sparks_08.png"), canvas.width, canvas.height, true)
              ];

            var obj = collada.getSceneObject("TunnelL1").obj;
            var mat = obj.getMaterial('TunnelVizMat-fx');
            mat.opacity = 0;

            collada.attachOcTree(new CubicVR.OcTree(10000, 4));
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          startGame();

          fxChain.setBlurOpacity(0.1);
          fxChain.setBlurIntensity(0.6);
          shaderScanlineShake.onupdate = update_scanline;
          shaderColorTear.onupdate = update_tear;

          shaderQuarterBloom.enabled = true;
          shaderScanlineShake.enabled = true;
          shaderColorTear.enabled = true;
          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0.0, 0.0, 0.0]);
          currentCamera = collada.camera;
          onLoad();
          time_started = timerData.timerSeconds;

          // prevent accumulator blur glitch
          fxChain.accumBuffer.use();

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT);

          fxChain.end();
        },
        step: function (shared) {
          var cam_offset = 0;
          if (last_segment !== undefined) {
            var l = Math.abs(last_segment.end - last_segment.start);
            var d = last_segment.start - collada.camera.position[2];
            var p = Math.abs(d) / l;
            var t = Math.min(1, p) * Math.PI / 2;
            var tar_t = Math.min(1, p) * Math.PI;
            var dir = target_camera_x - old_camera_x;
            camera_x = old_camera_x + Math.sin(t) * dir;
            var a = dir > 0 ? 1 : dir < 0 ? -1 : 0;
            cam_offset = Math.sin(tar_t) * d / l * a;

            if (collada.camera.position[2] < last_segment.end) {
              hideLastSegment();
              if (won_last_segment === false) {
                var n = 500 + Math.round(Math.random() * 50);
                for (var i = 0; i < n; ++i) {
                  var pos = [collada.camera.position[0] + (Math.random() - 0.5) * 10,
                                               collada.camera.position[1] + Math.random() * 4 - 8,
                                               collada.camera.position[2] - 20 + Math.random() * 10];
                  var px = 2 * (Math.random() - 0.5) + collada.camera.position[0] - pos[0];
                  var particle = new CubicVR.Particle(
                  pos, timerData.timerSeconds, 5, [px, (Math.random() + 1) * 10, -50 - 60 * (Math.random()) - (1 / (220 - timerData.timerSeconds) * 10)], [0, -5.1, 0]);
                  var v = Math.random() * 0.2;
                  particle.color = new Float32Array([.8 + v, .6 + v, .2 + v]);
                  particle_systems[i % particle_systems.length].addParticle(particle);
                } //for
              } //if
              last_segment = undefined;
            } //if
          } //if
          collada.evaluate(timerData.timerSeconds);
          collada.camera.position[0] += camera_x;
          collada.camera.target[0] = collada.camera.position[0] + cam_offset;
          collada.camera.target[2] = collada.camera.position[2] - 1;

          var cx = Math.sin(gfxData.frameCounter / 2) / 10 + Math.cos(gfxData.frameCounter / 2) / 20;
          var cy = Math.sin(gfxData.frameCounter / 5) / 10 + Math.cos(gfxData.frameCounter / 3) / 5;
          collada.camera.position[0] += cx;
          collada.camera.position[1] += cy;
          collada.camera.target[0] += cx;
          collada.camera.target[1] += cy;
          collada.camera.setClip(0.01, 250);

          if (div === undefined && timerData.timerSeconds > 175) {
            div = document.getElementById('subway-gui');
            div.style.display = "block";
            blink = 0;
            blinkGui();
          } //if
          if (current_segment) {
            if (current_segment['obj'] !== null) {
              if (collada.camera.position[2] < current_segment.start) {
                won_last_segment = (current_segment.tracks[current_track_number].valid[next_track_number] === true);

                prepare_next_segment();
              } //if
            } //if
          } //if
          light.position = CubicVR.vec3.add(CubicVR.vec3.add(collada.camera.position, CubicVR.vec3.multiply(CubicVR.vec3.normalize(CubicVR.vec3.subtract(collada.camera.target, collada.camera.position)), -10.0)), [0, 10, 0]);
          var time_diff = timerData.timerSeconds - time_started;
          light.intensity = Math.min(1.5, (time_diff) / 5);

          shader_val = (1 - Math.min(1, (time_diff) / 8)) * 2;
          fxChain.begin();
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          collada.render();
          for (var i = 0, l = particle_systems.length; i < l; ++i) {
            particle_systems[i].draw(collada.camera.mvMatrix, collada.camera.pMatrix, timerData.timerSeconds);
          } //for
          fxChain.end();
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          fxChain.render();
        },
        stop: function (shared) {
          pjs_viz = null;
          collada.octree.destroy();
          fxChain.setBlurOpacity(1.0);
          fxChain.setBlurIntensity(0);
          shaderQuarterBloom.enabled = false;
          shaderScanlineShake.enabled = false;
          shaderColorTear.enabled = false;
          shaderScanlineShake.onupdate = null;
          shaderColorTear.onupdate = null;
          segments = null;
          segments_visibility = null;
          div.style.display = "none";
          div = undefined;
          onUnload();
          light = null;
          collada = null;
        }
      });
    })();

    var subwayCrash = (function () {
      var collada,
          m_BeatTimer = 0,
          light;

      function sceneVizRun() {
        if (audioData.bd.win_bpm_int_lo) {
          m_BeatTimer += timerData.timerLastSeconds;

          if (m_BeatTimer > (60.0 / audioData.bd.win_bpm_int_lo)) {
            m_BeatTimer -= (60.0 / audioData.bd.win_bpm_int_lo);

            for (var i = 0, iMax = collada.lights.length - 1; i < iMax; i++) {
              collada.lights[i].diffuse = [0.6 + Math.random() / 2,
                                                           0.6 + Math.random() / 2,
                                                           0.6 + Math.random() / 2];
            }
          } //if
        } //if

        collada.lights[0].intensity = 1.0 + 3.0 * audioData.clap.val;
        collada.lights[1].intensity = 1.0 + 3.0 * audioData.bassdrum.val;

      } //sceneVizRun

      var name = '../models/json/chamber_subway_smash.dae.json';

      return new Sequence({
        name: name,
        timeIndex: 220.8,
        preloadTime: 200,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            collada.camera.setDimensions(canvas.width, canvas.height);
            collada.camera.setTargeted(true);
            collada.camera.target = collada.getSceneObject("CamTarget").position;

            light = new CubicVR.Light(CubicVR.enums.light.type.POINT, CubicVR.enums.light.method.STATIC);
            light.distance = 500;
            light.intensity = 1.0;
            light.diffuse = [0.5, 0.5, 0.5];
            light.specular = [0.5, 0.5, 0.5];

            collada.bindLight(light);
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0, 0, 0]);
          currentCamera = collada.camera;
          collada.attachOcTree(new CubicVR.OcTree(4000, 3));
        },
        step: function (shared) {
          sceneVizRun();
          collada.evaluate(timerData.timerSeconds);

          light.position = CubicVR.vec3.add(CubicVR.vec3.add(collada.camera.position, CubicVR.vec3.multiply(CubicVR.vec3.normalize(CubicVR.vec3.subtract(collada.camera.target, collada.camera.position)), -10.0)), [0, 10, 0]);

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          collada.render();
        },
        stop: function (shared) {
          collada.octree.destroy();
          CubicVR.setGlobalAmbient([0, 0, 0]);
          light = null;
          collada = null;
        }
      });
    })();

    var portalTex = null;

    var portal = (function () {
      var collada,
          light,
          tunnel,
          pjs_textures = [],
          boxObject,
          xp = 0,
          started = false,
          rBuf = null,
          rQuad = null;

      function tunnelFunc(q, ofs) {
        q /= 20;
        q += ofs;
        return [6.0 * (Math.cos(q) + Math.cos(M_PI * Math.sin(q * 0.58))), 6.0 * (Math.sin(q) - Math.sin(M_PI * Math.cos(q * 0.38)))];
      }

      var name = '../models/json/PortalParts.dae.json';

      return new Sequence({
        name: name,
        timeIndex: 297.3,
        preloadTime: 225,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            light = new CubicVR.Light(CubicVR.enums.light.type.DIRECTIONAL);
            light.setDirection([0.0, 0.5, -0.6]);
            light.intensity = 2.0;
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          if (started) {
            return;
          }

          tunnel = new MeshTunnel(tunnelFunc);

          // add to stream 0 (default)
          tunnel.addMesh(collada.getSceneObject("Wall1").obj);
          tunnel.addMesh(collada.getSceneObject("BoxTwist").obj);
          tunnel.addMesh(collada.getSceneObject("Ring1").obj);
          tunnel.addMesh(collada.getSceneObject("Ring2").obj);
          tunnel.addMesh(collada.getSceneObject("Tech1").obj);
          tunnel.addMesh(collada.getSceneObject("BoxHole").obj);
          tunnel.addMesh(collada.getSceneObject("FunkSphere").obj);
          tunnel.addMesh(collada.getSceneObject("Ships").obj);
          tunnel.addMesh(collada.getSceneObject("WatchTube").obj, 1);
          tunnel.addMesh(collada.getSceneObject("LHC").obj, 1);

          var pjs = new CubicVR.PJSTexture('pjstextures/viz2_tex.pjs', 128, 128);
          var mat = collada.getSceneObject("WatchTube").obj.getMaterial('Material_002-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat = collada.getSceneObject("Tech1").obj.getMaterial('Material_005-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat = collada.getSceneObject("LHC").obj.getMaterial('Material_009-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          pjs_textures.push(pjs);
          pjs = new CubicVR.PJSTexture('pjstextures/viz_tex3.pde', 128, 128);
          mat = collada.getSceneObject("BoxHole").obj.getMaterial('Material_001-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat.setTexture(pjs, CubicVR.enums.texture.map.AMBIENT);
          mat = collada.getSceneObject("Ships").obj.getMaterial('Material_008-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat.setTexture(pjs, CubicVR.enums.texture.map.AMBIENT);
          pjs_textures.push(pjs);
          pjs = new CubicVR.PJSTexture('pjstextures/viz_tex6.pjs', 128, 128);
          mat = collada.getSceneObject("FunkSphere").obj.getMaterial('Material-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat.setTexture(pjs, CubicVR.enums.texture.map.AMBIENT);
          mat = collada.getSceneObject("Wall1").obj.getMaterial('Material_007-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat.setTexture(pjs, CubicVR.enums.texture.map.AMBIENT);
          pjs_textures.push(pjs);
          pjs = new CubicVR.PJSTexture('pjstextures/cylinder_wrap.pde', 128, 128);
          mat = collada.getSceneObject("Ring1").obj.getMaterial('Material_003-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat.setTexture(pjs, CubicVR.enums.texture.map.AMBIENT);
          mat = collada.getSceneObject("Ring2").obj.getMaterial('Material_006-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          mat.setTexture(pjs, CubicVR.enums.texture.map.AMBIENT);
          pjs_textures.push(pjs);
          pjs = new CubicVR.PJSTexture('pjstextures/viz1_tex.pjs', 128, 128);
          mat = collada.getSceneObject("BoxTwist").obj.getMaterial('Material_004-fx');
          mat.setTexture(pjs, CubicVR.enums.texture.map.COLOR);
          pjs_textures.push(pjs);

          tunnel.fillStreams();
          tunnel.lights = [light];

          fxChain.setBlurOpacity(0.2);
          fxChain.setBlurIntensity(0.7);

          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0.5, 0.5, 0.5]);
          currentCamera = collada.camera;

          started = true;
        },
        step: function (shared) {
          if (shared.currentTimeIndex < 286) {
            return;
          }

          for (var i in pjs_textures) {
            pjs_textures[i].update();
          } //for
          var kickNorm = (audioData.m_NormBeatTimer / (60.0 / audioData.bd.win_bpm_int_lo));

          if ((shared.currentTimeIndex < 321) && audioData.bd.win_bpm_int_lo) {
            gl.clearColor(audioData.clearClr[0] * (1.0 - kickNorm), audioData.clearClr[1] * (1.0 - kickNorm), audioData.clearClr[2] * (1.0 - kickNorm), 1.0);
          } else {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
          }

          light.diffuse = [audioData.clearClr[0] * (1.0 - kickNorm * 0.8),
                                     audioData.clearClr[1] * (1.0 - kickNorm * 0.8),
                                     audioData.clearClr[2] * (1.0 - kickNorm * 0.8)];

          xp += 0.8 * timerData.timerLastSeconds;

          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          fxChain.begin();
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          tunnel.update(timerData.timerLastSeconds, shared.currentTimeIndex < 315);
          tunnel.render(aspect, xp, timerData.timerLastSeconds, audioData.m_BeatCounter, audioData.m_HalfBeatCounter);

          fxChain.end();

          gl.clearColor(0.0, 0.0, 1.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          fxChain.render();
        },
        stop: function (shared) {
          fxChain.setBlurOpacity(1);
          fxChain.setBlurIntensity(0);
          CubicVR.setGlobalAmbient([0.0,0.0,0.0]);
          pjs_textures = null;
          rBuf = null;
          rQuad = null;
          boxObject = null;
          tunnel = null;
          light = null;
          collada = null;
        }
      });
    })();

    var dungeonSeg = (function () {
      var collada,
          bumpTexture = null,
          normalTexture = null,
          boxTexture = null,
          portalTexture = null,
          light,
          light2,
          vidSource,
          vidTexture,
          vidActive = false;

      function setVidTex(state) {
        if (state && !vidActive) {
          collada.getSceneObject("PortalPlane").obj
                 .getMaterial("PortalMat-fx")
                 .setTexture(vidTexture, CubicVR.enums.texture.map.COLOR);
          collada.getSceneObject("PortalPlane").obj
                 .getMaterial("PortalMat-fx")
                 .setTexture(vidTexture, CubicVR.enums.texture.map.AMBIENT);
          vidSource.play();
          vidSource.addEventListener('ended', function () {
            this.currentTime = 0;
          }, false);
        } else {
          vidSource.pause();
        }
        vidActive = state;
      }

      function videoTextureInit() {
        vidSource = document.getElementById("portal-video");
        vidTexture = new CubicVR.Texture();
        setVidTex(true);
      }

      function updateVideoTexture() {
        if (audioData.timerSeconds < 286 && vidActive) setVidTex(false);
        else if (audioData.timerSeconds > 286 && !vidActive) setVidTex(true);

        if (!vidActive) return;

        var ofs = audioData.timerSeconds - 286;

        if (ofs < 0) return;

        if (Math.abs(vidSource.currentTime - ofs) > 0.3) vidSource.currentTime = ofs;

        gl.bindTexture(gl.TEXTURE_2D, CubicVR.Textures[vidTexture.tex_id]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vidSource);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      function initSprites() {

        // Instantiate BitWall Singleton
        bitWall = window.bitWall = new BitWall();

        // Load BitWall Sprites
        bitWall.addSprites([
          'models/kraddy.sprite',
          'models/thug1.sprite',
          'models/thug2.sprite'
          ]);

        // Alias sprites for convenience
        kraddy = bitWall.kraddy;
        thug1 = bitWall.thug1;
        thug2 = bitWall.thug2;

        collada.getSceneObject("KraddySprite").obj.triangulateQuads();
        collada.getSceneObject("KraddySprite").obj.compile();
        collada.getSceneObject("KraddySprite").obj.segment_state[0] = 0;
        collada.getSceneObject("BadDude1").obj.triangulateQuads();
        collada.getSceneObject("BadDude1").obj.compile();
        collada.getSceneObject("BadDude1").obj.segment_state[0] = 0;
        collada.getSceneObject("WallTossDude").obj.triangulateQuads();
        collada.getSceneObject("WallTossDude").obj.compile();
        collada.getSceneObject("WallTossDude").obj.segment_state[0] = 0;

        kraddy.sceneObject.rotation = [0, 180, 0];
        kraddy.sceneObject.scale = [3, 3, 3];
        kraddy.sceneObject.position = [0, 0.5, 0];

        thug1.sceneObject.rotation = [0, 180, 0];
        thug1.sceneObject.scale = [3, 3, 3];
        thug1.sceneObject.position = [0, 0.5, 0];

        thug2.sceneObject.rotation = [0, 90, 0];
        thug2.sceneObject.scale = [3, 3, 3];
        thug2.sceneObject.position = [0, 0.5, 0];

        collada.getSceneObject("KraddySprite").bindChild(kraddy.sceneObject);
        collada.getSceneObject("BadDude1").bindChild(thug1.sceneObject);
        collada.getSceneObject("WallTossDude").bindChild(thug1.sceneObject);

        window.burst.load('dungeon');

        var updateSprite = function (sprite) {
          if (window.burst.on) {
            var spriteName = sprite.spriteName + "Dungeon",
                sceneObject = sprite.sceneObject,
                exports = burst.exports;
            sprite.action = exports[spriteName + 'Action'].action;

            sceneObject.position = exports[spriteName + 'Position'].position;
            sceneObject.rotation = exports[spriteName + 'Rotation'].rotation;
            sceneObject.scale = exports[spriteName + 'Scale'].scale;

          }
        };

        window.updateSprites = function () {
          updateSprite(kraddy);
          updateSprite(thug1);
          updateSprite(thug2);
        };

        if (window.location.hash === '#spriteGUI') {
          loadSpriteGUI();
        }

      };

      var name = '../models/json/dungeon.dae.json';

      return new Sequence({
        name: name,
        timeIndex: 238.4,
        preloadTime: 180,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            collada.camera.setDimensions(canvas.width, canvas.height);
            collada.camera.setTargeted(true);
            collada.camera.target = collada.getSceneObject("CamTarget").position;

            light = new CubicVR.Light(CubicVR.enums.light.type.POINT,
                                      CubicVR.enums.light.method.DYNAMIC);
            light.distance = 35;
            light.intensity = 1.0;
            light.diffuse = [1, 1, 1];
            light.specular = [0.5, 0.5, 0.5];

            collada.bindLight(light);

            bumpTexture = new CubicVR.PJSTexture('pjstextures/viz_tex5.pde', 128, 128);
            normalTexture = new CubicVR.NormalMapGen(bumpTexture, 128, 128);
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0.0, 0.0, 0.0]);
          currentCamera = collada.camera;
          initSprites();
          window.burst.on = true;
          collada.attachOcTree(new CubicVR.OcTree(800, 6));
          videoTextureInit();

          var mat;
          for (var i = 0, l = CubicVR.Materials.length; i < l; ++i) {
            if (CubicVR.Materials[i].name == 'BrickBumpMat-fx') {
              mat = CubicVR.Materials[i];
              break;
            }
          }

          mat.setTexture(bumpTexture, CubicVR.enums.texture.map.BUMP);
          mat.setTexture(bumpTexture, CubicVR.enums.texture.map.AMBIENT);
        },
        step: function (shared) {
          bitWall.run(timerData.timerSeconds);

          if (boxTexture === null) {
            var obj = collada.getSceneObject('FlashCube');
            if (!obj) return;
            var mat = obj.obj.getMaterial('VizMat-fx');
            if (mat) {
              boxTexture = new CubicVR.PJSTexture('pjstextures/viz_tex2.pde', 128, 128);
              mat.setTexture(boxTexture, CubicVR.enums.texture.map.AMBIENT);
              mat.setTexture(boxTexture, CubicVR.enums.texture.map.COLOR);
            } //if
          } else {
            if (timerData.timerSeconds > 277 && timerData.timerSeconds < 289) {
              boxTexture.update();
            }
          } //if
          updateVideoTexture();
          bumpTexture.update();

          collada.evaluate(timerData.timerSeconds);

          light.position = CubicVR.vec3.add(CubicVR.vec3.add(collada.camera.position, CubicVR.vec3.multiply(CubicVR.vec3.normalize(CubicVR.vec3.subtract(collada.camera.target, collada.camera.position)), 1.0)), [0, 0, 0]);

          for (var i = 0, l = collada.lights.length; i < l; ++i) {
            var l = collada.lights[i];
            if (light !== light) {
              light.intensity = Math.max(1, audioData.clap.val * 4);
            }
          }

          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          collada.render();
        },
        stop: function (shared) {
          window.burst.on = false;
          vidSource.pause();
          vidSource = null;
          vidTexture = null;
          collada.octree.destroy();
          CubicVR.setGlobalAmbient([0, 0, 0]);
          light = null;
          light2 = null;
          bumpTexture = null;
          normalTexture = null;
          boxTexture = null;
          portalTexture = null;
          collada = null;
        }
      });
    })();

    var ending = (function () {
      var collada,
          light,
          vidActive = false,
          vidSource,
          vidTexture;

      function setVidTex(state) {
        if (state && !vidActive) {
          collada.getSceneObject("Minotaur").obj
                 .getMaterial("EyeMat-fx")
                 .setTexture(vidTexture, CubicVR.enums.texture.map.COLOR);
          collada.getSceneObject("Minotaur").obj
                 .getMaterial("EyeMat-fx")
                 .setTexture(vidTexture, CubicVR.enums.texture.map.AMBIENT);
          vidSource.play();
        } else {
          vidSource.pause();
        }
        vidActive = state;
      }

      function videoTextureInit() {
        vidSource = document.getElementById("ending-video");
        vidTexture = new CubicVR.Texture();
        setVidTex(true);
      }

      function updateVideoTexture() {
        if (!vidActive) return;

        var ofs = timerData.timerSeconds - 318;
        if (ofs < 0) return;

        if (Math.abs(vidSource.currentTime - ofs) > 0.1) vidSource.currentTime = ofs;
        gl.bindTexture(gl.TEXTURE_2D, CubicVR.Textures[vidTexture.tex_id]);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vidSource);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
      }

      var name = '../models/json/ending.dae.json';

      return new Sequence({
        name: name,
        timeIndex: 323,
        preloadTime: 290,
        preload: function (shared) {
          function $preload(sc) {
            collada = sc;
            collada.evaluate(0);
            startResourceLoading(name);

            collada.camera.setDimensions(canvas.width, canvas.height);

            light = new CubicVR.Light(CubicVR.enums.light.type.POINT, CubicVR.enums.light.method.DYNAMIC);
            light.distance = 200;
            light.intensity = 1.0;
            light.diffuse = [1, 1, 1];
            light.specular = [0.5, 0.5, 0.5];

            collada.bindLight(light);
          } //$preload
          CubicVR.loadColladaWorker(name, "./scene_images/", $preload, db);
        },
        start: function (shared) {
          canvas.style.display = "block";
          CubicVR.setGlobalAmbient([0, 0, 0]);
          currentCamera = collada.camera;
          videoTextureInit();
          fxChain.setBlurOpacity(0.1);
          fxChain.setBlurIntensity(0.8);
        },
        step: function (shared) {
          updateVideoTexture();
          collada.evaluate(timerData.timerSeconds);

          light.position = CubicVR.vec3.add(CubicVR.vec3.add(collada.camera.position, CubicVR.vec3.multiply(CubicVR.vec3.normalize(CubicVR.vec3.subtract(collada.camera.target, collada.camera.position)), 1.0)), [0, 0, 0]);

          var transitionTime = 339;
          var transitionEnd = 347;
          fxChain.setBlurOpacity((timerData.timerSeconds > transitionTime) ? 0.03 : 0.1);
          var blurVal = (timerData.timerSeconds >= transitionTime) ? (((timerData.timerSeconds - transitionTime) / (transitionEnd - transitionTime))) : 0.8;
          if (blurVal < 0.8) blurVal = 0.8;
          fxChain.setBlurIntensity(blurVal);


          fxChain.begin();
          gl.clearColor(0.0, 0.0, 0.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          if (timerData.timerSeconds < transitionEnd) collada.render();
          fxChain.end();

          gl.clearColor(0.0, 0.0, 1.0, 1.0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

          fxChain.render();

        },
        stop: function (shared) {
          fxChain.setBlurOpacity(1);
          fxChain.setBlurIntensity(0);
          CubicVR.setGlobalAmbient([0.0, 0.0, 0.0]);
          vidSource = null;
          vidTexture = null;
          light = null;
          collada = null;
        }
      });
    })();

    var credits = (function () {
      var mono,
          scrolling = false;

      return new Sequence({
        timeIndex: 349,
        preloadTime: 345,
        preload: function (shared) {
          mono = document.getElementById('mono');
        },
        start: function (shared) {
          mono.currentTime = 0;
          mono.play();

          canvas.style.display = "none";
          document.getElementById("creditRoll").style.display = "";
          document.getElementById("audio-controls").style.display = "none";

          stopDemoInterval();

          var creditRoll = (function() {
            var creditDiv = document.getElementById('creditRoll');
            var oldTop = -1;

            return function() {
              if (parseInt(creditDiv.style.height, 10) != window.innerHeight) {
                creditDiv.style.height = window.innerHeight + "px";
              }

              creditDiv.scrollTop++;

              if (oldTop < creditDiv.scrollTop) {
                oldTop = creditDiv.scrollTop;
                window.mozRequestAnimationFrame();
              } else {
                finishedCallback();
              }
            };
          })();

          window.addEventListener("DOMMouseScroll", function (e) {
            document.getElementById("creditRoll").scrollTop += (e.detail * 4);
          }, false);

          function startScroll() {
            if (scrolling) {
              return;
            }
            window.addEventListener('MozBeforePaint', creditRoll, false);
            window.mozRequestAnimationFrame();
            scrolling = true;
          }

          function pauseScroll() {
            if (!scrolling) {
              return;
            }
            window.removeEventListener('MozBeforePaint', creditRoll, false);
            scrolling = false;
          }

          var div = document.getElementById('creditRoll');
          div.addEventListener('mouseover', function(e) {
            if (e.target.nodeName === 'A') {
              e.preventDefault();
              pauseScroll();
            }
          }, false);

          div.addEventListener('mouseout', function(e) {
            if (e.target.nodeName === 'A') {
              e.preventDefault();
              startScroll();
            }
          }, false);

          startScroll();
        }
      });
    })();

    seq.add(theCity);
    seq.add(theStairs);
    seq.add(subwayStation);
    seq.add(subwayRun);
    seq.add(subwayCrash);
    seq.add(dungeonSeg);
    seq.add(portal);
    seq.add(ending);
    seq.add(credits);

    return {
      start: function () {
        seq.start();
        var controls = document.getElementById('audio-controls');
        controls.style.display = 'inline';
        controls.addEventListener('click', function (e) {
          var bpause = document.getElementById('audio-controls-pause');
          var bplay = document.getElementById('audio-controls-play');
          if (demoRunning) {
            bpause.style.visibility = 'visible';
            bplay.style.visibility = 'hidden';
            audio.pause();
            if (globals.video) {
              globals.video.pause();
            } //if
            window.removeEventListener('MozBeforePaint', demoAnimationFunc, false);
          } else {
            bpause.style.visibility = 'hidden';
            bplay.style.visibility = 'visible';
            audio.play();
            if (globals.video) {
              globals.video.play();
            } //if
            window.addEventListener('MozBeforePaint', demoAnimationFunc, false);
            window.mozRequestAnimationFrame();
          } //if
        }, false);

        startDemoInterval();
      },
      stop: function () {
        stopDemoInterval();
      }
    };
  }

})();