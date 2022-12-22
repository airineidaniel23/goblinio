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

const width = 500;
const height = 500;
const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;

var Player = function(id) {
    var self = {
        x: 250,
        y: 250,
        id: id,
        number: "" + Math.floor(10 * Math.random()),
        pR: false,
        pL: false,
        pU: false,
        pD: false,
        mouseX: 251,
        mouseY: 250,
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
        if (self.y > width - 100) {
            if (self.jumping == true) {
                self.jumping = false;
                self.acc = 0;
                self.speed = 0;
            }
        } else if (self.jumping == false) {
            self.jumping = true;
        }
        self.speed += self.acc;
        self.y += self.speed;
    }
    return self;
}

let ground = [];
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
io.sockets.on('connection', function(socket) {
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

setInterval(function() {
    pack = [];
    for (var i in player_list) {
        var player = player_list[i];
        player.updatePosition();
        pack.push({
            x: player.x,
            y: player.y,
            facingLeft: player.facingLeft,
            number: player.number
        });
    }
    for(var i in socket_list) {
        var socket = socket_list[i];
        socket.emit('newPositions', pack);
    }
}, 1000/25);