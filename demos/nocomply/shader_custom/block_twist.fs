#ifdef GL_ES
precision highp float;
#endif
uniform sampler2D srcTex;
varying vec2 vTex;
uniform vec3 texel;

void main(void)
{
  gl_FragColor = texture2D(srcTex,vTex + vec2(sin(vTex.x*100.0)*texel.x*6.0,cos(vTex.y*100.0)*texel.y*6.0));
}
