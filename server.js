var https = require('https');
var express = require('express');
var ShareDB = require('sharedb');
var WebSocket = require('ws');
var fs = require('fs');
const forceSsl = require('express-force-ssl');
var WebSocketJSONStream = require('websocket-json-stream');

var backend = new ShareDB();
createDoc(startServer);

var key = fs.readFileSync('../ssl/keys/bc985_f04bd_235c244c08260d15d58795838ada361a.key');
var cert = fs.readFileSync('../ssl/certs/sar_announcements_com_bc985_f04bd_1530623335_9f3e7c1f324c2501ea4df74a0f7ac963.crt');

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
    app.use(forceSsl);
    app.options('*', cors());
    
    //  app.use(express.static('static'));
    var server = https.createServer(sslOptions, app);

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
