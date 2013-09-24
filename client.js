
var net    = require('net');
var crypto = require('crypto');
var colors = require('colors');

var sockets   = [];
var RN        = '\r\n';
var _timer    = 0;
var host      = 'cheah.homeip.net';
var port      = 1470;
var serverErr = {
    e0: 'Invalid input',
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


function write (msg, l, type) {
    _timer += 500;
    setTimeout(function(){
        if (l) {
            var t = (typeof type == 'undefined') ? 'i' : type;
            log('n', t, l);
        }
        socket.write(msg+RN);
    }, _timer);
} // write

function reset () {
    _timer = 0;
} // reset

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
socket.setEncoding('utf8');

log('n', 'i', 'Socket created.');
socket.on('data', function(data) {
    log('n', 'i', 'SERVER RESPONSE: '+data);
    if (isg(data, 'id')) {
        write('serial='+_data.info.serial, 'Send serial='+_data.info.serial);
        write('name='+_data.info.name, 'Send name='+_data.info.name);
        write('version='+_data.info.name, 'Send version='+_data.info.version);
        write('-done-', 'Send -done-');
    } else if (isg(data, 'alarm_status')) {
        write('alarm_status='+_data.status.alarm_status, 'Send alarm_status='+_data.status.alarm_status);
    } else if (isg(data, 'system_status')) {
        write('power='+_data.status.power, 'Send power='+_data.status.power);
        write('battery='+_data.status.battery, 'Send battery='+_data.status.battery);
        write('pstn='+_data.status.pstn, 'Send pstn='+_data.status.pstn);
        write('comm='+_data.status.comm, 'Send comm='+_data.status.comm);
        write('keypad='+_data.status.keypad, 'Send keypad='+_data.status.keypad);
        write('-done-', 'Send -done-');
    } else if (isg(data, 'zones')) {
        write('z1='+_data.zones.z1, 'Send zone 1 opened: z1='+_data.zones.z1);
        write('z2='+_data.zones.z2, 'Send zone 2 closed: z2='+_data.zones.z2);
        write('z3='+_data.zones.z3, 'Send zone 3 bypassed: z3='+_data.zones.z3);
        write('z4='+_data.zones.z4, 'Send zone 4 disabled: z4='+_data.zones.z4);
        write('z5='+_data.zones.z5, 'Send z5='+_data.zones.z5);
        write('-done-', 'Send -done-');
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
        reset();
    } else if (data.substr(0,1) == 'e') {
        var no = gv(data, 1);

        if (typeof serverErr['e'+no] == 'undefined') {
            log('n', 'e', data);
        } else {
            log('n', 'e', '[e'+no+'] '+serverErr['e'+no]);
        }
        reset();
    }
}).on('connect', function() {
    log('n', 'i', 'Socket connected to server successfully!');
    socket.cmd = function(data){
        socket.write(data+RN);
    };
}).on('end', function() {
    log('n', 'i', 'Disconnected from server');
});

exports.socket = socket;