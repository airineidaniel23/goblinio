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

const width = 1300;
const height = 600;
var groundWidth = 1360;
var groundHeight = 240;
var tileSize = 80;
var playerHeight = 100;
var playerWidth = 100;
const GRID_WIDTH = groundWidth / tileSize; // adimensionala
const GRID_HEIGHT = groundHeight / tileSize;

var Player = function(id) {
    var self = {
        x: width/2,
        y: height/2,
        id: id,
        number: "" + Math.floor(10 * Math.random()),
        pR: false,
        pL: false,
        pU: false,
        pD: false,
        mouseX: width/2,
        mouseY: height/2,
        jumping: false,
        facingLeft: false,
        speed: 0,
        acc: 1,
        maxSpeed: 10  
    }
    self.updatePosition = function() {
        if(self.pR && self.x < width)
            self.x += self.maxSpeed;
        if(self.pL && self.x > 0)
            self.x -= self.maxSpeed;
        if(self.pU && self.jumping == false) {
            self.speed = - 10;
            self.acc = 1;
        }
        if (self.mouseX < self.x)
            self.facingLeft = true;
        else self.facingLeft = false;
        if (self.y > height - groundHeight - playerHeight / 2) { //we compare with playerHeight/2 because 
            //character is techincally always half burried but we draw him further up so we can pretend
            // his coordinates are from the center, not the upper left corner like the tiles
            if (self.jumping == true) {
                self.jumping = false;
                self.acc = 0;
                self.speed = 0;
                self.y = height - groundHeight - playerHeight / 2 + 1;
            }
        } else if (self.jumping == false) {
            self.jumping = true;
        }
        self.speed += self.acc;
        self.y += self.speed;
    }
    return self;
}

var ground = [];
for (let i = 0; i < GRID_HEIGHT; i++) {
  ground[i] = [];
  for (let j = 0; j < GRID_WIDTH; j++) {
    ground[i][j] = {
      mined: false,  // Whether this tile has been mined or not
      value: 0       // The value of this tile (e.g. ore amount)
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
        player.mouseX = data.x;
        player.mouseY = data.y;
    });
});

setInterval(function() { //aici tratez emitting
    pack = [];
    var g = 1;
    var y = 2;
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
        ground: ground
    }
    
    for(var i in socket_list) {
        var socket = socket_list[i];
        serverData.personal = player_list[socket.id];
        socket.emit('newPositions', serverData);
    }
}, 25);