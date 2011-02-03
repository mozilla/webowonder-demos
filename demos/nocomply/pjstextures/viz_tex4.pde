int width = 128;
int height = 128;

void setup() {
  size(128, 128);
}

void draw() {
	if (audioData.vu == null) return;
	background(0,0,0); 
	stroke(255, 255 ,255);
  fill(255, 255, 255);
  strokeWeight(2);

  for ( int i = 0; i < 128; i++) {
		float mi = Math.abs(audioData.signal[4*i]);
    line(i, 32 - audioData.signal[4*i] * 32, i + 1, 32 - audioData.signal[(4*(i+1))%512] * 32);
  }

}
