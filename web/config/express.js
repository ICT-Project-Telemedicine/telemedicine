const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const methodOverride = require('method-override');
const cors = require('cors');

module.exports = function () {
    const app = express();

    const server = require('http').Server(app);
    const io = require('socket.io')(server);

    app.set("view engine", "ejs");
    app.set("views", process.cwd() + "/views");

    app.use(cookieParser());
    app.use(compression());
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
    app.use(methodOverride());
    app.use(cors());
    app.use(express.static(process.cwd() + '/public'));

    app.set("view engine", "ejs");
    app.set("views", process.cwd() + "/views");
    app.use(express.static(process.cwd() + '/static'));

    // Routing configure
    require('../src/router')(app);

    // Error Handling
    app.use(function(req, res) { res.status(404).send('잘못된 접근입니다.'); });
    
    io.on("connection", socket => {
        socket.on("join-room", (roomId, userId) => {
            socket.join(roomId);
            socket.to(roomId).broadcast.emit('user-connected', userId);
    
            socket.on('disconnect', () => {
                socket.to(roomId).broadcast.emit('user-disconnected', userId)
            });
        })
    });

    return server;
};