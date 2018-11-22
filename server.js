const https = require('https');
const express = require('express');
const ShareDB = require('sharedb');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const forceSsl = require('express-force-ssl');
const WebSocketJSONStream = require('websocket-json-stream');
const otText = require('ot-text');
//const richText = require('rich-text');

//var key = fs.readFileSync('../ssl/keys/eb53b_64655_02d72e74c55372ae9aa8e00b3a42f940.key');
//var cert = fs.readFileSync('../ssl/certs/sar_announcements_com_eb53b_64655_1549100876_7746f2c803c3577300d5015ad0e5b6b6.crt');
//var cert = fs.readFileSync('../ssl/certs/sar_announcements_com_afac3_a89dd_1549013806_75a12f038257b79286eb93690db998db.crt');

//
var key = fs.readFileSync('../ssl/keys/afac3_a89dd_f89bb458245e8929e172e39015776f67.key');
var cert = fs.readFileSync('../ssl/certs/sar_announcements_com_afac3_a89dd_1549013806_75a12f038257b79286eb93690db998db.crt');

// LD
//var key = fs.readFileSync('../ssl/keys/d9234_a2301_705db40a0ff214b1f5a913edd23c8c4c.key');
//var cert = fs.readFileSync('../ssl/certs/doebereiner_org_d9234_a2301_1549141622_7f80359ad2e5312ba3aa5fa89f98d74f.crt');

var sslOptions = {
  key: key,
  cert: cert
};


ShareDB.types.map['json0'].registerSubtype(otText.type);

var backend = new ShareDB();


function addExposition(id,markdown) {
    var connection = backend.connect();
    var doc = connection.get('expositions', id);
    doc.fetch(function(err) {
	if (err) throw err;
	if (doc.type === null) {
	    doc.create({content: markdown});
	    return;
	};
	// console.log("create expo");
	// console.log(backend.db.docs);
    });
}


function removeExposition(id,markdown) {
    var connection = backend.connect();
    var doc = connection.get('expositions', id);
    doc.fetch(function(err) {
	if (err) throw err;
	if (doc.type !== null) {
	    doc.destroy();
	    delete backend.db.docs.expositions[id];
	    return;
	};
	// console.log("remove expo");
	// console.log(backend.db.docs);
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
    // console.log("added reader");
    // console.log(openExpositions);
}

// todo: remove reader, delete doc if no readers
function removeReader(id) {
    let currentN = openExpositions[id];
    if (currentN != undefined) {
	openExpositions[id] = currentN - 1;
	if (openExpositions[id] <= 0) {
	    removeExposition(id);
	}
    }
    // console.log("removed reader");
    // console.log(openExpositions);
}


/// heartbeat
function noop() {}

function heartbeat() {
  this.isAlive = true;
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
    

    wss.on('connection', function connection(ws, req) {
	console.log("connection");
	// console.log(req);
	let id = "";
	
    	ws.on('message', function incoming(message) {
	    try {
		let messageObj = JSON.parse(message);
		//console.log(messageObj);
		// create exposition
		if (messageObj.message == "open exposition") {
		    addExposition(messageObj.id, messageObj.markdown);
		    id = messageObj.id;
		    ws.send('exposition created');		    
		    let stream = new WebSocketJSONStream(ws);
     		    backend.listen(stream);
		    addReader(messageObj.id);

		    // heartbeat
		    ws.expositionId = id;
		    ws.isAlive = true;
		    ws.on('pong', heartbeat);
		    
		} // else {
// //		    console.log(message);
// 		    ws.send("Message not understood");
// 		}
	    } catch(err) {
		console.log(err);
	    }
	    
    	});
		
	ws.on('close', function close() {
	    removeReader(id);
	    console.log('disconnected from ' + id);
	});
	
    });

    // heartbeat, see if it is no longer alive 
    const interval = setInterval(function ping() {
	wss.clients.forEach(function each(ws) {
	    if (ws.isAlive === false) {
		console.log(`A client of exposition ${ws.expositionId} has lost connection`);
		//removeReader(ws.expositionId);
		return ws.terminate();
	    }
	    ws.isAlive = false;
	    ws.ping(noop);
	   // ws.send('connected to server');
	});
    }, 30000);
    
    server.listen(8999);
    console.log('Listening on 8999');
}

//setInterval(() => console.log(backend.db.docs), 10000);

startServer();
