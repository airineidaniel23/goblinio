var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/clientM/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
app.use('/clientM', express.static(__dirname + '/clientM'));

serv.listen(process.env.PORT || 5000);
console.log("Server started");

var io = require('socket.io')(serv, {});
io.sockets.on('connection', function(socket) {
    console.log("socket connection");

    socket.on('happy', function(data) {
        console.log("am primit hapy" + " " + data['reason']);
    });

    socket.emit('serverMsg', {
        msg: 'hello'
    });
});

