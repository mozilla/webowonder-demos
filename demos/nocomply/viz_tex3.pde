int width = 128;
int height = 128;
int num_rings = 6;
int[] rings = new int[num_rings];

void setup() {
  size(128, 128);
	noLoop();
  for (int i=num_rings; i>0; --i) {
    rings[i] = 0;
  } //for
}

void draw() {
  if (!vu) return;
	background(0,0,0); 
  noStroke();
  strokeWeight(0.0);
  rectMode(CENTER);
  ellipseMode(CENTER);
  for (int i=num_rings; i>0; --i) {
    var c = min(1, vu.vu_levels[i*2]) * 255;
    if (c > rings[i]) {
      rings[i] = c;
    }
    else {
      rings[i] *= 0.65;
    } //if
    c = rings[i];
    fill(c,c,c, 255);
    rect(64, 64, width/num_rings*(i), height/num_rings*(i));
  } //for
} //draw
