/** -*- compile-command: "jslint-cli demo.js" -*-
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

function convertLatLongHeightToXYZ(latitude, longitude, height) 
{
    var WGS_84_RADIUS_EQUATOR = 6378137.0;
    var WGS_84_RADIUS_POLAR = 6356752.3142;
    var radiusEquator = WGS_84_RADIUS_EQUATOR;
    var radiusPolar = WGS_84_RADIUS_POLAR;

    //void computeCoefficients()
    var flattening = (radiusEquator-radiusPolar)/radiusEquator;
    var eccentricitySquared = 2*flattening - flattening*flattening;

    if (height === undefined) {
        height = 0.0;
    }

    var sin_latitude = Math.sin(latitude);
    var cos_latitude = Math.cos(latitude);
    var N = radiusEquator / Math.sqrt( 1.0 - eccentricitySquared*sin_latitude*sin_latitude);
    var X = (N+height)*cos_latitude*Math.cos(longitude);
    var Y = (N+height)*cos_latitude*Math.sin(longitude);
    var Z = (N*(1-eccentricitySquared)+height)*sin_latitude;
    return [X, Y, Z];
}

function computeCoordinateFrame( latitude,  longitude, localToWorld)
{
    // Compute up vector
    var  up = [ Math.cos(longitude)*Math.cos(latitude), Math.sin(longitude)*Math.cos(latitude), Math.sin(latitude) ];

    // Compute east vector
    var east = [-Math.sin(longitude), Math.cos(longitude), 0];

    // Compute north vector = outer product up x east
    var north = osg.Vec3.cross(up,east);

    // set matrix
    osg.Matrix.set(localToWorld,0,0, east[0]);
    osg.Matrix.set(localToWorld,0,1, east[1]);
    osg.Matrix.set(localToWorld,0,2, east[2]);

    osg.Matrix.set(localToWorld,1,0, north[0]);
    osg.Matrix.set(localToWorld,1,1, north[1]);
    osg.Matrix.set(localToWorld,1,2, north[2]);

    osg.Matrix.set(localToWorld,2,0, up[0]);
    osg.Matrix.set(localToWorld,2,1, up[1]);
    osg.Matrix.set(localToWorld,2,2, up[2]);
}

function computeLocalToWorldTransformFromLatLongHeight(latitude, longitude, height)
{
    var pos = convertLatLongHeightToXYZ(latitude, longitude, height);
    var m = osg.Matrix.makeTranslate(pos[0], pos[1], pos[2]);
    computeCoordinateFrame(latitude, longitude, m);
    return m;
}


function convertXYZToLatLongHeight( X,  Y,  Z)
{
    var latitude, longitude, height;

    var WGS_84_RADIUS_EQUATOR = 6378137.0;
    var WGS_84_RADIUS_POLAR = 6356752.3142;
    var radiusEquator = WGS_84_RADIUS_EQUATOR;
    var radiusPolar = WGS_84_RADIUS_POLAR;

    // http://www.colorado.edu/geography/gcraft/notes/datum/gif/xyzllh.gif
    var p = Math.sqrt(X*X + Y*Y);
    var theta = Math.atan2(Z*radiusEquator , (p*radiusPolar));
    var eDashSquared = (radiusEquator*radiusEquator - radiusPolar*radiusPolar)/(radiusPolar*radiusPolar);

    var sin_theta = Math.sin(theta);
    var cos_theta = Math.cos(theta);

    var flattening = (radiusEquator-radiusPolar)/radiusEquator;
    var eccentricitySquared = 2*flattening - flattening*flattening;

    latitude = Math.atan( (Z + eDashSquared*radiusPolar*sin_theta*sin_theta*sin_theta) /
                     (p - eccentricitySquared*radiusEquator*cos_theta*cos_theta*cos_theta) );
    longitude = Math.atan2(Y,X);

    var sin_latitude = Math.sin(latitude);
    var N = radiusEquator / Math.sqrt( 1.0 - eccentricitySquared*sin_latitude*sin_latitude);

    height = p/Math.cos(latitude) - N;
    return [latitude, longitude, height];
}

