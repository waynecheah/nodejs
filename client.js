
var net          = require('net');
var crypto       = require('crypto');
var colors       = require('colors');
var _            = require('lodash');
var randomString = require('random-string');

var sockets   = [];
var RN        = '\r\n';
var _timer    = 0;
var host      = 'innerzon.com';
var port      = 1470;
var clientErr = {
    e0: 'Invalid input',
    e1: 'Invalid partition status update, improper format sent',
    e2: 'Invalid zone status update, improper format sent',
    e3: 'Invalid light status update, improper format sent',
    e4: 'Invalid emergency status update, improper format sent'
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
var teaKey    = 'MtKKLowsPeak4095';
var aesKey    = 'MtKKLowsPeak4095';
var aesIv     = 'ConnectingPeople';
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
    emergency: {
        type: {
            0: 'N/A',
            1: 'Panic',
            2: 'Medical',
            3: 'Fire',
            4: 'Duress'
        },
        status: {
            0: 'Ready/Restore',
            1: 'Alarm'
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
        sn: '94000015A6198E01',
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
        em: ['1,0,102', '4,0,102'],
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
var _encry = 'tea';


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
            if (_encry == 'aes') {
                var enc = 'ae='+encryption(cmd, aesKey, aesIv, 'hex');
                log('n', 's', 'Encrypted AES data: '+enc);
            } else if (_encry == 'tea') {
                var enc = 'en='+encryptionTea(cmd, teaKey);
                log('n', 's', 'Encrypted Tea data: '+enc);
            }
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

function decryptionTea (cipher, key) {
    var v = strToLong(hexToStr(cipher));
    if(key.length!==4)	//not 4 integer, assume 16bytes string
        var k = strToLong(key.slice(0,16));
    else
        var k=key;
    var n = v.length;

    var z = v[n-1], y=v[0], sum=0, e, DELTA=0x9E3779B9;
    var p, q;
    z=v[n-1];
    q = Math.floor(6+52/n);
    sum = q*DELTA;
    while (sum != 0) {
        e = sum>>>2 & 3;
        for (p=n-1; p>0; p--) {
            z = v[p-1];
            y = v[p] -= (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
        }
        z = v[n-1];
        y = v[0] -= (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
        sum -= DELTA;
    }

    var completeStr = longToStr(v);
    if (completeStr.indexOf('|') !== -1)
        decrData = completeStr.substr(0, completeStr.lastIndexOf('|'));
    else
        decrData = completeStr;

    log('n', 's', 'Decrypted Tea data: from ['+cipher+'] to ['+decrData+']');
    return decrData;
}
function encryptionTea (str, key) {
    str = str + '|';
    var remainder = str.length % 16;

    if (remainder >13) {	// 12chars max (4 for padding) (minimum 3 rand chars)
        str = str + genRandom((16-remainder) + 16);
    } else {
        str = str + genRandom(16-remainder);
    }

    var v = strToLong(str);
    if (key.length!==4)
        var k = strToLong(key.slice(0,16));
    else
        var k=key;

    var n = v.length;
    if (n == 0) {
        return "";
    }
    if (n == 1) {
        v[n++] = 0;
    }
    var z = v[n - 1], y = v[0], sum = 0, e;  // long
    var DELTA = 0x9E3779B9;
    var q = Math.floor((6 + 52 / n));
    while (q-- > 0) {
        sum += DELTA;
        e = sum >>> 2 & 3;
        for (var p = 0; p < n - 1; p++) { // long
            y = v[p + 1];
            z = v[p] += (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
        }
        y = v[0];
        z = v[n - 1] += (z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4) ^ (sum ^ y) + (k[p & 3 ^ e] ^ z);
    }

    data = strToHex(longToStr(v));
    log('n', 'i', 'Encrypt Tea data: from ['+str+'] to ['+data+']');
    return data;
}
function strToLong (str) {
    var ar = new Array();
    var len = Math.ceil(str.length / 4);
    for (var i=0; i<len; i++) {
        ar[i] = str.charCodeAt(i << 2) + (str.charCodeAt((i << 2) + 1) << 8) +
            (str.charCodeAt((i << 2) + 2) << 16) + (str.charCodeAt((i << 2) + 3) << 24);
    }
    return ar;
}
function longToStr (ar) {
    var len = ar.length;
    for (var i=0; i<len; i++) {
        ar[i] = String.fromCharCode(ar[i] & 0xff, ar[i] >>> 8 & 0xff,
                ar[i] >>> 16 & 0xff, ar[i] >>> 24 & 0xff);
    }
    return ar.join('');
}
function strToHex (str) {
    var charHex = new Array('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f');
    var out = "";
    var len = str.length;
    str = new String(str);
    for (var i = 0; i < len; i++) {
        var s = str.charCodeAt(i);
        var h = "" + charHex[s >> 4] + "" + charHex[0xf & s];
        out += "" + h;
    }
    return out;
}
function hexToStr (str) {
    var charHex = new Array('0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f');
    var stringHex = "0123456789abcdef";

    var out = "";
    var len = str.length;
    str = new String(str);
    str = str.toLowerCase();
    if ((len % 2) == 1) {
        str += "0";
    }
    for (var i = 0; i < len; i+=2) {
        var s1 = str.substr(i, 1);
        var s2 = str.substr(i+1, 1);
        var index1 = stringHex.indexOf(s1);
        var index2 = stringHex.indexOf(s2);

        if (index1 == -1 || index2 == -1)
        {
            throw HEX_BROKEN;
        }

        var val = (index1 << 4) | index2;

        out += "" + String.fromCharCode(parseInt(val));
    }
    return out;
}
function genRandom(n) {
    var dict = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`!@#$%^&*()_+-=\\{}[]:<>,.?/\"\'\;";
    var ran='';
    var size = dict.length;
    for (var i=0;i<n;i++) {
        ran = ran + dict.substr(Math.floor(Math.random()*size),1);
    }
    return ran;
}

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
    swrite(dt+RN);
};
socket.get = function(type, item) {
    log('n', 'd', _data[type][item]);
};
socket.aes = function(str){
    var secret = encryption(str, aesKey, aesIv, 'hex');

    if (secret) {
        _stage = 'aes';
        log('n', 's', 'Sent Aes encrypted data: '+secret);
        swrite('ae='+secret+RN);
    }
};
socket.tea = function(str){
    var secret = encryptionTea(str, teaKey);

    if (secret) {
        _stage = 'tea';
        log('n', 's', 'Sent Tea encrypted data: '+secret);
        swrite('en='+secret+RN);
    }
};

log('n', 'i', 'Socket created.');
socket.on('data', function(data) {
    var dt = data.split(RN);
    var info, inf, ps, str;

    _.each(dt, function(data,i){
        if (!data) { // empty data
            return;
        }

        log('s', 'i', 'SERVER RESPONSE: '+data.replace(RN, ''));

        if (ps = iss(data, 'en')) { // Tea encrypted data, need decryption process first
            str  = gv(data, ps);
            data = decryptionTea(str, teaKey);

            if (!data) {
                return;
            }
        } else if (ps = iss(data, 'ae')) { // AES encrypted data, need decryption process first
            str  = gv(data, ps);
            data = decryption(str, aesKey, aesIv, 'hex');

            if (!data) {
                return;
            }
        }

        if (isg(data, 'id')) {
            write('cn='+g1('cn'), 'Send cn='+g1('cn'));
            _sdcmd = 'sn';
        } else if (isg(data, 'sc')) {
            log('n', 'i', 'Check if i alive? hell yes!!!');
            swrite('ok'+RN);
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

                    log('n', 'i', 'Inform server the partition is updated successfully: pt='+ptCmd);
                    write('pt='+ptCmd+RN);

                    _.each(_data.status.em, function(str, i){
                        inf = str.split(',');

                        if (inf[0] == '1' && inf[1] == '1') { // if found Panic activated in alarm status, make it deactivate
                            var emCmd = '1,0,102';
                            log('n', 'i', 'Inform server emergency is deactivate because of partition has Armed : em='+emCmd);
                            _data.status.em[i] = emCmd;
                            write('em='+emCmd+RN);
                        }
                    });
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
        } else if (ps = iss(data, 'em')) {
            str  = gv(data, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid emergency status update, improper format sent');
                swrite('e4'+RN);
                return;
            }

            log('n', 'i', 'Received emergency status update: '+mapping.emergency.type[info[0]]+' = '+mapping.emergency.status[info[1]]);
            swrite('ok'+RN);

            _.each(_data.status.em, function(str, i){
                inf = str.split(',');

                if (inf[0] == info[0]) {
                    var command = [info[0], info[1], '103'];
                    var emCmd   = command.join(',');

                    _data.status.em[i] = emCmd;

                    log('n', 'i', 'Inform server emergency is updated successfully: em='+emCmd);
                    write('em='+emCmd+RN);
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
            _stage = 'ready';
            str    = decryption(data, aesKey, aesIv, 'binary');

            if (str) {
                log('s', 'i', 'Secret came from server: '+str);
            }
        } else if (_stage == 'tea') {
            _stage = 'ready';
            str    = decryptionTea(data, teaKey);

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