void setup(){
  frameRate(10);
  size(256,32);  
  drawBack(); 
}

  PFont metaBold;
  metaBold = loadFont("Mono");
  textFont(metaBold);

void draw(){

  // Draw dark screen
  noStroke();
  fill(#231f20);
  rect(6.5,6.5,width-14.5,height-14.5); 

  // Draw text
  stroke(255); 
  fill(255);
  
  text("NEXT STOP: YOUR MUM'S", 10, 20);
}


void drawBack(){
  background(#231f20);
  
  noStroke();
  fill(#a7a8ac);
  rect(1.5,1.5,width-4.5,height-4.5);
   
  stroke(#f1f1f1);
  line(6.5,height-6.5,width-6.5,height-6.5); 
  line(width-6.5,height-6.5,width-6.5,6.5);
  
  stroke(#6c6d6f);
  line(6.5,6.5,width-6.5,6.5); 
  line(6.5,6.5,6.5,height-6.5);
}

//a7a8ac//6c6d6f//6d6d6f//f1f1f1//e92026//7c061c
