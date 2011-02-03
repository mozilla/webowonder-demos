/* @pjs transparent=true; */
int width = 128;
int height = 128;
int wave_middle = height/2;
int wave_width = height/3;
int m_dist = height/4;
int skip = 2;

void setup() {
  background(0,0);
  size(width, height);
  background(0);
}

void draw() {
	if (!audioData.vu)
    return;
	background(0,0);
  int c = sin(timerData.timerSeconds/10)*128+127;
  noFill();
 	stroke(c,c/2.5,0.1);
  strokeWeight(6);
  for (int i = 0; i < width; i+=skip) {
    float y1 = audioData.signal[(4*i)%512]*wave_width;
    float y2 = audioData.signal[(4*(i+skip))%512]*wave_width;
    line(i, wave_middle - m_dist - y1, i + skip, wave_middle + m_dist - y2);
  }
  strokeWeight(1);
 	stroke(200,200,200);
  for (int i = 0; i < width; i+=skip) {
    float y1 = audioData.signal[(4*i)%512]*wave_width;
    float y2 = audioData.signal[(4*(i+skip))%512]*wave_width;
    line(i, wave_middle - m_dist - y1, i + skip, wave_middle + m_dist - y2);
  }
}
