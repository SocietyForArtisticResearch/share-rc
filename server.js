var https = require('https');
//var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var WebSocket = require('ws');
var cors = require('cors');
var fs = require('fs');
const forceSsl = require('express-force-ssl');
var WebSocketJSONStream = require('websocket-json-stream');
var otText = require('ot-text');
var Duplex = require('stream').Duplex;
var inherits = require('util').inherits;


var backend = new ShareDB();
//createDoc(startServer);

var key = fs.readFileSync('../ssl/keys/d9234_a2301_705db40a0ff214b1f5a913edd23c8c4c.key');
var cert = fs.readFileSync('../ssl/certs/doebereiner_org_d9234_a2301_1539084486_812b563ca9aec683338d51ea92786845.crt');

var sslOptions = {
  key: key,
  cert: cert
};


ShareDB.types.map['json0'].registerSubtype(otText.type);

//Create initial document then fire callback
// function createDoc(callback) {
//   var connection = backend.connect();
//   var doc = connection.get('examples', 'textarea');
//   doc.fetch(function(err) {
//     if (err) throw err;
//     if (doc.type === null) {
//       doc.create('', callback);
//       return;
//     }
//     callback();
//   });
// }

function startServer() {
  // Create a web server to serve files and listen to WebSocket connections
    var app = express();
    app.use(forceSsl);
    app.options('*', cors());
    
    //  app.use(express.static('static'));
    var server = https.createServer(sslOptions, app);
//    var server = https.createServer(app);

  // Connect any incoming WebSocket connection to ShareDB
    var wss = new WebSocket.Server({ server: server });
//    var wss = new WebSocket('ws://dev.researchcatalogue.net/share');


    wss.on('connection', function(ws, req) {
    	var stream = new WebSocketJSONStream(ws);
    	backend.listen(stream);
	console.log("connected");
    });

    // wss.on('connection', function connection(ws) {
    // 	ws.on('message', function incoming(message) {
    // 	    console.log('received: %s', message);
    // 	});
	
    // 	ws.send('something');
    // });
    
    server.listen(8999);
    console.log('Listening on 8999');
}

//createDoc(startServer);


var app = express();
app.use(forceSsl);
app.options('*', cors());
var server = https.createServer(sslOptions, app);
server.listen(8999);

var webSocketServer = new WebSocket.Server({ server: server });


webSocketServer.on('connection', function (socket) {
  var stream = new WebsocketJSONOnWriteStream(socket);
  backend.listen(stream);
});

function WebsocketJSONOnWriteStream(socket) {
  Duplex.call(this, {objectMode: true});

  this.socket = socket;
  var stream = this;

  socket.on('message', function(data) {
    stream.push(data);
  });

  socket.on("close", function() {
    stream.push(null);
  });

  this.on("error", function(msg) {
    console.warn('WebsocketJSONOnWriteStream error', msg);
    socket.close();
  });

  this.on("end", function() {
    socket.close();
  });
}
inherits(WebsocketJSONOnWriteStream, Duplex);

WebsocketJSONOnWriteStream.prototype._write = function(value, encoding, next) {
  this.socket.send(JSON.stringify(value));
  next();
};

WebsocketJSONOnWriteStream.prototype._read = function() {};
