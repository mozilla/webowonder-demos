#ifdef GL_ES
precision highp float;
#endif
uniform sampler2D srcTex;
varying vec2 vTex;
uniform vec3 texel;
uniform float kickSource;

void main(void)
{
  gl_FragColor.r = texture2D(srcTex,vTex + vec2(kickSource*texel.x*(10.0*sin(kickSource*vTex.y*20.0)+20.0*cos(vTex.y*100.0)+20.0*sin(vTex.y*200.0)),0.0)).r;
  gl_FragColor.g = texture2D(srcTex,vTex + vec2(kickSource*texel.x*(-10.0*sin(vTex.y*25.0)+20.0*cos(kickSource*vTex.y*90.0)+30.0*-sin(vTex.y*200.0)),0.0)).g;
  gl_FragColor.b = texture2D(srcTex,vTex + vec2(kickSource*texel.x*(10.0*sin(-vTex.y*30.0)+20.0*cos(vTex.y*75.0)+15.0*sin(kickSource*-vTex.y*200.0)),0.0)).b;
}