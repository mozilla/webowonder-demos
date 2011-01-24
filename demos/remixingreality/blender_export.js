
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
  if (!this.cachedFrames)
    this.cachedFrames = [];
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
      vertices : new Float32Array(this.frameVertices),
      normals : new Float32Array(this.frameNormals)
    };
  }
  this.frameVertices = this.cachedFrames[frame].vertices;
  this.frameNormals = this.cachedFrames[frame].normals;
};

(function() {
  BlenderExport.RedPanda.setFrame = BlenderExport.setFrame;
  for (var i=0; i<79; i++)
    BlenderExport.RedPanda.setFrame(i);
})();

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
  var sc = 2.5/(Math.max(width,depth,height));
  var pivot = new Magi.Node();
  var cube;
  var n = new Magi.Node();
  n.setScale(sc,-sc,sc);
  model.setFrame = BlenderExport.setFrame;
  model.setFrame(0);
  if (model.indices) {
    n.model = new Magi.VBO(null,
        {size:1, data: model.indices, elements: true},
        {size:3, data: model.frameVertices},
        {size:3, data: model.frameNormals},
        {size:2, data: model.texCoords},
        {size:1, data: model.materials}
    );
  } else {
    n.model = new Magi.VBO(null,
        {size:3, data: model.frameVertices},
        {size:3, data: model.frameNormals},
        {size:2, data: model.texCoords},
        {size:1, data: model.materials}
    );
  }
  n.frame = 0;
  var hopStart = 25;
  var hopFrames = 13;
  var danceStart = 38;
  var danceFrames = 41;
  n.addFrameListener(function(t,dt) {
    if (!this.lastFrameTime) this.lastFrameTime = t;
    if (t-this.lastFrameTime > 60 && this.model.initialized) {
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
      model.setFrame(this.frame);
      var gl = this.model.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.model.vbos[0]);
      Magi.Stats.bindBufferCount++;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, model.cachedFrames[this.frame].vertices);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.model.vbos[1]);
      Magi.Stats.bindBufferCount++;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, model.cachedFrames[this.frame].normals);
    }
  });
  n.model.attributes = ['Vertex', 'Normal', 'TexCoord', 'MaterialIndex'];
  n.material = Magi.MultiMaterial.get();
  n.material.floats.LightPos = vec4.create([600, 1200, -2400, 1.0]);
  model.materialDefinitions.forEach(function(d, i) {
    n.material.floats['Material'+i+'.diffuse'] = d.diffuse;
    n.material.floats['Material'+i+'.emit'] = d.diffuse.map(function(v){ return v*0.1; });
    n.material.floats['Material'+i+'.specular'] = d.specular.map(function(c){return c*d.specularIntensity;});
    n.material.floats['Material'+i+'.ambient'] = d.specular.map(function(v){ return v * d.ambient; });
    n.material.floats['Material'+i+'.ambient'][3] = 0.8;
    n.material.floats['Material'+i+'.shininess'] = d.specularIntensity * 10;
  });
  n.setZ(0.0);
  n.setY(-0);
  n.setX(-0.0);
  n.rotation.axis = [1,0,0];
  n.rotation.angle = Math.PI;
  var cont = new Magi.Node();
  shadow = new Magi.Disk(0.0,0.5,0.001,50,1);
  shadow.material = Magi.ColorMaterial.get(null);
  shadow.material.floats.Color = vec4.create([0,0,0,0.15]);
  shadow.transparent = true;
  shadow.blend = true;
  shadow.setZ(0);
//   cont.appendChild(shadow);
  cont.appendChild(n);
  cube = new Magi.Node();
  cube.appendChild(cont);
  cube.setAxis(0,0,1);
  cube.setAngle(-Math.PI/2);
  cube.addFrameListener(function(t,dt) {
//     this.setAngle(t/1000);
  });
  cube.bounce = 100;
  cube.bounceDir = vec3.create(0,0,-1);
  cube.zeroVec = vec3.create(0,0,0);
  cube.pivot = pivot;
  var pv = new Magi.Node().setAxis(0,1,0);
  pv.appendChild(cube);
  pivot.n = n;
  pivot.shadow = shadow;
  pivot.appendChild(pv);
  pivot.pv = pv;
  pivot.cube = cube;
  return pivot;
}
