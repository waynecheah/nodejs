
var mongoose   = require('mongoose');
var http       = require('http');
var net        = require('net');
var connect    = require('connect');
var io         = require('socket.io');
var fs         = require('fs');
var crypto     = require('crypto');
var colors     = require('colors');
var _          = require('lodash');
var moment     = require('moment');
var nodemailer = require('nodemailer');

var sockets    = [];
var websockets = [];
var RN         = '\r\n';
var _timer     = null;
var host       = '192.168.1.75';
var tmpSystem  = {};
var tmpZones   = {};
var clientErr  = {};
var serverErr  = {
    e0: 'Invalid input',
    e1: 'System error',
    e2: 'Error found while query made to database',
    e3: 'Required authorisation data not found',
    e4: 'Unrecognized device, serial not found in database',
    e5: 'Invalid event log, improper format sent',
    e6: 'Save event log into database failure',
    e7: 'Reported system status found incomplete',
    e8: 'No any zone status reported',
    e9: '',
    e10: '',
    e11: '',
    e12: '',
    e13: ''
};
var webErr     = {};
var mapping = {
    system: {
        type: {
            0: 'N/A',
            1: 'AC',
            2: 'Battery',
            3: 'PSTN',
            4: 'Bell',
            5: 'Peripheral',
            6: 'GSM'
        },
        status: {
            0: 'Ready/Restore',
            1: 'Alarm',
            2: 'Fault'
        }
    },
    partition: {
        status: {
            0: 'Disarmed',
            1: 'Away',
            2: 'Home',
            3: 'Night'
        },
        user: {
            100: 'User1',
            101: 'Keyfob',
            102: 'Auto', // timer
            103: 'Remote'
        }
    },
    zone: {
        condition: {
            0: 'Disable',
            1: 'Open',
            2: 'Close'
        },
        status: {
            0: 'Ready/Restore',
            1: 'Alarm',
            2: 'Bypass',
            3: 'Trouble',
            4: 'Tamper'
        }
    },
    light: {
        type: {
            0: 'Disable',
            1: 'Normal',
            2: 'Dim',
            3: 'Toggle',
            4: 'Pulse',
            5: 'Blink',
            6: 'Delay'
        },
        status: {
            0: 'Off',
            1: 'On',
            2: 'Dim'
        }
    }
};
var i, ps;


function isc (data, cmd) {
    var length = cmd.length;
    var data   = data.replace(RN, '');
    if (data.substr(0,length) == cmd) {
        return true;
    }
    return false;
} // isc

function issi (data, key) {
    var data = data.replace(RN, '');
    var pos1 = data.search(key);
    var pos2 = data.search('=');

    if (pos1 < 0 || pos2 < 0) {
        return false;
    }

    var index = data.substr((pos1+1), (pos2-1));

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

function gv (data, start) { // get value
    var data = data.replace(RN, '');
    return data.substr(start);
} // gv

function datetime () {
    return moment().format('YYMMDDHHmmss');
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


function getDeviceInfo (socket, data) {
    var info = data.split(RN);
    var ps;

    _.each(info, function(dt,i){
        if (ps = iss(dt, 'cn')) {
            socket.tmp.cn = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'sn')) {
            log('n', 'i', 'Received serial: '+gv(dt, ps));
            socket.tmp.sn = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'pn')) {
            log('n', 'i', 'Received name: '+gv(dt, ps));
            socket.tmp.pn = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'vs')) {
            log('n', 'i', 'Received version: '+gv(dt, ps));
            socket.tmp.vs = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (isc(dt, '-done-')) {
            var t = socket.tmp;

            if (_.isUndefined(t.cn) || _.isUndefined(t.sn) || _.isUndefined(t.pn) || _.isUndefined(t.vs)) {
                log('n', 'w', 'Device has not submitted all required authorisation data');
                socket.write('e3'+RN);
                return;
            }

            Device.findOne({ serial:t.sn }, 'id macAdd lastSync', function(err, data){
                if (err) {
                    log('n', 'e', err);
                    log('n', 'd', t);
                    socket.write('e2'+RN);
                } else if (!data || _.isUndefined(data.id)) { // unrecognized serial
                    log('n', 'w', 'Device ID ['+socket.id+'] made an invalid access. Unrecognized serial '+t.sn);
                    log('n', 'd', t);
                    socket.write('e4'+RN);
                } else {
                    var lastSync = _.isUndefined(data.lastSync) ? '' : data.lastSync;

                    log('n', 'i', 'Device ID ['+socket.id+'] has logged successfully');
                    log('n', 'd', t);
                    log('n', 'd', data);
                    socket.data = {
                        deviceId: data.id,
                        info: t,
                        lastSync: lastSync
                    };
                    socket.tmp  = { // prepare variable for current status update
                        system: [],
                        partition: [],
                        zones: [],
                        lights: [],
                        devices: [],
                        sensors: [],
                        emergency: []
                    };
                    socket.write('sr?'+RN); // ask device's status report
                }
            });
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getDeviceInfo

function getCurrentStatus (socket, data) {
    var sts = data.split(RN);
    var info, ps, str;

    _.each(sts, function(dt,i){
        if (ps = iss(dt, 'si')) { // system info
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid system info, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received system info update: '+getMap('system', info[0], info[1]));
            socket.tmp.system.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'pt')) { // zones status
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid partition status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received partition status update: Partition '+info[0]+' = '+getMap('partition', info[1], info[2]));
            socket.tmp.partition.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'zn')) { // zones status
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid zone status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received zone status update: Zone '+info[0]+' = '+getMap('zone', info[1], info[2]));
            socket.tmp.zones.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'li')) { // lights status
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 4) {
                log('n', 'e', 'Invalid light status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received light status update: Light '+info[0]+' = '+getMap('light', info[1], info[2], info[3]));
            socket.tmp.lights.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'dv')) {
            str  = gv(dt, ps);
            info = str.split(',');

            socket.tmp.devices.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'ss')) {
            str  = gv(dt, ps);
            info = str.split(',');

            socket.tmp.sensors.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'em')) {
            str  = gv(dt, ps);
            info = str.split(',');

            socket.tmp.emergency.push(str);
            socket.write('ok'+RN);
        } else if (isc(dt, '-done-')) {
            var t = socket.tmp;

            if (t.system.length < 5) {
                log('n', 'w', 'Reported system status found incomplete');
                socket.write('e7'+RN);
            } else if (t.zones.length == 0) {
                log('n', 'w', 'No any zone status reported');
                socket.write('e8'+RN);
            } else {
                log('n', 'i', 'All status have updated successfully');
                socket.write('el?'+RN);
            }
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getCurrentStatus

function getEventLogs (socket, data) {
    var logs = data.split(RN);
    var info, event, ps, str;

    _.each(logs, function(dt,i){
        if (ps = iss(dt, 'lzn')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 6) {
                log('n', 'e', 'Invalid zone event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            event = new Event({
                datetime: info[5],
                device: socket.data.deviceId,
                category: 'zone',
                log: dt,
                number: info[0],
                condition: info[1],
                status: info[2],
                partition: info[3],
                type: info[4]
            });

            event.save(function(err, data){
                if (err) {
                    log('s', 'e', 'Zone event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Zone event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.tmp.datetime = info[5];
                socket.tmp.count   += 1;
            });
        } else if (ps = iss(dt, 'lpt')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid partition event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            event = new Event({
                datetime: info[4],
                device: socket.data.deviceId,
                category: 'partition',
                log: dt,
                number: info[0],
                status: info[1],
                user: info[2],
                password: info[3]
            });

            event.save(function(err, data){
                if (err) {
                    log('s', 'e', 'Partition event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Partition event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.tmp.datetime = info[4];
                socket.tmp.count   += 1;
            });
        } else if (ps = iss(dt, 'lem')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 4) {
                log('n', 'e', 'Invalid emergency event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            event = new Event({
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'emergency',
                log: dt,
                status: info[1],
                type: info[0],
                user: info[2]
            });

            event.save(function(err, data){
                if (err) {
                    log('s', 'e', 'Emergency event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Emergency event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.tmp.datetime = info[3];
                socket.tmp.count   += 1;
            });
        } else if (ps = iss(dt, 'lsi')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid system info event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            event = new Event({
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'system',
                log: dt,
                status: info[1],
                type: info[0],
                user: info[2]
            });

            event.save(function(err, data){
                if (err) {
                    log('s', 'e', 'System Info event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'System Info event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.tmp.datetime = info[3];
                socket.tmp.count   += 1;
            });
        } else if (isc(dt, '-done-')) {
            var prevSync = socket.data.lastSync;
            var lastSync = _.isUndefined(socket.tmp.datetime) ? '131013115632' : socket.tmp.datetime;

            Device.findOneAndUpdate({ serial:socket.data.info.sn }, { lastSync:lastSync }, function(err){
                if (err) {
                    log('n', 'e', err);
                    socket.write('e2'+RN);
                    return
                }

                log('n', 'i', 'There are '+socket.tmp.count+' event updated since '+prevSync);
                socket.data.lastSync = socket.tmp.datetime;
                socket.tmp           = {
                    count: 0,
                    lastSync: lastSync
                };
                socket.write('ok'+RN);
            });
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getEventLogs

function getMap (category, m1, m2, m3) {
    if (category == 'system') {
        return mapping.system.type[m1]+' = '+mapping.system.status[m2];
    } else if (category == 'partition') {
        return mapping.partition.status[m1]+' by user ['+mapping.partition.user[m2]+']';
    } else if (category == 'zone') {
        return mapping.zone.condition[m1]+', '+mapping.zone.status[m2];
    } else if (category == 'light') {
        var val = m3 ? ' ('+m3+')' : '';
        return mapping.light.type[m1];+', '+mapping.light.status[m2]+val
    }
} // getMap


function statusUpdate (data) {
    if (typeof data == 'object') {
        for (var i=0; i<websockets.length; i++) {
            websockets[i].emit('InitialUpdates', data);
        }
    }
} // statusUpdate

function deviceUpdate (id, type, value, socketInfo) {
    for (var i=0; i<websockets.length; i++) {
        websockets[i].emit('DeviceUpdate', {
            id: id,
            type: type,
            value: value
        });
    }

    if (typeof socketInfo != 'undefined' && typeof socketInfo.sn != 'undefined') {
        fnDeviceLog(type, socketInfo.sn, id, value);
    }
} // deviceUpdate



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
// Mongoose
//
mongoose.connect('mongodb://localhost/mydb');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    log('s', 'i', 'MongoDB connected! host: '+db.host+', port: '+db.port);
});
var ObjectId = mongoose.Schema.Types.ObjectId;
var Device = mongoose.model('Device', {
    name: String,
    macAdd: String,
    serial: { type:String, index:true },
    lastSync: Number,
    created: { type:Date, default:Date.now },
    modified: { type:Date, default:Date.now }
});
var Event = mongoose.model('Event', {
    datetime: String,
    device: String,
    category: String,
    log: String,
    number: Number,
    condition: Number,
    status: Number,
    partition: Number,
    type: Number,
    user: String,
    password: String
});



//
// Net Server
//
var server = net.createServer(function (socket) {
    socket.id   = socket._handle.fd;
    socket.data = {};
    socket.tmp  = {};

    log('n', 'i', 'Client '+socket.id+' connected');
    sockets.push(socket); // assign socket to global variable
    socket.setKeepAlive(true, 90000);
    socket.write('id?'+RN);

    socket.on('data', function(data) { // send from client
        var dt  = data.toString();
        var obj = {};

        if (isc(dt, 'quit')) { // device is asking self termination
            socket.write('See ya ;)'+RN);

            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    sockets[i].end();
                }
            }
        } else if (dt.substr(0,7) == '-hello-') { // device is checking if server alive and responding
            log('n', 'i', socket.id+' says hello');
            socket.write('ok'+RN);
        } else if (_.isUndefined(socket.tmp) && !iss(dt, 'sn')) {
            log('n', 'i', 'Probably this is welcome message sent from device when initial connect');
            log('n', 'd', dt);
            socket.tmp = {
                welcome: dt.replace(RN, '')
            };
        } else if (_.isUndefined(socket.data.info)) { // when device has not logged, all data sent will go here
            // PROCESS OF AUTHORISATION
            getDeviceInfo(socket, dt);
        } else if (_.isUndefined(socket.data.status)) { // get all current status from device
            getCurrentStatus(socket, dt);
        } else if (_.isUndefined(socket.data.lastSync)) { // get event logs from device since last disconnected
            getEventLogs(socket, dt);
        } else {
            var x    = sockets.indexOf(socket);
            var id   = (x < 0) ? null : sockets[x]._handle.fd;
            var name = (id) ? 'Client '+id : 'Unknown client';

            log('n', 'e', name+' just sent an invalid input: '+dt);
            socket.write('e0'+RN);
        }
    });
    socket.on('end', function() {
        i = sockets.indexOf(socket);
        log('n', 'i', 'client '+socket.id+' disconnected');

        delete socket.data;

        sockets.splice(i, 1);

        /*/ TODO(system): notify offline status to user who connected to it
        for (var i=0; i<websockets.length; i++) {
            websockets[i].emit('Offline');
        }*/
    });
});

server.listen(1470, host);
log('s', 'i', 'Net listening to '+host+':1470');