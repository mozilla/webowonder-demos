#ifdef GL_ES
precision highp float;
#endif
uniform sampler2D srcTex;
varying vec2 vTex;
uniform vec3 texel;
uniform float kickSource;
uniform float timerSeconds;

void main(void)
{
  vec4 c = texture2D(srcTex,vTex + vec2(kickSource*texel.x*40.0*sin((vTex.y+timerSeconds)*1000.0),0.0));
  
  c.rgb -= kickSource*(cos(vTex.y/texel.y)+1.0)/2.0;
  
  gl_FragColor = c;
}
