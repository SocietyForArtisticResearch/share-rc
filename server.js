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
var richText = require('rich-text');
//var Duplex = require('stream').Duplex;
//var inherits = require('util').inherits;


var key = fs.readFileSync('../ssl/keys/d9234_a2301_705db40a0ff214b1f5a913edd23c8c4c.key');
var cert = fs.readFileSync('../ssl/certs/doebereiner_org_d9234_a2301_1539084486_812b563ca9aec683338d51ea92786845.crt');

var sslOptions = {
  key: key,
  cert: cert
};


ShareDB.types.map['json0'].registerSubtype(otText.type);

//ShareDB.types.register(richText.type);
var backend = new ShareDB();
//createDoc(startServer);




// Create initial document then fire callback
// function createDoc(callback) {
//     var connection = backend.connect();
//     var doc = connection.get('examples', 'richtext');
//     doc.fetch(function(err) {
// 	if (err) throw err;
// 	if (doc.type === null) {
// 	    doc.create({content: 'Type something ...'}, callback);
// 	    return;
// 	}
// 	callback();
//     });
// }


function addExposition(id,markdown) {
    var connection = backend.connect();
    var doc = connection.get('expositions', id);
    doc.fetch(function(err) {
	if (err) throw err;
	if (doc.type === null) {
	    doc.create({content: markdown});
	    return;
	}
    });
}

var openExpositions = {};

function addReader(id) {
    let currentN = openExpositions[id];
    if (currentN == undefined) {
	openExpositions[id] = 1;
    } else {
	openExpositions[id] = currentN + 1;
    }
}


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

//    console.log(backend.db.docs);

    // wss.on('connection', function(ws, req) {
    // 	var stream = new WebSocketJSONStream(ws);
    // 	backend.listen(stream);
    // 	console.log("connected");
    // });
    

    wss.on('connection', function connection(ws, req) {
	console.log("connection");
	// console.log(req);
    	ws.on('message', function incoming(message) {
	    let messageObj = JSON.parse(message);
	    // create exposition
	    console.log(messageObj.message);
	    console.log(messageObj.message == "open exposition");
	    if (messageObj.message == "open exposition") {
		addExposition(messageObj.id, messageObj.markdown);
		ws.send('exposition created');
		    
		let stream = new WebSocketJSONStream(ws);
     		backend.listen(stream);
		addReader(messageObj.id);
	    }
    	});
		
	ws.on('close', function close() {
	    // remove reader
	    console.log('disconnected');
	});
	
    });
    
    server.listen(8999);
    console.log('Listening on 8999');
}

startServer();
