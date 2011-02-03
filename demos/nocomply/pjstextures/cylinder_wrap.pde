int width = 128;
int height = 128;
int wave_height = height/3;

void setup() {
  size(128, 128);
}

void draw() {
	if (!audioData.vu)
    return;

	background(0,0,0);
  int r = (sin(frameCount/50)+1)*127;
  int g = (sin(frameCount/100)+1)*127;
  int b = (sin(frameCount/60)+1)*127;

  strokeWeight((sin(frameCount/20)+1)*2);
 	stroke(r, g, b);
  for (int i = 0; i < width; i+=4) {
    rect(i, height/2, 4, max(0,audioData.vu.vu_levels[i]*height/2)*sin(frameCount/50));
  }
  stroke(255,255,255);
  strokeWeight(2);
  for (int i = 0; i < width; ++i) {
		float mi = Math.abs(audioData.signal[4*i]);
    line(i, height/2 - audioData.signal[4*i] * wave_height, i + 1, height/2 - audioData.signal[(4*(i+1))%512] * wave_height);
  }
  stroke(0,0,0);
  strokeWeight((Math.sin(gfxData.frameCounter/10)+1)*1.5);
  for (int i = 0; i < height; i+=4) {
    line(0, i, width, i);
  }
}
