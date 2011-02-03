PFont font; 
int x_step;
int x_width;
int bar_height;
int width = 128;
int height = 128;

void setup() {
  size(128, 128);
  frameRate(24);

  font = loadFont("Arial");
  textFont(font, 32);
	noLoop();
}

void draw() {

  if (!audioData.vu) return;
	
//	background(10,10,10, 255); 
	background(30,30,30, 255); 

  noStroke();


  strokeWeight(0.0);

	if (audioData.vu.vu_levels.length)
	{
		int x_step = (width/(audioData.bd.config.BD_DETECTION_RANGES/2));
		int x_width = (width/(audioData.bd.config.BD_DETECTION_RANGES/2))-2;

		for (int i = 0; i < audioData.bd.config.BD_DETECTION_RANGES/2; i++)
		{
//				int v_i = Math.abs((i-32))%32;
        int v_i = Math.floor(Math.abs(32+(32-Math.abs(i-64)))*1.75);

				fill(4.0*audioData.vu.vu_levels[v_i]*audioData.clearClr[0]*255,4.0*audioData.vu.vu_levels[v_i]*audioData.clearClr[1]*255,4.0*audioData.vu.vu_levels[v_i]*audioData.clearClr[2]*255,255);
				
				int x = 128.0/8.0 * (i%8) + 128.0/16.0;
				int y = 128.0/8.0 * Math.floor(i/8) + 128.0/16.0;
				
				sz = 14;
				
				rect(x-7,y-7,sz,sz);
		}
	}


}
