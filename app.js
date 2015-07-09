'use strict';

/*
 * Initialize the endpoint.
 */
var endpoint = require('./endpoint')(),
	parser = require('./parser/meitrack-parser');;

/*
 * Listen for the ready event.
 */
endpoint.on('ready', function (options) {
	var _             = require('lodash'),
		host          = require('ip').address(),
		StringDecoder = require('string_decoder').StringDecoder,
		decoder       = new StringDecoder('utf8'),
		serverAddress = host + '' + options.port,
		server = require('./server')(options.port, host);

	server.on('ready', function () {
		console.log('UDP Server now listening on '.concat(host).concat(':').concat(options.port));
		endpoint.sendListeningState();
	});

	server.on('data', function (clientAddress, rawData) {
		var data = decoder.write(rawData);
		var parsedData = parser.parse(data);

		if (!parsedData.msg){
			server.send(clientAddress, parsedData[0].ack, false, function (error) {
				if (error) {
					console.log('Message Sending Error', error);
					endpoint.sendError(error);
				}
				else
					endpoint.sendLog('Message Sent', message.message);
			});
		}

		endpoint.sendData(serverAddress, clientAddress, parsedData);
		endpoint.sendLog('Raw Data Received', data);
	});

	server.on('error', function (error) {
		console.error('Server Error', error);
		endpoint.sendError(error);
	});

	server.on('close', function () {
		endpoint.sendClose();
	});

	server.listen();

	/*
	 * Listen for the message event. Send these messages/commands to devices to this server.
	 */
	endpoint.on('message', function (message) {
		if (message.server === serverAddress && _.contains(_.keys(server.getClients()), message.client)) {
			server.send(message.client, message.message, false, function (error) {
				if (error) {
					console.log('Message Sending Error', error);
					endpoint.sendError(error);
				}
				else
					endpoint.sendLog('Message Sent', message.message);
			});
		}
		else if (message.client === '*') {
			server.getClients().forEach(function (client) {
				server.send(client, message.message, false, function (error) {
					if (error) {
						console.log('Message Sending Error', error);
						endpoint.sendError(error);
					}
					else
						endpoint.sendLog('Message Sent', message.message);
				});
			});
		}
	});
});