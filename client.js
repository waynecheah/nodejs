
var net    = require('net');
var crypto = require('crypto');
var colors = require('colors');

var sockets   = [];
var RN        = '\r\n';
var _timer    = null;
var host      = '192.168.1.75';
var port      = 1470;
var serverErr = {
    e1: 'System error',
    e2: 'Error found while query made to database',
    e3: 'Required authorisation data not found',
    e4: 'Unrecognized device, serial not found in database',
    e5: 'Unrecognized alarm status',
    e6: 'Alarm status is not reported',
    e7: 'System status is not completely reported',
    e8: 'Unrecognized zone status',
    e9: 'No any zone received for update'
};


function isc (data, cmd) {
    var length = cmd.length;
    var data   = data.replace(RN, '');
    if (data.substr(0,length) == cmd) {
        return true;
    }
    return false;
} // isc

function issi (data, key) {
    var length = key.length + 1;
    var data   = data.replace(RN, '');
    var pos1   = data.search(key);
    var pos2   = data.search('=');
    var index  = null;

    if (pos1 < 0 || pos2 < 0) {
        return false;
    }

    index = data.substr((pos1+1), (pos2-1));

    return {
        p: (pos2+1),
        i: index
    };
} // issi

function iss (data, key) { // is set
    var length = key.length + 1;
    var data   = data.replace(RN, '');
    if (data.substr(0,length) == key+'=') {
        return length;
    }
    return false;
} // iss

function isg (data, key) { // is get
    var length = key.length + 1;
    var data   = data.replace(RN, '');
    if (data.substr(0,length) == key+'?') {
        return length;
    }
    return false;
} // isg

function gv (data, start) { // get value
    var data = data.replace(RN, '');
    return data.substr(start);
} // gv


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

function datetime () {
    var date = new Date();
    return date.toTimeString();
} // datetime

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


//
// Net Client
//
var socket = net.createConnection(port, host);
var _data  = {
    info: {
        serial: '1234',
        name: 'RaspPi',
        version: '0.1'
    },
    status: {
        alarm_status: 'r',
        power: 1,
        battery: 1,
        pstn: 1,
        comm: 0,
        keypad: 0
    },
    zones: {
        z1: 'o',
        z2: 'c',
        z3: 'b',
        z4: 'd',
        z5: 'c'
    }
};
var _stage = 'authorisation';

log('n', 'i', 'Socket created.');
socket.on('data', function(data) {
    log('n', 'i', 'RESPONSE: '+data);
    if (ps = isg(data, 'id')) {
      log('n', 'i', 'Send serial='+_data.info.serial);
        socket.write('serial='+_data.info.serial+RN);
      log('n', 'i', 'Send name='+_data.info.name);
        socket.write('name='+_data.info.name+RN);
      log('n', 'i', 'Send version='+_data.info.version);
        socket.write('version='+_data.info.name+RN);
      log('n', 'i', 'Send -done-');
        socket.write('-done-'+RN);
    } else if (ps = isg(data, 'alarm_status')) {
      log('n', 'i', 'Send alarm_status='+_data.status.alarm_status);
        socket.write('alarm_status='+_data.status.alarm_status+RN);
    } else if (ps = isg(data, 'system_status')) {
      log('n', 'i', 'Send power='+_data.status.power);
        socket.write('power='+_data.status.power+RN);
      log('n', 'i', 'Send battery='+_data.status.battery);
        socket.write('battery='+_data.status.battery+RN);
      log('n', 'i', 'Send pstn='+_data.status.pstn);
        socket.write('pstn='+_data.status.pstn+RN);
      log('n', 'i', 'Send comm='+_data.status.comm);
        socket.write('comm='+_data.status.comm+RN);
      log('n', 'i', 'Send keypad='+_data.status.keypad);
        socket.write('keypad='+_data.status.keypad+RN);
      log('n', 'i', 'Send -done-');
        socket.write('-done-'+RN);
    } else if (ps = isg(data, 'zones')) {
      log('n', 'i', 'Send zone 1 opened: z1='+_data.zones.z1);
        socket.write('z1='+_data.zones.z1+RN);
      log('n', 'i', 'Send zone 2 closed: z2='+_data.zones.z2);
        socket.write('z2='+_data.zones.z2+RN);
      log('n', 'i', 'Send zone 3 bypassed: z3='+_data.zones.z3);
        socket.write('z3='+_data.zones.z3+RN);
      log('n', 'i', 'Send zone 4 disabled: z4='+_data.zones.z4);
        socket.write('z4='+_data.zones.z4+RN);
      log('n', 'i', 'Send z5='+_data.zones.z5);
        socket.write('z5='+_data.zones.z5+RN);
      log('n', 'i', 'Send -done-');
        socket.write('-done-'+RN);
    } else if (data.substr(0,2) == 'ok') {
        log('n', 's', 'OK received from server');
        if (_stage == 'authorisation') {
          log('n', 'i', 'Gain access to the server');
            _stage = 'alarm_status';
        } else if (_stage == 'alarm_status') {
          log('n', 'i', 'Alarm status reported to server successfully');
            _stage = 'system_status';
        } else if (_stage == 'system_status') {
          log('n', 'i', 'System status reported to server successfully');
            _stage = 'zones';
        } else if (_stage == 'zones') {
          log('n', 'i', 'All zones reported to server successfully');
            _stage = 'ready';
        }
    } else if (data.substr(0,1) == 'e') {
        var no = gv(data, 1);

        if (typeof serverErr['e'+no] == 'undefined') {
            log('n', 'e', data);
        } else {
            log('n', 'e', '[e'+no+'] '+serverErr['e'+no]);
        }
    }
}).on('connect', function() {
    log('n', 'i', 'Socket connected to server successfully!');
    socket.write('say hi'+RN);
    socket.cmd = function(data){
        socket.write(data+RN);
    };
}).on('end', function() {
    log('n', 'i', 'Disconnected from server');
});

exports.socket = socket;