var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/testLocal2/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
app.use('/testLocal2', express.static(__dirname + '/testLocal2'));

serv.listen(2000);
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

