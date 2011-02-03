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
  
  c.r = texture2D(srcTex,vTex + vec2((kickSource*6.0+2.0)*-texel.x,0.0)).r;
  c.g = texture2D(srcTex,vTex + vec2(0.0,0.0)).g;
  c.b = texture2D(srcTex,vTex + vec2((kickSource*6.0+2.0)*texel.x,0.0)).b;
  c.a = 1.0;
  
  c.rgb *= (1.0-kickSource)+(kickSource)*clamp(1.0-((cos(vTex.y/texel.y)+1.0)/2.0),0.5,1.0);
  
  gl_FragColor = c;
}
