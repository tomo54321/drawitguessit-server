var app = require('express')();

var http = require('http').createServer(app);

var io = require("socket.io");

var server = io.listen(http, {
   path: "/" 
});

server.on("connection", (socket)=>{

    console.log("User Connected");

    /**
     * When the user joins a game room.
     */
    socket.on("join room", ({room, username})=>{
        console.log(username+" Connected To Room " + room);

        //Give the user their username
        socket.username = username;
        //Let everyone else know this user has joined
        socket.to(room).emit("user joined", {username});
        // tell the joining user whos in the room already
        
        getAllUsersInRoom(room).then((users)=>{
            socket.emit("user list", users);
        });

        // actually join them to the room.
        socket.join(room);
    });

    /**
     * Send the current pen position.
     */
    socket.on("push point", ({room, x, y})=>{
        socket.to(room).emit("push points", {x, y});
    });

    /**
     * When the users pen is off the paper
     */
    socket.on("stopped drawing", ({room})=>{
        socket.to(room).emit("stopped drawing");
    });

    /**
     * A Canvas action happens eg clear or thickness / color change
     */
    socket.on("canvas action", ({room, action, data})=>{
        socket.to(room).emit("canvas action", {action, data})
    });

    /**
     * When the user sends a chat message
     */
    socket.on("send chat message", ({room, message})=>{
        server.in(room).emit("chat message recieved",{
            username: socket.username,
            message
        });
    });

    /**
     * User has quit the game they're in but hasn't disconnected from servers.
     */
    socket.on("leave room", ({room})=>{
        console.log("User Disconnected From Room " + room);
        socket.to(room).emit("user left", {username: socket.username});
        socket.leave(room);
    });

    /**
     * When the user is leaving but hasn't left yet
     */
    socket.on("disconnecting", (reason)=>{
        let rooms = Object.keys(socket.rooms);
        rooms.map((v)=>{
            socket.to(v).emit("user left", {username: socket.username});
        });
    });

    /**
     * When the user has left
     */
    socket.on("disconnect", ()=>{
        console.log("User Disconnected");
    });

});


function getAllUsersInRoom(room_name){
    return new Promise((resolve, reject)=>{
        server.in(room_name).clients((err, clients) => {
            let client_usernames = [];

            clients.map((v)=>{
                client_usernames.push(server.sockets.connected[v].username)
            });
            resolve(client_usernames);

        });
       
    });
}

http.listen(8000, () => {
  console.log('listening on *:8000');
});