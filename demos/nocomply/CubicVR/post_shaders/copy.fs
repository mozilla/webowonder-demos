#ifdef GL_ES
precision highp float;
#endif
uniform sampler2D srcTex;
varying vec2 vTex;
void main(void) {
  gl_FragColor = texture2D(srcTex, vTex);
}