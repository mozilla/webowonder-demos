
BlenderExport.splitByMaterial = function(matIndexes, verts, sz) {
  var matVerts = [];
  for (var i=0; i<matIndexes.length; i++) {
    var idx = matIndexes[i];
    if (matVerts[idx] == null) {
      matVerts[idx] = [];
    }
    for (var j=0; j<sz; j++) {
      matVerts[idx].push(verts[i*sz + j]);
    }
  }
  return matVerts;
}

BlenderExport.tmpVec = vec4.create();
BlenderExport.tmpNo = vec4.create();
BlenderExport.rv = vec3.create();
BlenderExport.nrv = vec3.create();
BlenderExport.v = vec4.create();
BlenderExport.n = vec4.create();

BlenderExport.setFrame = function(frame) {
  if (!this.frameVertices)
    this.frameVertices = new Float32Array(this.vertices);
  if (!this.frameNormals)
    this.frameNormals = new Float32Array(this.normals);
  if (!this.cachedFrames) {
    this.cachedFrames = [];
    this.splitTexCoords = BlenderExport.splitByMaterial(this.materials, this.texCoords, 2)
                                       .map(function(a){ if (a) return new Float32Array(a); });
  }
  if (!this.cachedFrames[frame]) {
    if (this.vertexGroups && this.vertexGroups.length > 0) {
      var tmpVec = BlenderExport.tmpVec;
      var tmpNo = BlenderExport.tmpNo;
      var rv = BlenderExport.rv;
      var nrv = BlenderExport.nrv;
      var v = BlenderExport.v;
      var n = BlenderExport.n;
      if (!this.boneMatrices)
        this.boneMatrices = [];
      var boneMatrices = this.boneMatrices;
      for (var i=0; i<this.vertexGroups.length; i++) {
        var vg = this.vertexGroups[i];
        boneMatrices[i] = this.bones[vg][frame];
      }
      for (var i=0; i<this.weights.length; i++) {
        var wt = this.weights[i];
        v[0] = this.vertices[i*3+0];
        v[1] = this.vertices[i*3+1];
        v[2] = this.vertices[i*3+2];
        v[3] = 1;
        n[0] = this.normals[i*3+0];
        n[1] = this.normals[i*3+1];
        n[2] = this.normals[i*3+2];
        n[3] = 0;
        rv[0] = rv[1] = rv[2] = 0;
        nrv[0] = nrv[1] = nrv[2] = 0;
        var totalWeight = 0;
        if (wt.length == 0) {
          totalWeight = 1;
          vec3.setLeft(rv, v);
          vec3.setLeft(nrv, n);
        }
        for (var j=0; j<wt.length; j++) {
          var boneIndex = wt[j][0];
          var weight = wt[j][1];
          totalWeight += weight;
          var mat = boneMatrices[boneIndex];
          if (!mat) continue;
          mat4.multiplyVec4(mat, v, tmpVec);
          mat4.multiplyVec4(mat, n, tmpNo);
          vec3.scale(tmpVec, weight, tmpVec);
          vec3.add(rv, tmpVec, rv);
          vec3.scale(tmpNo, weight, tmpNo);
          vec3.add(nrv, tmpNo, nrv);
        }
        vec3.scale(rv, 1/totalWeight);
        vec3.scale(nrv, 1/totalWeight);
        this.frameVertices[i*3+0] = rv[0];
        this.frameVertices[i*3+1] = rv[1];
        this.frameVertices[i*3+2] = rv[2];
        this.frameNormals[i*3+0] = nrv[0];
        this.frameNormals[i*3+1] = nrv[1];
        this.frameNormals[i*3+2] = nrv[2];
      }
    }
    this.cachedFrames[frame] = {
      vertices : BlenderExport.splitByMaterial(this.materials, this.frameVertices, 3)
                              .map(function(a){ if (a) return new Float32Array(a); }),
      normals : BlenderExport.splitByMaterial(this.materials, this.frameNormals, 3)
                             .map(function(a){ if (a) return new Float32Array(a); }),
    };
  }
  this.frameVertices = this.cachedFrames[frame].vertices;
  this.frameNormals = this.cachedFrames[frame].normals;
};

function importBlenderModel(model) {
  var minX,maxX,minY,maxY,minZ,maxZ;
  minX=maxX=model.vertices[0];
  minY=maxY=model.vertices[1];
  minZ=maxZ=model.vertices[2];
  var v = model.vertices;
  for (var i=0; i<v.length; i+=3) {
    if (v[i] > maxX) maxX = v[i];
    else if (v[i] < minX) minX = v[i];
    if (v[i+1] > maxY) maxY = v[i+1];
    else if (v[i+1] < minY) minY = v[i+1];
    if (v[i+2] > maxZ) maxZ = v[i+2];
    else if (v[i+2] < minZ) minZ = v[i+2];
  }
  var width = maxX-minX;
  var depth = maxY-minY;
  var height = maxZ-minZ;
  var sc = 2.2/(Math.max(width,depth,height));
  var pivot = new Magi.Node();
  var cube;
  var n = new Magi.Node();
  n.setScale(sc,-sc,sc);
  model.setFrame = BlenderExport.setFrame;
  model.setFrame(0);
  if (model.indices) {
    throw("UNIMPLEMENT!");
  } else {
    n.models = [];
    for (var i=0; i<model.frameVertices.length; i++) {
      n.childNodes[i] = new Magi.Node();
      if (model.frameVertices[i]) {
        n.models[i] = new Magi.VBO(null,
          {size:3, data: model.frameVertices[i]},
          {size:3, data: model.frameNormals[i]},
          {size:2, data: model.splitTexCoords[i]}
        );
        n.models[i].attributes = ['Vertex', 'Normal', 'TexCoord'];
        n.childNodes[i].model = n.models[i];
        var d = model.materialDefinitions[i];
        n.childNodes[i].material = Magi.DefaultMaterial.get();
        n.childNodes[i].material.floats.LightPos = vec4.create([600, 1200, -2400, 1.0]);
        n.childNodes[i].material.floats['LightDiffuse'].set([1,1,1,1]);
        n.childNodes[i].material.floats['LightSpecular'].set([1,1,1,1]);
        n.childNodes[i].material.floats['LightAmbient'].set([0.09,0.075,0.05,1]);
        n.childNodes[i].material.floats['MaterialDiffuse'].set(d.diffuse);
        n.childNodes[i].material.floats['MaterialEmit'].set(d.diffuse.map(function(v){ return v*0.1; }));
        n.childNodes[i].material.floats['MaterialSpecular'].set(d.specular.map(function(c){return c*d.specularIntensity;}));
        n.childNodes[i].material.floats['MaterialAmbient'].set([1,1,1,1]);//d.specular.map(function(v){ return v * d.ambient; }));
        n.childNodes[i].material.floats['MaterialAmbient'][3] = 0.5;
        n.childNodes[i].material.floats['MaterialShininess'] = 2.0;
      }
    }
  }
  n.frame = 0;
  var hopStart = 25;
  var hopFrames = 13;
  var danceStart = 38;
  var danceFrames = 41;
  n.addFrameListener(function(t,dt) {
    if (!this.lastFrameTime) this.lastFrameTime = t;
    if (t-this.lastFrameTime > 60) {
      this.lastFrameTime = t;
      if (pivot.dance) {
        if (this.frame < danceStart)
          this.frame += 1;
        else
          this.frame = danceStart + (((this.frame-danceStart) + 1) % danceFrames);
      } else {
        this.frame = (this.frame + 1) % hopStart;
      }
      pivot.keepMoving = true; //this.frame < hopStart;
    }
  });
  n.setZ(0.0);
  n.setY(-0);
  n.setX(-0.0);
  n.rotation.axis = [1,0,0];
  n.rotation.angle = Math.PI;
  var cont = new Magi.Node();
  shadow = new Magi.Disk(0.0,0.85,0.001,50,1);
  shadow.material = Magi.ColorMaterial.get(null);
  shadow.material.floats.Color = vec4.create([0,0,0,0.15]);
  shadow.transparent = false;
  shadow.blend = true;
  shadow.setZ(0);
  cont.appendChild(n);
  cube = new Magi.Node();
  cube.appendChild(cont);
  cube.setAxis(0,0,1);
  cube.setAngle(-Math.PI/2);
  cube.bounce = 100;
  cube.bounceDir = vec3.create(0,0,-1);
  cube.zeroVec = vec3.create(0,0,0);
  cube.pivot = pivot;
  cube.addFrameListener(function(t,dt) {
    if (pivot.dance) {
      if (this.startDance == null)
        this.startDance = t;
      this.rotation.angle = -Math.PI/2+0.25*Math.PI*Math.sin((t-this.startDance)/500);
      this.position[2] = -0.1*Math.PI+0.05*Math.PI*Math.cos((t-this.startDance)/100);
    } else {
      this.startDance = null;
      this.rotation.angle += (-Math.PI/2-this.rotation.angle) * 0.25;
      this.position[2] += (-0.05-this.position[2]) * 0.25;
    }
  });
  var pv = new Magi.Node().setAxis(0,1,0);
  pv.appendChild(cube);
  pivot.n = n;
  pivot.shadow = shadow;
  pivot.appendChild(shadow);
  pivot.appendChild(pv);
  pivot.pv = pv;
  pivot.cube = cube;
  return pivot;
}
