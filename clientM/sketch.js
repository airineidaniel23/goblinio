// Daniel Shiffman
// http://codingtra.in
// http://patreon.com/codingtrain
// Code for: https://youtu.be/JXuxYMGe4KI

var blob;
var zoom = 1;
var goblinL = new Image();
goblinL.src = 'clientM/img/goblinL.png';

var goblinR = new Image();
goblinR.src = 'clientM/img/goblinR.png';

function setup() {
  createCanvas(window.innerWidth, window.innerHeight);
  blob = new Blob(width/2, height/2, 64);
}

function draw() {
  background(0);

  translate(width / 2- 50, height / 2 - 50);
  var newzoom = 64 / blob.r;
  zoom = lerp(zoom, newzoom, 0.1);
  scale(zoom);
  translate(-blob.pos.x, -blob.pos.y);

  for (var i = 100 - 1; i >= 0; i--) {
    fill(255);
    ellipse((width/10) * floor(i/10), (height/10) * (i % 10), 10, 10);
  }


  blob.show();
  blob.update();

}