#ifdef GL_ES
precision highp float;
#endif
uniform sampler2D srcTex;
varying vec2 vTex;
uniform vec3 texel;
uniform float kickSource;

void main(void)
{
  vec4 c;
  vec3 a;
  
  c.rgb = normalize(texture2D(srcTex,vTex).rgb);
  c.a = 1.0;
  
  gl_FragColor = c;
}
