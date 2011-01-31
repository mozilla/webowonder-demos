  blahmodels = [BlenderExport.finch, BlenderExport.ghost, BlenderExport.lotus];
  window.currentModel = blahmodels[1];

  // failing at vector math here
  getZAngle = function(a, b, flip) {
    var v = vec3.create(a.transform[12],a.transform[13],a.transform[14]);
    var u = vec3.create(b.transform[12],b.transform[13],b.transform[14]);
    u = vec3.normalize(vec3.sub(u,v,u));
    var x = vec4.create(1,0,0,1);
    x = mat4.multiplyVec4(a.transform, x);
    v = vec3.normalize(vec3.sub(x,v,v));
    var a = Math.acos(vec3.dot(u,v));
    return flip ? Math.PI-a : Math.PI+a;
  }

  interpolate = function(a,b,f,r) {
    if (r == null) r = [];
    for (var i=0; i<a.length; i++)
      r[i] = a[i] * (1-f) + b[i] * f;
    return r;
  }

  createCubes = function(container){
    var bdcubemodel = new Magi.Node();
    var bdcubes = [];
    for (var i=-5; i<5; i++) {
      for (var j=-5; j<5; j++) {
        var c = new Magi.Cube();
        c.setPosition(i+0.5,j+0.5,0);
        c.material = material.copy();
        var f = (i+5)/10;
        var a = interpolate([0,0.5,1,1], [1,0,0,1], f);
        c.material.floats.MaterialAmbient[3] = 0.5;
        c.material.floats.MaterialDiffuse = a;
        c.material.floats.MaterialDiffuse[3] = 0.35;
        c.depthMask = false;
        var glowy = new Magi.Cube();
        glowy.material = c.material.copy();
        glowy.material.floats.MaterialDiffuse[3] = 1;
        // glowy.material.floats.MaterialEmit = a.map(function(i){ return i / 6; });
        glowy.material.floats.MaterialAmbient[3] = 0.9;
        glowy.setScale(0.8);
        glowy.setZ(0.1);
        glowy.setAxis(1,0,0).setAngle(j*0.1);
        c.setAxis(1,1,1).setAngle(j*0.1);
        c.appendChild(glowy);
        bdcubes.push(c);
        bdcubemodel.appendChild(bdcubes.last());
      }
    }
    bdcubemodel.setScale(1/5, 1/12, 1/5);
    bdcubemodel.setX(+(1+5/10));
    bdcubemodel.setY(-0.05);
    bdcubemodel.setAngle(-Math.PI/2).setAxis(0,0,1);
    bdcubemodel.addFrameListener(function(t,dt){
      updateVU(bdcubes);
      this.display = !(audioTag.paused || audioTag.currentTime == audioTag.duration);
    });
    container.appendChild(bdcubemodel);
  }

  createBall = function(display2) {
    shadowAngle = -0.3;
    // create model to go between cubes
    ball = new Magi.Node();
    ball.last = 0;
    ballSphere = new Magi.Node();
    ballSphere.setScale(20);
    var sphere = new Magi.Sphere(50,50,true);
    ballSphere.appendChild(sphere);
    sphere.material = material.copy();
    sphere.material.gl = null;
    sphere.setAxis(1,0,0).setAngle(Math.PI/2);
    ballSphere.setAxis(-0.7,0.4,1);
    sphere.material.floats.MaterialAmbient.set([0.4, 0.35, 0.3, 0.2]);
    sphere.material.floats.MaterialDiffuse.set([0.9, 0.3, 0.3, 1]);
    sphere.material.floats.MaterialSpecular.set([0.9, 0.9, 0.6, 1]);
    sphere.material.floats.MaterialShininess = 10;
    Magi.Texture.load("ball.jpg", function(tex) {
      sphere.material.textures.DiffTex = tex;
      sphere.material.textures.EmitTex = tex;
      sphere.material.floats.MaterialEmit.set([-0.3,-0.3,-0.3,1]);
    }, false);
    ballShadowd = new Magi.Disk(0.0,1,0.001,50,1);
    ballShadowd.scaling.set(ballSphere.scaling);
    ballShadowd.material = Magi.ColorMaterial.get(null);
    ballShadowd.material.floats.Color = vec4.create([0,0,0,0.1]);
    ballShadowd.transparent = true;
    ballShadowd.blend = true;
    ballShadow = new Magi.Node();
    ballShadow.setAxis(0,0,1);
    ballShadow.setAngle(shadowAngle);
    ballShadow.appendChild(ballShadowd);
    ball.appendChild(ballSphere);
    mat4.tween = function(m1,m2,t,dst) {
      dst = (dst == null) ? m1 : dst;
      for (var i=0; i<dst.length; i++)
        dst[i] = m1[i]*t + m2[i]*(1-t);
      return dst;
    }
    ball.afterTransform(function(m,t,dt){
      if (visibleLength > 0) {
        if (!this.startTime) this.startTime = t;
        this.dir = this.dir || 1;
        var f = (t - this.startTime) / 800;
        if (f > 1) {
          f=0;
          this.startTime = 0;
          this.dir = -this.dir;
          this.last = visibleRes.length-1;
        }
        this.last = Math.min(this.last, visibleRes.length-1);
        this.bounce = Math.max(0, f > 0.5 ? f-0.9 : 0.1-f);
        if (this.dir < 0) f = 1-f;
        this.f = f;
        var m1 = cubes[visibleRes[0]];
        var m2 = cubes[visibleRes[this.last]];
        if (this.transform == null) this.transform = mat4.identity();
        mat4.tween(m1.pivot.transform, m2.pivot.transform, f, this.transform);
        ball.currentImage = f > 0.5 ? m1.image : m2.image;
      }
    });
    ball.beatDetect = false;
    ballSphere.addFrameListener(function(t,dt){
      if (visibleLength > 0 && ball.dir) {
        var f = ball.f;
        var bounce = ball.bounce;
        this.rotation.angle += ball.dir*dt / 250;
        this.scaling[2] = 20 * (1-bounce);
        this.scaling[0] = this.scaling[1] = 20 * (1+bounce);
        if (ball.beatDetect) {
          if (bd && bd.win_bpm_int_lo && !byId('audio1').paused) {
            var kickNorm = (m_BeatTimer / (60.0/bd.win_bpm_int_lo));
            if (kickNorm > 0.9)
            ball.startTime = t;
            console.log(kickNorm);
            sphere.setScale(0.5+0.5*kickNorm);
          } else {
            sphere.setScale(1.0);
          }
        }
        if (ballOn && (f == 0 || f == 1)) {
          ball.currentImage.position[2] = 1;
        }
        var ff = (2*(f-0.5));
        this.position[2] = -10 * (-bounce*2) - 30 - (1 - (ff*ff))*130;
        ballShadow.position[0] = ball.transform[12] + Math.cos(shadowAngle)*(1-ff*ff)*80;
        ballShadow.position[1] = ball.transform[13] + Math.sin(shadowAngle)*(1-ff*ff)*80;
        ballShadow.position[2] = ball.transform[14];
        ballShadowd.scaling[0] = 20 + (1-ff*ff)*25;
        ballShadowd.scaling[1] = 20 + (1-ff*ff)*5;
        ballShadow.setAngle(shadowAngle);
      }
      ballShadow.display = ball.display = visibleLength > 0 && ball.dir && ballOn;
    });
    display2.scene.appendChild(ball);
    display2.scene.appendChild(ballShadow);
  }
  ballOn = true;
  toggleBall = function() {
    ballOn = !ballOn;
  }
  showBall = function() { ballOn = true; }
  hideBall = function() { ballOn = false; }

  threshold = 80;
  DEBUG = false;

  var video = document.createElement('video');
  video.width = 640;
  video.height = 480;
  video.loop = true;
  video.volume = 0;
  video.autoplay = true;
  video.style.display = 'none';
  video.controls = false;
  video.src = "desk_480.ogv";
  var offset = 180;
  video.style.marginTop = offset+'px';

  var ratio = 0.5;

  targetOrigin = '*';
  var DemoState = {
    running: false,
    started: false
  };
  loaded = function() {
    if (window.parent == window) {
      DemoState.running = true;
      startDemo();
      DemoState.started = true;
    } else {
      window.parent.postMessage('loaded', targetOrigin);
    }
  }
  window.addEventListener("message", function(e) {
    if ("start_demo" == e.data) {
      DemoState.running = true;
      if (DemoState.started) {
        window.paused = false;
      } else {
        startDemo();
        DemoState.started = true;
      }
    } else if ("stop_demo" == e.data) {
      DemoState.running = false;
      window.paused = true;
      window.parent.postMessage('finished_exit', targetOrigin);
    }
  }, false);

  window.onload = loaded;

  startDemo = function() {
    audioTag = byId('audio1');
    contentElems = byClass('content');

    byId('display').appendChild(video);
    new Draw(byId('draw'));
    new AudioPlayer(byId('audio1'));

    var canvas = document.createElement('canvas');
    canvas.width = toInt(ratio*video.width);
    canvas.height = toInt(ratio*video.height);
    canvas.style.display = 'block';
    canvas.id = 'debugCanvas';
    if (DEBUG) byId('display').appendChild(canvas);

    var raster = new NyARRgbRaster_Canvas2D(canvas);
    var param = new FLARParam(toInt(ratio*video.width), toInt(ratio*video.height));

    var resultMat = new NyARTransMatResult();

    var detector = new FLARMultiIdMarkerDetector(param, 80);
    detector.setContinueMode(true);

    var ctx = canvas.getContext('2d');
    ctx.font = "24px URW Gothic L, Arial, Sans-serif";

    currentElem = byClass('content')[4];

    setImage = function(elem) {
      images.forEach(function(img){ img.setImage(elem); });
      if (currentElem && currentElem.tagName == 'VIDEO')
        currentElem.pause();
      currentElem = elem;
    };

    toArray(byClass('content')).forEach(function(elem){
      elem.onmousedown = function(){
        if (this.tagName == 'IMG') {
          var img = new Image();
          img.onload = function() {
            setImage(this);
          };
          img.src = this.src.replace(/thumb_([^\.]+)/, '$1_bg');
        } else {
          setImage(this);
        }
      }
    });
    currentElem.onmousedown();

    var gcanvas = E.canvas(video.width, video.height + offset);
    byId('display').appendChild(gcanvas);
    var display2 = new Magi.Scene(gcanvas);
    display2.bg = [0,0,0,0];
    param.copyCameraMatrix(display2.camera.perspectiveMatrix, 100, 10000);
    display2.camera.useProjectionMatrix = true;
    display2.drawOnlyWhenChanged = true;
    display2.camera.perspectiveMatrix[13] -= offset*1.5;
    display2.camera.perspectiveMatrix[5] *= (video.height/(video.height+offset));

    visibleLength=0, visibleRes=[];

    var fbo = new Magi.FBO(display2.gl, video.width*2, video.height*2, true);
    fbo.use();
    var img = new Magi.FilterQuad();
    img.material.textures.Texture0 = fbo.texture;
    img.material.floats.offsetY = 1.0-(video.height/(video.height+offset));
    display2.scene.appendChild(img);

    var videoCanvas = E.canvas(video.width, video.height);
    display = new Magi.Scene(fbo);
    display.drawOnlyWhenChanged = true;
    param.copyCameraMatrix(display.camera.perspectiveMatrix, 100, 10000);
    display.camera.useProjectionMatrix = true;
    var videoTex = new Magi.FlipFilterQuad();
    videoTex.material.textures.Texture0 = new Magi.Texture();
    videoTex.material.textures.Texture0.image = videoCanvas;
    videoTex.material.textures.Texture0.generateMipmaps = false;
    display.scene.appendChild(videoTex);

    display2.scene.addFrameListener(function(t,dt){
      display.draw(t,dt);
    });

    material = Magi.DefaultMaterial.get();
    material.floats.MaterialAmbient = vec4.create([1,1,1,0.0]);
    material.floats.MaterialDiffuse = vec4.create([0.9,0.9,0.9,1.0]);
    material.floats.MaterialSpecular = vec4.create([0.8,0.8,0.8,1.0]);
    material.floats.LightDiffuse = vec4.create([0.5,0.45,0.4,1.0]);
    material.floats.LightSpecular = vec4.create([0.5,0.45,0.4,1.0]);
    material.floats.LightPos = vec4.create([-2400, 1200, 1200, 1.0]);
    material.floats.LightAmbient = vec4.create([0.4, 0.34, 0.3, 1]);
    material.floats.Shininess = 16;

    createBall(display2);

    var times = [];
    var pastResults = {};
    cubes = {};
    var cubesLength = 0;
    var images = [];

    window.updateImage = function() {
      display.changed = display2.changed = true;
    }

    byId('display').style.pointerEvents = 'none';

    videoTex.addFrameListener(function(){
      if (video.ended) video.play();
      if (video.paused) return;
      if (window.paused) return;
      if (video.currentTime == video.duration) {
        video.currentTime = 0;
      }
      if (video.currentTime == video.lastTime) return;
      video.lastTime = video.currentTime;
      var dt = new Date().getTime();

      videoCanvas.getContext('2d').drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

      videoTex.material.textures.Texture0.changed = true;

      canvas.changed = true;
      display2.changed = display.changed = true;

      var t = new Date();
      ctx.drawImage(videoCanvas, 0,0,toInt(ratio*video.width),toInt(ratio*video.height));
      var detected = detector.detectMarkerLite(raster, threshold);
      for (var idx = 0; idx<detected; idx++) {
        var id = detector.getIdMarkerData(idx);
        var currId;
        if (id.packetLength > 4) {
          currId = -1;
        }else{
          currId=0;
          for (var i = 0; i < id.packetLength; i++ ) {
            currId = (currId << 8) | id.getPacketData(i);
          }
        }
        if (!pastResults[currId]) {
          pastResults[currId] = {};
        }
        detector.getTransformMatrix(idx, resultMat);
        pastResults[currId].age = 0;
        pastResults[currId].id = currId;
        pastResults[currId].transform = Object.asCopy(resultMat);
      }
      visibleLength = 0;
      visibleRes = [];
      for (var i in pastResults) {
        var r = pastResults[i];
        if (r.age > 10) {
          delete pastResults[i];
          cubes[i].image.setImage(currentElem);
        } else {
          visibleRes.push(i);
          visibleLength++;
        }
        r.age++;
      }
      visibleRes = visibleRes.sortNum().reverse();
      for (var i in cubes) cubes[i].display = false;
      for (var i in pastResults) {
        if (!cubes[i]) {
          cubesLength++;
          var pivot = new Magi.Node();
          var hole = new Magi.Node();
          var sides = [
            new Magi.Quad().setPosition(0,-1,4).setScale(1,8,1).setAxis(1,0,0).setAngle(Math.PI/2),
            new Magi.Quad().setPosition(0,1,4).setScale(1,8,1).setAxis(-1,0,0).setAngle(Math.PI/2),
            new Magi.Quad().setPosition(-1,0,4).setScale(8,1,1).setAxis(0,-1,0).setAngle(Math.PI/2),
            new Magi.Quad().setPosition(1,0,4).setScale(8,1,1).setAxis(0,1,0).setAngle(Math.PI/2),
            new Magi.Quad().setPosition(0,0,8),
            new Magi.Image(currentElem).setSize(2).setPosition(0,0,0.5).setAxis(0,0,1).setAngle(-Math.PI/2)
          ];
          var image = sides.last();
          image.setImage = function(elem) {
            if (elem.tagName == 'VIDEO') elem.play();
            Magi.Image.setImage.call(this, elem);
            this.texture.generateMipmaps = false;
          };
          images.push(image);
          pivot.image = image;
          image.addFrameListener(function(d,dt) {
            this.position[2] += ((ballOn?0.5:0.005)-this.position[2])*0.5;
          });
          image.alignedNode.transparent = false;
          sides.forEach(function(c){
            c.cullFace = 'BACK';
            c.material = material;
            hole.appendChild(c);
          });
          hole.appendChild(new Magi.Quad()); // stencil quad
          hole.draw = function(gl) {
            var st = this.childNodes.last();
            gl.clear(gl.DEPTH_BUFFER_BIT);
            gl.depthMask(true);
            gl.colorMask(false,false,false,false);
            Magi.Quad.draw.apply(st, arguments);
            gl.depthFunc(gl.GREATER);
            gl.depthMask(false);
            gl.colorMask(true,true,true,true);
          }
          hole.childNodes.last().draw = function(gl) {
            gl.depthFunc(gl.LESS);
            gl.depthMask(true);
            gl.clear(gl.DEPTH_BUFFER_BIT);
          }
          pivot2 = new Magi.Node();
          pivot2.transform = mat4.identity();
          pivot2.setScale(32);
          pivot.pivot = pivot2;
          pivot.appendChild(pivot2);
          pivot2.appendChild(hole);
          display.scene.appendChild(pivot);
          createCubes(pivot2);
          var model = importBlenderModel(window.currentModel);
          pivot.blenderModel = model;
          model.curMod = window.currentModel;
          model.transform = mat4.identity();
          model.setScale(30.5);
          pivot.appendChild(model);
          pivot.flip = cubesLength % 2 == 0;
          pivot.addFrameListener(function(t,dt) {
            this.blenderModel.display = !ballOn;
            if (this.blenderModel.curMod != window.currentModel) {
              var model = importBlenderModel(window.currentModel);
              model.curMod = window.currentModel;
              model.transform = mat4.identity();
              model.setScale(30.5);
              this.removeChild(this.blenderModel);
              this.blenderModel = model;
              this.appendChild(model);
            }
            this.blenderModel.dance = !audioTag.paused;
          });
          cubes[i] = pivot;
        }
        cubes[i].display = true;
        var mat = pastResults[i].transform;
        var cm = cubes[i].pivot.transform;
        cm[0] = mat.m00;
        cm[1] = -mat.m10;
        cm[2] = mat.m20;
        cm[3] = 0;
        cm[4] = mat.m01;
        cm[5] = -mat.m11;
        cm[6] = mat.m21;
        cm[7] = 0;
        cm[8] = -mat.m02;
        cm[9] = mat.m12;
        cm[10] = -mat.m22;
        cm[11] = 0;
        cm[12] = mat.m03;
        cm[13] = -mat.m13;
        cm[14] = mat.m23;
        cm[15] = 1;
        if (cubes[i].blenderModel.keepMoving) {
          mat4.set(cm, cubes[i].blenderModel.transform);
        }
      }
    });

    toggleAR = function(){
      if (video.style.display == 'none') {
        turnAROff();
      } else {
        turnAROn();
      }
    }

    window.AR_on = true;

    turnAROn = function() {
      video.style.display = 'none';
      gcanvas.style.display = 'inline-block';
      window.AR_on = true;
    }
    turnAROff = function() {
      video.style.display = 'inline-block';
      gcanvas.style.display = 'none';
      window.AR_on = false;
    }
  }
