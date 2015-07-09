'use strict';

var dgram        = require('dgram'),
	inherits     = require('util').inherits,
	EventEmitter = require('events').EventEmitter,
	_            = require('lodash');

function Server(port, host, socketType) {
	if (!(this instanceof Server)) {
		return new Server(port, host, socketType);
	}

	EventEmitter.call(this);
	Server.init.call(this, port, host, socketType);
}

inherits(Server, EventEmitter);

Server.init = function (port, host, socketType) {
	var self = this;

	this._clients = {};
	self._port = port || 4500;
	self._host = host || 'localhost';
	self._socketType = socketType || 'udp4';

	self._server = dgram.createSocket(self._socketType);

	function handler(message, requestInfo) {
		var client = requestInfo.address + ':' + requestInfo.port;
		self._clients[client] = {
			host: requestInfo.address,
			port: requestInfo.port
		};

		self.emit('data', client, message.toString().replace(/\n$/, ''));
	}

	function listening() {
		self.emit('ready');
	}

	function close() {
		self.emit('close');
	}

	function error(err) {
		self.emit('error', err);
	}

	process.nextTick(function register() {
		self._server.on('listening', listening);
		self._server.on('message', handler);
		self._server.on('close', close);
		self._server.on('error', error);
	}, this);
};

Server.prototype.send = function (client, message, callback) {
	callback = callback || function () {
		};

	if (!Buffer.isBuffer(message)) {
		message = new Buffer(message.toString() + '\n');
	}

	if (_.contains(_.keys(this._clients), client)) {
		var clientObj = this._clients[client];

		this._server.send(message, 0, message.length, clientObj.port, clientObj.host, callback);
	} else {
		callback();
	}
};

Server.prototype.getClients = function () {
	return _.keys(this._clients);
};

Server.prototype.close = function () {
	this._server.close();
	return 1;
};

Server.prototype.listen = function (callback) {
	if (!callback)
		callback = function () {
		};

	this._server.bind(this._port, this._host, callback);
};

module.exports = Server;
