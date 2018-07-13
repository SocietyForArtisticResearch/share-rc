//var https = require('https');
var http = require('http');
var express = require('express');
var ShareDB = require('sharedb');
var WebSocket = require('ws');
var cors = require('cors');
var fs = require('fs');
const forceSsl = require('express-force-ssl');
var WebSocketJSONStream = require('websocket-json-stream');

var backend = new ShareDB();
createDoc(startServer);

var key = fs.readFileSync('../ssl/keys/eb53b_64655_02d72e74c55372ae9aa8e00b3a42f940.key');
var cert = fs.readFileSync('../ssl/certs/sar_announcements_com_eb53b_64655_1549100876_7746f2c803c3577300d5015ad0e5b6b6.crt');

var sslOptions = {
  key: key,
  cert: cert
};

// Create initial document then fire callback
function createDoc(callback) {
  var connection = backend.connect();
  var doc = connection.get('examples', 'textarea');
  doc.fetch(function(err) {
    if (err) throw err;
    if (doc.type === null) {
      doc.create('', callback);
      return;
    }
    callback();
  });
}

function startServer() {
  // Create a web server to serve files and listen to WebSocket connections
    var app = express();
//    app.use(forceSsl);
  //  app.options('*', cors());
    
    //  app.use(express.static('static'));
//    var server = https.createServer(sslOptions, app);
    var server = http.createServer(sslOptions, app);

  // Connect any incoming WebSocket connection to ShareDB
    var wss = new WebSocket.Server({ server: server });
//    var wss = new WebSocket('ws://dev.researchcatalogue.net/share');


    wss.on('connection', function(ws, req) {
	var stream = new WebSocketJSONStream(ws);
	backend.listen(stream);
    });


    // wss.on('open', function open() {
    // 	wss.send('something');
    // });
    
    // wss.on('message', function incoming(data) {
    // 	console.log(data);
    // });

    server.listen(8080);
    console.log('Listening on http://localhost:8080');
}
