var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/clientM/index.html');
});
app.use('/clientM', express.static(__dirname + '/clientM'));

serv.listen(process.env.PORT || 5000);
console.log("Server started");

var socket_list = {};
var player_list = {};
var pack = [];

var tr = 0;
const screenWidth = 1300;
const screenHeight = 700;
const width = 1600;
const height = 1300;
var groundWidth = 1600;
var groundHeight = 800;
var hitboxRatioXHalf = 0.3;
var hitboxRatioUpperHalf = 0.5;
var tileSize = 80;
var playerHeight = 100;
var playerWidth = 100;
var gridWidth = groundWidth / tileSize; // adimensionala
var gridHeight = groundHeight / tileSize;
var tileX, tileY;
var Player = function(id) {
    var self = {
        x: width/2,
        y: (height - groundHeight - playerHeight * 2),
        id: id,
        number: "" + Math.floor(10 * Math.random()),
        pR: false,
        pL: false,
        pU: false,
        pD: false,
        mouseX: width/2,
        mouseY: height/2,
        mousePressed: false,
        jumping: false,
        facingLeft: false,
        speed: 0, //vertical
        acc: 1,
        maxSpeed: 10, //horizontal 
        itemInHand: false,
        hoveredTile: {
            x: 0,
            y: 0, // this is tile number not actual coord
            enabled: false,
            isBeingMined: false
        }
    }
    self.updatePosition = function() {
        var groundUnder = checkGroundUnder(self); //Y of tile we are standing on
        
        if(self.pR) {
            var rightWall = checkRightWall(self.x + self.maxSpeed, self.y);
            if (rightWall === false) {
                self.x += self.maxSpeed;
                self.mouseX += self.maxSpeed;
            }
            else {
                self.mouseX += rightWall - playerWidth * hitboxRatioXHalf - self.x;
                self.x = rightWall - playerWidth * hitboxRatioXHalf; // rightwall is coordinate of wall, so player must be a bit to the left
            }
        }
        if(self.pL) {
            var leftWall = checkLeftWall(self.x - self.maxSpeed, self.y);
            if (leftWall === false) {
                self.x -= self.maxSpeed;
                self.mouseX -= self.maxSpeed;
            }
            // we add tileSize because leftWall is coord of left side of left tile(far away from character)
            else {
                self.mouseX += leftWall + tileSize + playerWidth * hitboxRatioXHalf - self.x;
                self.x = leftWall + tileSize + playerWidth * hitboxRatioXHalf; //these could be removed
            }
        }
        if(self.pU && self.jumping == false && groundUnder) { //daca nu pun groundUnder apare frame perfect bug care te catapulteaza
            self.speed = - 14;
            self.acc = 1;
            self.mouseY += groundUnder - playerHeight / 2 - 1 - self.y;
            self.y = groundUnder - playerHeight / 2 - 1;//we teleport player above ground
            groundUnder = false;  //we manually change the player state to jumping above ground
            self.jumping = true;
        }
        console.log(self.x + " " + self.mouseX);
        if ((self.mouseX < self.x && (self.x - self.mouseX < screenWidth / 2)) ||
             (self.mouseX > self.x && (self.x - self.mouseX + width < screenWidth /2)))
            self.facingLeft = true;
        else self.facingLeft = false;
        if (groundUnder) {
            if (self.jumping == true) {
                self.jumping = false;
                self.acc = 0;
                self.speed = 0;
                self.mouseY += groundUnder - playerHeight / 2 + 1 - self.y;
                self.y =  groundUnder - playerHeight / 2  + 1;
            }
        } else if (self.jumping == false) {
            self.jumping = true;
            self.acc = 1;
        } else if (checkCeiling(self.x, self.y + self.speed)){
            self.speed = 0;
        }
        self.speed += self.acc;
        self.y += self.speed;
        self.mouseY += self.speed;
        if (self.y > height) {// for cycling
            self.mouseY -= height;
            self.y -= height;
        } else if (self.x > width) {
            self.x -= width;
        } else if (self.x < 0) {
            self.x += width;
        }
        if (self.mouseX > width) {
            self.mouseX -= width;
        } else if (self.mouseX < 0) {
            self.mouseX += width;
        }
        mouseMoved(self);
    }
    return self;
}

var ground = [];
for (let i = 0; i < gridHeight; i++) {
  ground[i] = [];
  for (let j = 0; j < gridWidth; j++) {
    ground[i][j] = {
      mined: false,  // Whether this tile has been mined or not
      value: 0, // The value of this tile (e.g. ore amount)
      hp: 1,
      maxHp: 1   
    };
  }
}

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) { // aici tratez incoming
    console.log("socket connection");
    socket.id = Math.random();
    socket_list[socket.id] = socket;

    var player = Player(socket.id);
    player_list[socket.id] = player;

    socket.on('disconnect', function() {
        delete socket_list[socket.id];
        delete player_list[socket.id];
    });

    socket.on('keyPress', function(data) {
        if(data.inputId == "left")
            player.pL = data.state;
        else if(data.inputId == "right")
            player.pR = data.state;
        else if(data.inputId == "up")
            player.pU = data.state;
        else if(data.inputId == "down")
            player.pD = data.state; 
    });

    socket.on('mouseMoved', function(data) {
        if (data.x < 0)
            player.mouseX = data.x + width;
        else if (data.x > width)
            player.mouseX = data.x - width;
        else player.mouseX = data.x;
        
        player.mouseY = data.y;
        mouseMoved(player);     
    });

    socket.on('mouseDown', function(data) {
        player.mousePressed = true;
    });

    socket.on('mouseUp', function(data) {
        player.mousePressed = false;
    });
});

setInterval(function() { //aici tratez emitting
    pack = [];
    for (var i in player_list) {
        var tempPlayer = player_list[i];
        tempPlayer.updatePosition();
        pack.push({
            x: tempPlayer.x,
            y: tempPlayer.y,
            facingLeft: tempPlayer.facingLeft,
            number: tempPlayer.number
        });
    }

    var serverData = {
        players: pack,
        ground: ground //sa trimit doar groundul din jurul unui player sa nu hackeze fov mai mare
    }
    
    for(var i in socket_list) {
        var socket = socket_list[i];
        serverData.personal = player_list[socket.id];
        let ht = serverData.personal.hoveredTile;
        if (ht.enabled) {
            ht.isBeingMined = detectMining(serverData.personal);
            if (ground[ht.y][ht.x].hp == 0) {
                ground[ht.y][ht.x].mined = true;
                ht.enabled = false;
            } else if (ht.isBeingMined) {
                ground[ht.y][ht.x].hp--;
            }
        }
        socket.emit('newPositions', serverData);
    }
}, 25);



//=======================================COLLISIONS===========================

function checkGroundUnder(player) { //return Y of tile(s) that player is standing on, or false if there are none
    //we use playerHeight/2 because 
            //character is techincally always half burried but we draw him further up so we can pretend
            // his coordinates are from the center, not the upper left corner like the tiles
            //we use 0.28, because we set the treshold for movement at 0.3,
            // which causes us to set player at 0.29 when he is pushing against a wall,
            //but we still want him to not be registered as falling underground
            // so when falling we use 0.28
            //might be mongoloid approach but hey it works
            //update : nevermind, x axis movement limited to 0.3, also we dont set him
            //at 0.29 when pushing because we look for collision before movement
            // so we use 0.29 here (so when you push against a tile you dont get teleported up)
            //because current implementation sets you at stable y if you fall a bit underground
            //UPDATE: 0.29 disappeared, it is still 0.29~ if hitboxRatioXHalf is 0.3
    let tileLeft = pointInTile(player.x - playerWidth * (hitboxRatioXHalf * 0.95), player.y + playerHeight/2);
    let tileRight = pointInTile(player.x + playerWidth * (hitboxRatioXHalf * 0.95), player.y + playerHeight/2);
    if (tileLeft)
        return tileLeft;
    else if (tileRight)
        return tileRight;
    return false;
}



//does not work for tiles that are cycled more then one tile size, so you cant use it for mouse,
//but you can use it for character
function pointInTile(x, y, accessor) {  //returns X/Y of tile which includes the point, false otherwise
    if (x < -tileSize || x >= (gridWidth + 1)* tileSize)
        return false;
    if (y < height - groundHeight || y >= height)
        return false;
    if (x < 0)
        x += width;
    if (x >= gridWidth * tileSize)
        x -= width;
    tileX = Math.floor(x/ tileSize); //these are tileNo, not actual coord
    
    tileY = Math.floor((y - (height - groundHeight))/ tileSize);
    
    if (ground[tileY][tileX].mined)
        return false;

    if (accessor != "x")
        return (height - groundHeight) + tileY * tileSize;
    else return tileX * tileSize;
}

function checkLeftWall(x,y) { //returns true if left wall blocks
    //we dont check the lower part of him because it will signal a collision, even though it is hitbox
    //the smaller this difference is, the later we will get a "false fall through ground",
    // but if we make it too small, we glitch when we jump because it will be a "false false through ground"
    x = x - playerWidth * hitboxRatioXHalf; //basically creating a hitbox
    //if (x < 1)
    //    return 1 - tileSize; //we expect for left wall to be one tile size away because coordinates are upperleft corners (exception is character)
    // we subtract and add playerHeight/4 because we basically have two hitboxes:
    //one for up down movement and one for left right. We want to avoid detecting a ceiling, and 
    //we hope the ceiling function will stop us before we reach 1/4, if we are more than 1/4 in, we are probably
    //coming at it from the side
    var lowerLeft = pointInTile(x, y + playerHeight / 2 - playerHeight / 4, "x");
    if (!(lowerLeft === false))
        return lowerLeft;
    var upperLeft = pointInTile(x, y - playerHeight / 2  * (1- hitboxRatioUpperHalf) + playerHeight / 4, "x");
    if (!(upperLeft === false))
        return upperLeft;
    return false;
}

function checkRightWall(x,y) {
    x = x + playerWidth * hitboxRatioXHalf;
    //if (x >width)
    //    return width;
    var lowerRight = pointInTile(x, y + playerHeight / 2 - playerHeight / 4, "x");
    if (!(lowerRight === false))
        return lowerRight;
    // we subtract half a player height because of the way the character is drawn. we
    //add the hitboxratio to "lower the ceiling" (this is only the upper point)
    // and we add another 0.5 to compensate for the above line where we subtracted 
    // playerHeight /4 (that is only needed for lower checking, we should add it in there instead of compensating)
    var upperRight = pointInTile(x, y - playerHeight / 2  *(1- hitboxRatioUpperHalf ) + playerHeight / 4, "x");
    if (!(upperRight === false))
        return upperRight;
    return false;
}

function checkCeiling(x, y) {
    //we do 0.95 because up to that point we might be burried in the wall for teleport prevention
    var upperLeft =  pointInTile(x - playerWidth * hitboxRatioXHalf * 0.95, y - playerHeight / 2  *(1- hitboxRatioUpperHalf - 0.5));
    var upperRight = pointInTile(x + playerWidth * hitboxRatioXHalf * 0.95, y - playerHeight / 2  *(1- hitboxRatioUpperHalf - 0.5));
    if (upperLeft)
        return upperLeft;
    if (upperRight)
        return upperRight;
    return false;
}

//=====================================MOUSE======================================

function mouseMoved(player) {
    if (player.mouseX > 0 && player.mouseX < groundWidth && player.mouseY < height &&
        player.mouseY > (height - groundHeight)) {
        player.hoveredTile.enabled = true;
        player.hoveredTile.x = Math.floor(player.mouseX/groundWidth * gridWidth);//adimensional
        player.hoveredTile.y = Math.floor((player.mouseY - (height - groundHeight))/groundHeight * gridHeight);
    } else {
        player.hoveredTile.enabled = false;
    }
}

function detectMining(player) { //hoveredTile mousePressed from server
    xDist = player.x  - (player.hoveredTile.x * tileSize + tileSize/2);
    yDist = player.y  - ((height - groundHeight) + player.hoveredTile.y * tileSize + tileSize/2);
    return (Math.sqrt(xDist * xDist + yDist * yDist) < 100)  && player.mousePressed && player.hoveredTile.enabled;
}