
function Blob(x, y, r) {
    this.pos = createVector(x, y);
    this.r = r;
    this.vel = createVector(0, 0);
    this.update = function() {
      var newvel = createVector(mouseX - width / 2, mouseY - height / 2);
      newvel.setMag(3);
      this.vel.lerp(newvel, 0.2);
      let oldPos = createVector(this.pos.x, this.pos.y);
      oldPos.add(this.vel);
      if (oldPos.x < 0 || oldPos.x > width)
        this.vel.x = 0;
      if (oldPos.y < 0 || oldPos.y > height)
        this.vel.y = 0;
      
      this.pos.add(this.vel);
    }
  
    this.show = function() {
        var cnvs = canvas.getContext("2d");
        if (this.vel.x < 0) {
            cnvs.drawImage(goblinL,this.pos.x , this.pos.y , 100, 100);    
        }
        else cnvs.drawImage(goblinR,this.pos.x , this.pos.y , 100, 100);    
    }
  }