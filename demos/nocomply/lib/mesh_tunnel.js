
MeshTunnelEntry = function (obj,zpos,count)
{
  this.count = count;
	this.zpos = zpos;
	this.obj = obj;
	this.depth = (obj.bb[1][2]-obj.bb[0][2]);
	this.ofs = -obj.bb[0][2];
}

	
MeshTunnel = function(tunnel_func)
{
  this.lights = [];
  this.meshes = [];
	this.tunnel = [];
	this.spacing = 0.2; 
	this.stream_length = 40;
	this.speed = 5;
	this.tunnelFunc = tunnel_func;
	this.ent_count = 0;
	
}

MeshTunnel.prototype.addMesh = function(mesh,streamId)
{
  streamId = streamId?streamId:0;      
  if (typeof(this.meshes[streamId])=='undefined') this.meshes[streamId] = [];
  if (typeof(this.tunnel[streamId])=='undefined') this.tunnel[streamId] = [];
  this.meshes[streamId].push(mesh);
}

MeshTunnel.prototype.adjustStreams = function()
{
  var d;
  for (var s in this.tunnel) {
		if ((d = this.get_stream_length(s))<this.stream_length)
		{
			var o = this.randObj(this.meshes[s]);
			this.streamAdd(s,new MeshTunnelEntry(o, d-o.bb[0][2]+this.spacing, this.ent_count));
		}			
  }
}

MeshTunnel.prototype.fillStreams = function()
{
  var d;
  for (var s in this.tunnel) {
		do 
		{
		  d = this.get_stream_length(s);
			var o = this.randObj(this.meshes[s]);
			this.streamAdd(s,new MeshTunnelEntry(o,d-o.bb[0][2]+this.spacing, this.ent_count));
		}	while (d<this.stream_length)		
  }
}


MeshTunnel.prototype.render = function(aspect,baseValue,timerLastSeconds,rotateVal,rotateValHalf)
{
	var camLookXY = this.tunnelFunc(2,baseValue);
	var camPosXY = this.tunnelFunc(0,baseValue);

	camPosXY[0] += 0.1*Math.sin(M_PI*Math.cos(baseValue*0.59));
	camPosXY[1] += 0.1*Math.cos(M_PI*Math.sin(baseValue*0.43));

	var modelViewMat = CubicVR.mat4.lookat(camPosXY[0],camPosXY[1],0, camLookXY[0],camLookXY[1],3, 0, 1, 0);
	var projectionMat = CubicVR.mat4.perspective(40+(Math.sin(baseValue*1.42)+1)*30, aspect, 0.1, 400.0);

  var i,iMax;

  var tMat = new CubicVR.Transform();
  
  
	for (var s in this.tunnel)
	for (i = 0, iMax = this.tunnel[s].length; i < iMax; i++)
	{
		var ent = this.tunnel[s][i];

		var orientd = ent.zpos+ent.ofs;
		var tp = this.tunnelFunc(ent.zpos,baseValue);
		var tpn = this.tunnelFunc(orientd,baseValue);					
		var r = (orientd-ent.zpos);
		var rot_x = -Math.atan2((tpn[1]-tp[1]),r)*(180.0/M_PI);
		var rot_y = Math.atan2((tpn[0]-tp[0]),r)*(180.0/M_PI);

		var rot_z = 0;

		switch (ent.count%2)
		{
			case 0: rot_z = rotateValHalf*10; break;
			case 1: rot_z = rotateVal*20; break;
		} 

		rot_z+=baseValue*100+ent.zpos*10;

    tMat.clearStack();
		tMat.rotate([0,0,rot_z]).pushMatrix().rotate([rot_x,rot_y,0]).translate(tp[0],tp[1],ent.zpos).getResult();
    
    CubicVR.renderObject(ent.obj,modelViewMat,projectionMat,tMat.getResult(),this.lights);          
	}

	
}

MeshTunnel.prototype.update = function(timerLastSeconds,adjustStreams)
{
  var removals = [];

  if (typeof(adjustStreams)==="undefined") adjustStreams = true;
  if (adjustStreams) {
    this.adjustStreams();    
  }

	for (var s=0, max_s = this.tunnel.length; s<max_s; ++s) {
  	for (var i = 0, iMax = this.tunnel[s].length; i<iMax; i++)
  	{
  		var ent = this.tunnel[s][i];
  		ent.zpos -= this.speed*timerLastSeconds;
  		if (ent.zpos < 0-ent.ofs)
  		{
  			removals.push(s);
  		}
  	} //for i
  } //for s

	for (var i = 0, iMax = removals.length; i < iMax; i++)
	{
		var tmpArray = [];
		
		for (var j = 0, jMax = this.tunnel[removals[i]].length; j < jMax; j++)
		{
			var ent = this.tunnel[removals[i]][j];
			if (ent.zpos > 0-ent.ofs)
			{
				tmpArray.push(ent);
			}						
		}
		this.tunnel[removals[i]] = tmpArray;
	}
	
}

MeshTunnel.prototype.get_stream_length = function (stream)
{
	var max = 0;
	
	var stream = this.tunnel[stream];

	for (var i = 0, iMax = stream.length; i < iMax; i++)
	{
		var ent = stream[i];
		var md = ent.zpos+(ent.depth-ent.ofs);
		if (max < md) max = md;
	}

	return max;
}

MeshTunnel.prototype.streamAdd = function (stream,ent)
{
	if (typeof(this.tunnel[stream])=='undefined') this.tunnel[stream] = [];
	this.tunnel[stream].push(ent);
	this.ent_count++;
}

MeshTunnel.prototype.randObj = function (ar)
{
	return ar[Math.floor(Math.random()*ar.length)];
}

