/** -*- compile-command: "jslint-cli manipulator.js" -*-
 *
 * Copyright (C) 2010 Cedric Pinson
 *
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * Authors:
 *  Cedric Pinson <cedric.pinson@plopbyte.net>
 *
 */

osgGA.OrbitManipulator2 = function () {
    this.distance = 25;
    this.target = [ 0,0, 0];
    this.eye = [ 0, this.distance, 0];
    this.rotation = osg.Matrix.makeRotate(-Math.PI/3.0, 1,0,0); // osg.Quat.makeIdentity();
    this.up = [0, 0, 1];
    this.time = 0.0;
    this.dx = 0.0;
    this.dy = 0.0;
    this.buttonup = true;
    this.scale = 1.0;
    this.targetDistance = this.distance;
    this.currentMode = "rotate";

    this.measureDeltaX = 0;
    this.measureDeltaY = 0;
    this.measureClientY = 0;
    this.measureClientX = 0;
    this.measureTime = 0;
    this.direction = 0.0;

    this.height = 0;
    this.motionWhenRelease = 1.0;

    this.maxDistance = 0;
    this.minDistance = 0;
    this.goToLocationRunning = false;

    this.contactsIntialDistance =1.0;
    this.nbContacts = 0;
    this.contacts = [];
    this.contactsPosition = [];
    this.zoomModeUsed = false;
};

osgGA.OrbitManipulator2.prototype = {
    panModel: function(dx, dy) {

        var inv = osg.Matrix.inverse(this.rotation);
        var x = [ osg.Matrix.get(inv, 0,0), osg.Matrix.get(inv, 0,1), 0 ];
        x = osg.Vec3.normalize(x);
        var y = [ osg.Matrix.get(inv, 1,0), osg.Matrix.get(inv, 1,1), 0 ];
        y = osg.Vec3.normalize(y);

        osg.Vec3.add(this.target, osg.Vec3.mult(x, -dx), this.target);
        osg.Vec3.add(this.target, osg.Vec3.mult(y, -dy), this.target);
    },

    getScaleFromHeight: function(eye) {
        var distFromSurface = eye;
        var WGS_84_RADIUS_EQUATOR = 6378137.0;
        var scaleOneFromSurface = WGS_84_RADIUS_EQUATOR;
        var ratio = distFromSurface/scaleOneFromSurface;
        // clamp the scale
        if (ratio > 0.8) {
            ratio = 0.8;
        }
        //osg.log(ratio);
        var scale = ratio/20.0;
        return scale;
    },

    computeRotation: function(dx, dy) {
        
        var scale = 1.0/10.0;
        scale = this.scale;

        var of = osg.Matrix.makeRotate(dx * scale, 0,0,1);
        var r = osg.Matrix.mult(of, this.rotation);

        of = osg.Matrix.makeRotate(dy * scale/2.0, 1,0,0);
        var r2 = osg.Matrix.mult(r, of);

        // test that the eye is not too up and not too down to not kill
        // the rotation matrix
        var eye = osg.Matrix.transformVec3([0, 0, this.distance], osg.Matrix.inverse(r2));
        if (eye[2] > 0.99*this.distance || eye[2] < -0.99*this.distance) {
            //discard rotation on y
            this.rotation = r;
            return;
        }
        this.rotation = r2;
    },

    
    goToLocation: function(lat, lng) {
        // already running switch to new location
        var pos3d = convertLatLongHeightToXYZ(lat*Math.PI/180.0, lng*Math.PI/180.0);
        var lookat = osg.Matrix.makeLookAt(pos3d, [0,0,0], [0,0,-1]);
        var q = osg.Matrix.getRotate(lookat);

        if (this.goToLocationRunning) {
            var qStart = this.getGoToLocationQuaternion();
            this.rotation = osg.Matrix.makeRotateFromQuat(osg.Quat.conj(qStart));
        }
        this.targetRotation = q;
        this.goToLocationTime = (new Date()).getTime();
        this.goToLocationRunning = true;

        this.disableAutomaticMotion(4.0);
    },

    update: function(dx, dy) {
        if (dx > 0) {
            this.direction = 1.0;
        } else if (dx < 0) {
            this.direction = -1.0;
        }
        this.dx += dx;
        this.dy += dy;

        if (Math.abs(dx) + Math.abs(dy) > 0.0) {
            this.time = (new Date()).getTime();
        }
    },

    dblclick: function() {
        //this.goToLocation(-3.948104, -54.045366);
        return true;
    },
    updateWithDelay: function() {
        var f = 1.0;
        var dt;
        var max = 2.0;
        var dx = this.dx;
        var dy = this.dy;
        if (this.buttonup) {
            f = 0.0;
            dt = ((new Date()).getTime() - this.time)/1000.0;
            if (dt < max) {
                f = 1.0 - osgAnimation.EaseOutQuad(dt/max);
            }
            dx *= f;
            dy *= f;

            var min = 0.015;
            if (Math.abs(dx) < min) {
                dx = min*this.direction * this.motionWhenRelease;
                this.dx = dx;
            }

            var val = Math.abs(this.dx) + Math.abs(this.dy);

        } else {
            this.dx = 0;
            this.dy = 0;
        }

        if (Math.abs(dx) + Math.abs(dy) > 0.0) {
            this.computeRotation(dx, dy);
        }
    },

    disableAutomaticMotion: function(duration) {
        var min = 0.015;
        this.motionWhenRelease = 0.0;
        if (this.timeout === undefined) {
            var that = this;
            this.timeout = true;
            window.setTimeout(function() {
                if (Math.abs(that.dx) + Math.abs(that.dy) === 0.0) {
                    that.motionWhenRelease = 1.0;
                    that.update(min+0.0001,0);
                }
                delete that.timeout;
            }, duration * 1000);
        }
    },

    mouseup: function(ev) {
        this.buttonup = true;
        
        var time = (new Date()).getTime()/1000.0;
        if (time - this.lastMotion > 0.05) {
            this.dx = 0;
            this.dy = 0;
            this.disableAutomaticMotion(4.0);
        } else {
            this.dx = this.lastDeltaX;
            this.dy = this.lastDeltaY;
            this.motionWhenRelease = 1.0;
        }

        if (this.pushHit !== undefined) {
            var hit = this.getIntersection();
            if (hit !== undefined) {
                if (hit.name === this.pushHit.name) {
                    //osg.log(hit.name + " intersected");
                    displayHtmlTweetContent(hit.item.tweet);
                }
            }
        }
        //osg.log(this.dx + " " + this.dy);
    },
    mousemove: function(ev) {

        if (this.buttonup === true) {
            return;
        }

        var scaleFactor;
        var curX;
        var curY;
        var deltaX;
        var deltaY;
        var pos = this.convertEventToCanvas(ev);
        curX = pos[0];
        curY = pos[1];

        scaleFactor = 10.0;
        deltaX = (this.clientX - curX) / scaleFactor;
        deltaY = (this.clientY - curY) / scaleFactor;
        this.clientX = curX;
        this.clientY = curY;

        var time = (new Date()).getTime()/1000.0;
        this.lastMotion = time;
        this.lastDeltaX = deltaX;
        this.lastDeltaY = deltaY;

        this.update(deltaX, deltaY);
    },
    mousedown: function(ev) {
        var pos = this.convertEventToCanvas(ev);
        this.clientX = pos[0];
        this.clientY = pos[1];
        this.pushButton();
        this.measureTime = (new Date()).getTime()/1000.0;
    },

    touchDown: function(ev) {
        if (this.nbContacts >= 2 || (this.nbContacts < 2 && this.zoomModeUsed === true)) {
            return;
        }
        this.contacts[this.nbContacts] = ev.streamId;
        if (this.contactsPosition[this.nbContacts] === undefined) {
            this.contactsPosition[this.nbContacts] = {};
        }
        this.contactsPosition[this.nbContacts].x = ev.clientX;
        this.contactsPosition[this.nbContacts].y = ev.clientY;
        this.nbContacts++;
        if (this.nbContacts === 1) {
            this.mousedown(ev);
        } else {

            var x1 = this.contactsPosition[0].x;
            var x2 = this.contactsPosition[1].x;
            var y1 = this.contactsPosition[0].y;
            var y2 = this.contactsPosition[1].y;
            var dist = Math.sqrt( (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1) );
            this.contactsIntialDistance = dist;
			//osg.log("2 contacts " + this.contactsIntialDistance);
			}
    },
    touchUp: function(ev) {
        if (this.zoomModeUsed === false && this.nbContacts === 1) {
			//osg.log("use a mouse up ");
            this.mouseup(ev);
        }
        this.nbContacts--;
		if (this.nbContacts === 0) {
			this.zoomModeUsed = false;
		}
    },
    touchMove: function(ev) {
        if (this.nbContacts === 2) {
            // zoom mode
	    this.zoomModeUsed = true;
            if (this.contacts[0] === ev.streamId) {
                if (this.contactsPosition[0] === undefined) {
                    this.contactsPosition[0] = {};
                }
                this.contactsPosition[0].x = ev.clientX;
                this.contactsPosition[0].y = ev.clientY;
            } else if (this.contacts[1] === ev.streamId) {
                if (this.contactsPosition[1] === undefined) {
                    this.contactsPosition[1] = {};
                }
                this.contactsPosition[1].x = ev.clientX;
                this.contactsPosition[1].y = ev.clientY;
            } else {
                osg.log("dont find the contact something weird");
            }
            var x1 = this.contactsPosition[0].x;
            var x2 = this.contactsPosition[1].x;
            var y1 = this.contactsPosition[0].y;
            var y2 = this.contactsPosition[1].y;
            var dist = Math.sqrt( (x2-x1)*(x2-x1) + (y2-y1)*(y2-y1) );
            var ratio = this.contactsIntialDistance/dist;
	    //osg.log("2 cts " + ratio);
            this.contactsIntialDistance = dist;
            var h = this.height;
            //this.distance = this.targetDistance;
            this.targetDistance += (ratio - 1.0) * this.scale * 50.0* 6378137/2.0;
	    if (this.maxDistance !== 0.0 && this.targetDistance > this.maxDistance) {
		this.targetDistance = this.maxDistance;
	    }
	    if (this.minDistance !== 0.0 && this.targetDistance < this.minDistance) {
		this.targetDistance = this.minDistance;
	    }
	    this.distance = this.targetDistance;
	    //osg.log("target distance " + this.targetDistance);
            this.timeMotion = (new Date()).getTime();
            
        } else {
            // rotation
	    if (this.zoomModeUsed === false) {
		this.mousemove(ev);
	    }
        }
    },

    setDistance: function(d) {
        this.distance = d;
        this.targetDistance = this.distance;
    },
    setMaxDistance: function(d) {
        this.maxDistance =  d;
    },
    setMinDistance: function(d) {
        this.minDistance =  d;
    },

    getHeight: function() {
        var h;
        var lat;
        var lng;
        
        var llh = convertXYZToLatLongHeight(this.eye[0], this.eye[1], this.eye[2]);
        return llh[2];
        //osg.log("height " + llh[2] + " distance " + this.distance);
    },

    distanceIncrease: function() {
        var h = this.height;
        var currentTarget = this.targetDistance;
        var newTarget = currentTarget + h/10.0;
        if (this.maxDistance > 0) {
            if (newTarget > this.maxDistance) {
                newTarget = this.maxDistance;
            }
        }
        this.distance = currentTarget;
        this.targetDistance = newTarget;
        this.timeMotion = (new Date()).getTime();
    },
    distanceDecrease: function() {
        var h = this.height;
        var currentTarget = this.targetDistance;
        var newTarget = currentTarget - h/10.0;
        if (this.minDistance > 0) {
            if (newTarget < this.minDistance) {
                newTarget = this.minDistance;
            }
        }
        this.distance = currentTarget;
        this.targetDistance = newTarget;
        this.timeMotion = (new Date()).getTime();
    },
    
    pushButton: function() {
        this.dx = this.dy = 0;
        this.buttonup = false;

        var hit = this.getIntersection();
        this.pushHit = hit;
    },

    getIntersection: function() {
        var hits = this.view.computeIntersections(this.clientX, this.clientY, 1);
        var l = hits.length;
        if (l === 0 ) {
            return undefined;
        }
        hits.sort(function(a,b) {
            return a.ratio - b.ratio;
        });

        // use the first hit
        var hit = hits[0].nodepath;
        var l2 = hit.length;
        var itemSelected;
        var name;
        while (l2-- >= 0) {
            if (hit[l2].itemToIntersect !== undefined) {
                name = hit[l2].getName();
                //itemSelected = hit[l2].children[0].getUpdateCallback();
                itemSelected = hit[l2];
                break;
            }
        }
        return { 'name': name, 
                 'item': itemSelected };
    },

    getGoToLocationQuaternion: function() {
        var goToLocationDuration = 2.0;
        target = this.target;
        distance = this.distance;

        var q0 = osg.Matrix.getRotate(this.rotation);
        var q1 = this.targetRotation;

        var t = ((new Date()).getTime() - this.goToLocationTime)/1000.0;
        if (t > goToLocationDuration) {
            t = 1.0;
            this.goToLocationRunning = false;
            this.rotation = osg.Matrix.makeRotateFromQuat(q1);
            this.dx = 0;
            this.dy = 0;
        } else {
            t = osgAnimation.EaseOutCubic(t/goToLocationDuration);
        }
        var qCurrent = osg.Quat.slerp(t, q0, q1);
        osg.Quat.conj(qCurrent, qCurrent);
        return qCurrent;
    },

    getInverseMatrix: function () {
        var inv;
        var target;
        var distance;
        var eye;
        if (this.goToLocationRunning === true ) {
            distance = this.distance;
            target = this.target;
            var qCurrent = this.getGoToLocationQuaternion();
            eye = osg.Matrix.transformVec3([0, 0, distance], osg.Matrix.makeRotateFromQuat(qCurrent));
            this.eye = eye;
            inv = osg.Matrix.makeLookAt(osg.Vec3.add(target,eye), target, [0,0,1]);

        } else {

            this.updateWithDelay();

            target = this.target;
            distance = this.distance;

            if (this.timeMotion !== undefined) { // we have a camera motion event
                var dt = ((new Date()).getTime() - this.timeMotion)/1000.0;
                var motionDuration = 1.0;
                if (dt < motionDuration) {
                    var r = osgAnimation.EaseOutQuad(dt/motionDuration);
                    if (this.targetMotion) {
                        target = osg.Vec3.add(this.target, osg.Vec3.mult(osg.Vec3.sub(this.targetMotion, this.target), r));
                    }
                    if (this.targetDistance) {
                        distance = this.distance + (this.targetDistance - this.distance) * r;
                    }
                } else {
                    if (this.targetMotion) {
                        this.target = this.targetMotion;
                        target = this.targetMotion;
                    }
                    if (this.targetDistance) {
                        this.distance = this.targetDistance;
                        distance = this.targetDistance;
                    }
                    this.timeMotion = undefined;
                }
            }
            
            //this.targetMotion
            eye = osg.Matrix.transformVec3([0, 0, distance], osg.Matrix.inverse(this.rotation));
            this.eye = eye;
            inv = osg.Matrix.makeLookAt(osg.Vec3.add(target,eye), target, [0,0,1]);
        }

        this.height = this.getHeight();
        this.scale = this.getScaleFromHeight(this.height);
//        osg.log("height " + this.height + " scale " + this.height/6378137.0);
        return inv;
    }

};

