
var net    = require('net');
var crypto = require('crypto');
var colors = require('colors');
var _      = require('lodash');

var sockets    = [];
var RN         = '\r\n';
var host       = '192.168.1.75';

function hex2a (hex) {
    var str = '';
    for (var i=0; i<hex.length; i+=2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
} // hex2a

function encryption (data, key, iv, format) {
    var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

    cipher.setAutoPadding(false);
    return cipher.update(data, 'utf8', format);
} // encryption

function decryption (data, key, iv, format) {
    var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);

    decipher.setAutoPadding(false);
    return decipher.update(data, format, 'utf8');
} // decryption

function log (env, type, mesg) {
    if (env == 'n') {
        env = 'NET';
    } else if (env == 'w') {
        env = 'WEB';
    } else {
        env = 'SERVER';
    }

    if (type == 's') {
        type = colors.green('success:');
    } else if (type == 'i') {
        type = colors.cyan('info:');
    } else if (type == 'w') {
        type = colors.yellow('warning:');
    } else if (type == 'e') {
        type = colors.red('error:');
    } else if (type == 'd') {
        type = colors.grey('debug:');
    }

    if (typeof mesg == 'object') {
        mesg = colors.italic(colors.grey(JSON.stringify(mesg)));
    }

    console.log('  '+'['+colors.bold(colors.white(env))+'] '+colors.bold(type)+' '+mesg);
} // log


_.each(process.argv, function(v, i){
    if (i < 2) {
        return;
    }
    if (v == 'l') { // running at localhost
        host = '127.0.0.1';
    } else if (ps = iss(v, 'n')) { // running on local network
        var sn = gv(v, ps);
        host   = '192.168.1.'+sn;
    }
});


//
// Net Server
//
var server = net.createServer(function (socket) {
    socket.id = socket._handle.fd;

    log('n', 'i', 'Client '+socket.id+' connected');
    sockets.push(socket); // assign socket to global variable
    socket.setKeepAlive(true, 90000);
    socket.write('USE enc= | dec='+RN);

    socket.on('connect', function(){
        socket.write('Welcome! And you name is?');
    });
    socket.on('data', function(data) { // send from client
        var mesg = data.toString().replace(RN, '');

        if (mesg == 'quit') {
            socket.write('\r\nSee ya ;)\r\n');

            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    sockets[i].end();
                }
            }
        } else if (mesg.substr(0,4) == 'enc=') {
            var encrypted = encryption(mesg.substr(4), 'MtKKLowsPeak4095', 'ConnectingPeople', 'binary');
            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    socket.write(encrypted+RN);
                    //socket.write('Encrypted: ['+encrypted+']'+RN);
                }
            }
            log('n', 's', 'Encrypted: ['+encrypted+']');
        } else if (mesg.substr(0,4) == 'dec=') {
            log('n', 'i', '['+mesg.substr(4)+']');
            var decrypted = decryption(mesg.substr(4), 'MtKKLowsPeak4095', 'ConnectingPeople', 'binary');
            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    socket.write(decrypted+RN)
                    //socket.write('Decrypted: ['+decrypted+']'+RN);
                }
            }
            log('n', 's', 'Decrypted: ['+decrypted+']');
        } else {
            log('n', 'e', 'Input receive: ['+mesg+']');
        }
    });
    socket.on('close', function() {
        var i = sockets.indexOf(socket);
        log('n', 'i', 'client '+socket.id+' disconnected');

        delete socket.info;
        delete socket.status;
        delete socket.zones;

        sockets.splice(i, 1);
    });
});

server.listen(1472, host);
log('s', 'i', 'Net listening to '+host+':1472');

