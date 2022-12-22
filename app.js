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
        maxSpeed: 10  
    }
    self.updatePosition = function() {
        if(self.pR)
            self.x += self.maxSpeed;
        if(self.pL)
            self.x -= self.maxSpeed;
        if(self.pU)
            self.y -= self.maxSpeed;
        if(self.pD)
            self.y += self.maxSpeed;
            
    }
    return self;
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
});

setInterval(function() {
    pack = [];
    for (var i in player_list) {
        var player = player_list[i];
        player.updatePosition();
        pack.push({
            x: player.x,
            y: player.y,
            number: player.number
        });
    }
    for(var i in socket_list) {
        var socket = socket_list[i];
        socket.emit('newPositions', pack);
    }
}, 1000/25);