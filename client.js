
var net          = require('net');
var crypto       = require('crypto');
var colors       = require('colors');
var _            = require('lodash');
var randomString = require('random-string');

var sockets   = [];
var RN        = '\r\n';
var _timer    = 0;
var host      = 'cheah.homeip.net';
var port      = 1470;
var clientErr = {
    e0: 'Invalid input',
    e1: 'Invalid partition status update, improper format sent',
    e2: 'Invalid zone status update, improper format sent',
    e3: 'Invalid light status update, improper format sent'
};
var serverErr = {
    e0: 'Invalid input',
    e1: 'System error',
    e2: 'Error found while query made to database',
    e3: 'Required authorisation data not found',
    e4: 'Unrecognized device, serial not found in database',
    e5: 'Invalid event log, improper format sent',
    e6: 'Save event log into database failure',
    e7: 'Reported system info found incomplete',
    e8: 'No any partition status reported',
    e9: 'No any zone status reported',
    e10: '',
    e11: '',
    e12: '',
    e13: ''
};
var aesKey    = 'MtKKLowsPeak4095';
var aesIv    = 'ConnectingPeople';
var mapping   = {
    partition: {
        command: {
            0: 'Disarm',
            1: 'Away',
            2: 'Home',
            3: 'Night'
        }
    },
    zone: {
        command: {
            0: 'Disable',
            1: 'Bypass'
        }
    },
    light: {
        command: {
            0: 'Off',
            1: 'On',
            2: 'Dim',
            3: 'Toggle',
            4: 'Pulse',
            5: 'Blink',
            6: 'Delay'
        }
    },
    label: {
        item: {
            zn: 'Zone',
            dv: 'Device',
            li: 'Light',
            ss: 'Sensor',
            us: 'User'
        }
    }
};
var _data  = {
    info: {
        cn: 'apple1',
        sn: '1234',
        pn: 'RaspPi',
        vs: '0.2',
        done: null
    },
    status: {
        si: [
            '0,0', '1,0', '2,0', '3,0', '4,0', '5,0', '6,2', '7,2'
        ],
        pt: [
            '1,0,101', '2,0,101'
        ],
        zn: [
            '1,0,0,1,0', '2,1,0,1,1', '3,2,0,1,0', '4,1,2,1,0', '5,2,0,1,0', '6,2,0,2,0'
        ],
        em: ['0,0,1'],
        dv: [],
        li: [
            '1,1,0,0,101', '2,1,1,255,101', '3,2,2,63,101'
        ],
        ss: [],
        lb: [],
        done: null
    }
};
var _stage = 'authorisation';
var _sdcmd = '';
var _cmdcn = 0;


function write (cmd, lg, type, stage, encrypt) {
    setTimeout(function(){
        _timer += 5;

        if (lg) {
            var t = _.isUndefined(type) ? 'i' : type;
            log('n', t, lg);
        }
        if (!_.isUndefined(stage)) { // change stage
            _stage = stage;
        }
        if (encrypt === null || encrypt !== false) {
            var enc = 'en='+encryption(cmd, aesKey, aesIv, 'hex');
            log('n', 's', 'Encrypted data: '+enc);
            socket.write(enc+RN);
        } else {
            socket.write(cmd+RN);
        }

    }, _timer);
} // write

function swrite (cmd, lg, type, stage) {
    write(cmd, lg, type, stage, false);
} // swrite

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

function g1 (cmd) {
    return _data.info[cmd];
} // g1

function g2 (cmd, i) {
    return _data.status[cmd][i];
} // g2


function encryption (data, key, iv, format) {
    var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    var strlen = data.length;
    var bytes  = ' > 48 bytes';
    var random;

    if (strlen <= 11) { // use 16 bytes
        random = 15 - strlen;
        bytes  = '16 bytes';
    } else if (strlen <= 27) { // use 32 bytes
        random = 31 - strlen;
        bytes  = '32 bytes';
    } else if (strlen <= 43) { // use 48 bytes
        random = 47 - strlen;
        bytes  = '48 bytes';
    } else {
        return false;
    }

    random = randomString({ length:random });
    data   = random+'|'+data;
    log('n', 'i', 'Encrypt data ('+bytes+'): '+data);

    cipher.setAutoPadding(false);
    return cipher.update(data, 'utf8', format);
} // encryption

function decryption (data, key, iv, format) {
    var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    var decrData, position;

    decipher.setAutoPadding(false);
    decrData = decipher.update(data, format, 'utf8');
    position = decrData.indexOf('|'); // get separator position

    if (position < 0) { // invalid data, there should have a | within decrypted data
        log('n', 'e', 'Invalid decrypted data: '+decrData);
        return false;
    }
    log('n', 's', 'Decrypted data: '+decrData);

    return decrData.substr(position+1);
} // decryption

function lightUpdate () {

} // lightUpdate

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
// Net Client
//
var socket = net.createConnection(port, host);
socket.setEncoding('utf8');
socket.cmd = function(dt){
    socket.swrite(dt+RN);
};
socket.get = function(type, item) {
    log('n', 'd', _data[type][item]);
};
socket.aes = function(str){
    var secret = encryption(str, 'MtKKLowsPeak4095', 'ConnectingPeople', 'binary');

    if (secret) {
        _stage = 'aes';
        log('n', 's', 'Sent encrypted data: '+secret);
        socket.swrite('aes='+secret+RN);
    }
}

log('n', 'i', 'Socket created.');
socket.on('data', function(data) {
    var dt = data.split(RN);
    var info, ps, str;

    _.each(dt, function(data,i){
        if (!data) { // empty data
            return;
        }

        log('s', 'i', 'SERVER RESPONSE: '+data.replace(RN, ''));

        if (isg(data, 'id')) {
            write('cn='+g1('cn'), 'Send cn='+g1('cn'));
            _sdcmd = 'sn';
        } else if (isg(data, 'sr')) {
            log('n', 'i', 'Gain access to the server');
            write('si='+g2('si', 0), 'Send si='+g2('si', 0));
            _sdcmd = 'si';
            _cmdcn = 1;
        } else if (ps = iss(data, 'pt')) {
            str  = gv(data, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid partition status update, improper format sent');
                swrite('e1'+RN);
                return;
            }

            log('n', 'i', 'Received partition status update: Partition '+info[0]+' = '+mapping.partition.command[info[1]]+' password('+info[2]+')');
            swrite('ok'+RN);

            _.each(_data.status.pt, function(str, i){
                inf = str.split(',');

                if (inf[0] == info[0]) {
                    var command = [info[0], info[1], '103'];
                    var ptCmd   = command.join(',');

                    _data.status.pt[i] = ptCmd;

                    log('n', 'i', 'Inform server the partition is updated successfully: zn='+ptCmd);
                    write('pt='+ptCmd+RN);
                }
            });
        } else if (ps = iss(data, 'zn')) {
            str  = gv(data, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid zone status update, improper format sent');
                swrite('e2'+RN);
                return;
            }

            log('n', 'i', 'Received zone status update: Zone '+info[0]+' = '+mapping.zone.command[info[1]]+' Partition('+info[2]+')');
            swrite('ok'+RN);

            _.each(_data.status.zn, function(str, i){
                inf = str.split(',');

                if (inf[0] == info[0]) {
                    var status  = (info[1] == '1') ? '2' : inf[2];
                    var command = [info[0], inf[1], status, info[2], '103'];
                    var znCmd   = command.join(',');

                    _data.status.zn[i] = znCmd;

                    log('n', 'i', 'Inform server the zone is updated successfully: zn='+znCmd);
                    write('zn='+znCmd+RN);
                }
            });
        } else if (ps = iss(data, 'li')) {
            str  = gv(data, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid light status update, improper format sent');
                swrite('e3'+RN);
                return;
            }

            log('n', 'i', 'Received light status update: Light '+info[0]+' = '+mapping.light.command[info[1]]+' value('+info[2]+')');
            swrite('ok'+RN);

            _.each(_data.status.li, function(str, i){
                inf = str.split(',');

                if (inf[0] == info[0]) {
                    var command = [info[0], inf[1], info[1], info[2], '103'];
                    var liCmd   = command.join(',');

                    _data.status.li[i] = liCmd;

                    log('n', 'i', 'Inform server the light is updated successfully: li='+liCmd);
                    write('li='+liCmd+RN);
                }
            });
        } else if (isc(data, 'ok')) {
            log('n', 's', 'OK received from server');

            if (_stage == 'authorisation') {
                var f = false;

                _.each(_data.info, function(v,c){
                    if (!f && c == 'done') { // end of this stage
                        swrite('-done-', 'Send -done-', 'i', 'status_report');
                    } else if (c == _sdcmd) {
                        write(_sdcmd+'='+g1(_sdcmd), 'Send '+_sdcmd+'='+g1(_sdcmd));
                        f = true;
                    }
                });

                var ks = _.keys(_data.info);
                var i  = ks.indexOf(_sdcmd);
                _sdcmd = ks[i+1];
            } else if (_stage == 'status_report') {
                var f1 = false;
                var f2 = false;
                var sk = false; // skip next command

                _.each(_data.status, function(a,c){
                    if (!f1 && c == 'done') { // end of this stage
                        swrite('-done-', 'Send -done-', 'i', 'ready');

                        console.log(' ');
                        log('n', 'i', 'All current status have reported to server successfully');
                    } else if (c == _sdcmd) {
                        if (!f2) {
                            if (_data.status[_sdcmd].length == 0) {
                                console.log(' ');
                                log('n', 'i', 'Skip empty data for command: '+_sdcmd);
                                sk = true;
                            } else {
                                sk = false;
                            }

                            if (_data.status[_sdcmd].length == 0 || _.isUndefined(_data.status[_sdcmd][_cmdcn])) {
                                var ks = _.keys(_data.status);
                                var i  = ks.indexOf(_sdcmd);
                                _sdcmd = ks[i+1];
                                _cmdcn = 0;
                            } else {
                                write(_sdcmd+'='+g2(_sdcmd, _cmdcn), 'Send '+_sdcmd+'='+g2(_sdcmd, _cmdcn));
                                _cmdcn++;
                                f2 = true;
                            }
                        }

                        f1 = (sk) ? false : true;
                    }
                });
            } else if (_stage == 'ready') {
            }
            console.log(' ');
        } else if (data.substr(0,1) == 'e') { // error received from server
            var no = gv(data, 1);

            if (typeof serverErr['e'+no] == 'undefined') {
                log('s', 'e', data);
            } else {
                log('s', 'e', '[e'+no+'] '+serverErr['e'+no]);
            }
            resetTime();
        } else if (_stage == 'aes') {
            _stage = 'ready'
            str    = decryption(data, 'MtKKLowsPeak4095', 'ConnectingPeople', 'binary');

            if (str) {
                log('s', 'i', 'Secret came from server: '+str);
            }
        }
    });
}).on('connect', function() {
    log('n', 'i', 'Socket connected to server successfully!');
    swrite('Say hello to server. hihi~!', false);
    console.log(' ');
}).on('end', function() {
    log('n', 'i', 'Disconnected from server');
});

exports.s = socket;