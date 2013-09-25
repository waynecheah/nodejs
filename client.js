
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
    e9: 'No any zone received for update',
    e10: 'Invalid zone number'
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
var _stage = '';


function write (msg, l, type, stage) {
    _timer += 200;
    setTimeout(function(){
        if (l) {
            var t = (typeof type == 'undefined') ? 'i' : type;
            log('n', t, l);
        }
        if (typeof stage != 'undefined') {
            _stage = stage;
        }
        socket.write(msg+RN);
    }, _timer);
} // write

function resetTime () {
    _timer = 0;
} // resetTime

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

function g1 (k) {
    return _data.info[k];
} // g1

function g2 (k) {
    return _data.status[k];
} // g2

function g3 (k) {
    return _data.zones[k];
} // g3


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
socket.cmd = function(data){
    socket.write(data+RN);
};
socket.get = function(type, key) {
    log('n', 'i', _data[type][key]);
};

log('n', 'i', 'Socket created.');
socket.on('data', function(data) {
    log('s', 'i', 'SERVER RESPONSE: '+data.replace(RN, ''));
    if (isg(data, 'id')) {
        write('serial='+g1('serial'), 'Send serial='+g1('serial'));
        write('name='+g1('name'), 'Send name='+g1('name'));
        write('version='+g1('version'), 'Send version='+g1('version'));
        write('-done-', 'Send -done-', 'i', 'authorisation');
    } else if (isg(data, 'alarm_status')) {
        write('alarm_status='+g2('alarm_status'), 'Send alarm_status='+g2('alarm_status'), 'i', 'alarm_status');
    } else if (isg(data, 'system_status')) {
        write('power='+g2('power'), 'Send power='+g2('power'));
        write('battery='+g2('battery'), 'Send battery='+g2('battery'));
        write('pstn='+g2('pstn'), 'Send pstn='+g2('pstn'));
        write('comm='+g2('comm'), 'Send comm='+g2('comm'));
        write('keypad='+g2('keypad'), 'Send keypad='+g2('keypad'));
        write('-done-', 'Send -done-', 'i', 'system_status');
    } else if (isg(data, 'zones')) {
        write('z1='+g3('z1'), 'Send zone 1 opened: z1='+g3('z1'));
        write('z2='+g3('z2'), 'Send zone 2 closed: z2='+g3('z2'));
        write('z3='+g3('z3'), 'Send zone 3 bypassed: z3='+g3('z3'));
        write('z4='+g3('z4'), 'Send zone 4 disabled: z4='+g3('z4'));
        write('z5='+g3('z5'), 'Send z5='+g3('z5'));
        write('-done-', 'Send -done-', 'i', 'zones');
    } else if (data.substr(0,2) == 'ok') {
        log('n', 's', 'OK received from server');
        if (_stage == 'authorisation') {
            log('n', 'i', 'Gain access to the server');
            resetTime();
            _stage = '';
        } else if (_stage == 'alarm_status') {
            log('n', 'i', 'Alarm status reported to server successfully');
            resetTime();
            _stage = '';
        } else if (_stage == 'system_status') {
            log('n', 'i', 'System status reported to server successfully');
            resetTime();
            _stage = '';
        } else if (_stage == 'zones') {
            log('n', 'i', 'All zones reported to server successfully');
            resetTime();
            _stage = 'ready';
        }
        console.log(' ');
    } else if (data.substr(0,1) == 'e') {
        var no = gv(data, 1);

        if (typeof serverErr['e'+no] == 'undefined') {
            log('s', 'e', data);
        } else {
            log('s', 'e', '[e'+no+'] '+serverErr['e'+no]);
        }
        resetTime();
    }
}).on('connect', function() {
    log('n', 'i', 'Socket connected to server successfully!');
    write('Say hello to server. hihi~!', false);
    console.log(' ');
}).on('end', function() {
    log('n', 'i', 'Disconnected from server');
});

exports.s = socket;