
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
var clientErr  = {};
var serverErr  = {
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
            6: 'GSM',
            7: 'Comm Fail'
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
        },
        type: {
            0: 'N/A',
            1: 'Delay',
            2: 'Instant',
            3: 'Follower',
            4: '24hr',
            5: 'Delay2',
            6: 'Keyswitch'
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
        },
        user: {
            101: 'Keyfob',
            102: 'Auto',
            103: 'Remote'
        }
    },
    sensor: {
        type: {
            0: 'Disable',
            1: 'Normal Open',
            2: 'Normal Close',
            3: 'Potential'
        },
        status: {
            0: 'N/A',
            1: 'Open',
            2: 'Close'
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
                        emergency: [],
                        devices: [],
                        lights: [],
                        sensors: [],
                        labels: []
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

            if (info.length != 2) {
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

            if (info.length != 5) {
                log('n', 'e', 'Invalid zone status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            var sts = getMap('zone', info[1], info[2], info[4]);
            log('n', 'i', 'Received zone status update: Partition '+info[3]+' Zone '+info[0]+' = '+sts);
            socket.tmp.zones.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'em')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid emergency status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received emergency status update: '+getMap('emergency', info[0], info[1], info[2]));
            socket.tmp.emergency.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'dv')) { // device status
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid device status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received device status update: Device '+info[0]+' = '+getMap('light', info[1], info[2], info[3], info[4]));
            socket.tmp.devices.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'li')) { // lights status
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid light status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received light status update: Light '+info[0]+' = '+getMap('light', info[1], info[2], info[3], info[4]));
            socket.tmp.lights.push(str);
            socket.write('ok'+RN);
        }  else if (ps = iss(dt, 'ss')) { // sensor status
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 4) {
                log('n', 'e', 'Invalid sensor status, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received sensor status update: Sensor '+info[0]+' = '+getMap('sensor', info[1], info[2], info[3]));
            socket.tmp.sensors.push(str);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'lb')) { // label listing
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid label list, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            log('n', 'i', 'Received label update: '+getMap('label', info[0])+' '+info[1]+' = '+info[2]);
            socket.tmp.labels.push(str);
            socket.write('ok'+RN);
        } else if (isc(dt, '-done-')) {
            var t = socket.tmp;

            if (t.system.length < 5) {
                log('n', 'w', 'Reported system status found incomplete');
                socket.write('e7'+RN);
            } else if (t.partition.length == 0) {
                log('n', 'w', 'No any partition status reported');
                socket.write('e8'+RN);
            } else if (t.zones.length == 0) {
                log('n', 'w', 'No any zone status reported');
                socket.write('e9'+RN);
            } else {
                var lastSync = datetime();

                Device.findOneAndUpdate({ serial:socket.data.info.sn }, { lastSync:lastSync }, function(err){
                    if (err) {
                        log('n', 'e', err);
                        socket.write('e2'+RN);
                        return
                    }
                    log('n', 'i', 'Update database of it last sync date & time: '+lastSync);

                    _.each(websockets, function(websocket){
                        emitDeviceInfo(websocket);
                    });
                });

                log('n', 'i', 'All current status have updated successfully');
                socket.data.status = socket.tmp;
                socket.tmp         = {};
            }
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getCurrentStatus

function getEventLogs (socket, data) {
    var logs = data.split(RN);
    var cond, info, event, ps, str;

    _.each(logs, function(dt,i){
        if (ps = iss(dt, 'lsi')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 4) {
                log('n', 'e', 'Invalid system info event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            cond  = {
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'system'
            };
            event = {
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'system',
                log: dt,
                status: info[1],
                type: info[0],
                user: info[2]
            };

            Event.findOneAndUpdate(cond, event, { upsert:true }, function(err, data){
                if (err) {
                    log('s', 'e', 'System Info event has logged failure');
                    socket.write('e6'+RN);
                    return
                }
                log('s', 's', 'System Info event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.logs.datetime = info[3];
                socket.logs.count   += 1;
            });
        } else if (ps = iss(dt, 'lpt')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 4) {
                log('n', 'e', 'Invalid partition event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            cond  = {
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'partition'
            };
            event = {
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'partition',
                log: dt,
                number: info[0],
                status: info[1],
                user: info[2]
            };

            Event.findOneAndUpdate(cond, event, { upsert:true }, function(err, data){
                if (err) {
                    log('s', 'e', 'Partition event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Partition event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.logs.datetime = info[3];
                socket.logs.count   += 1;
            });
        } else if (ps = iss(dt, 'lzn')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 6) {
                log('n', 'e', 'Invalid zone event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            cond  = {
                datetime: info[5],
                device: socket.data.deviceId,
                category: 'zone'
            };
            event = {
                datetime: info[5],
                device: socket.data.deviceId,
                category: 'zone',
                log: dt,
                number: info[0],
                condition: info[1],
                status: info[2],
                partition: info[3],
                type: info[4]
            };

            Event.findOneAndUpdate(cond, event, { upsert:true }, function(err, data){
                if (err) {
                    log('s', 'e', 'Zone event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Zone event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.logs.datetime = info[5];
                socket.logs.count   += 1;
            });
        } else if (ps = iss(dt, 'lem')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 4) {
                log('n', 'e', 'Invalid emergency event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            cond  = {
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'emergency'
            };
            event = {
                datetime: info[3],
                device: socket.data.deviceId,
                category: 'emergency',
                log: dt,
                status: info[1],
                type: info[0],
                user: info[2]
            };

            Event.findOneAndUpdate(cond, event, { upsert:true }, function(err, data){
                if (err) {
                    log('s', 'e', 'Emergency event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Emergency event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.logs.datetime = info[3];
                socket.logs.count   += 1;
            });
        } else if (ps = iss(dt, 'ldv')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 6) {
                log('n', 'e', 'Invalid device event log, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            cond  = {
                datetime: info[5],
                device: socket.data.deviceId,
                category: 'device'
            };
            event = new Event({
                datetime: info[5],
                device: socket.data.deviceId,
                category: 'device',
                log: dt,
                number: info[0],
                status: info[2],
                value: info[3],
                type: info[1],
                user: info[4]
            });

            event.save(function(err, data){
                if (err) {
                    log('s', 'e', 'Device event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Device event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.logs.datetime = info[3];
                socket.logs.count   += 1;
            });
        } else if (isc(dt, '-done-')) { // TODO(remove): to be removed since there won't be receive a -done- here
            var prevSync = socket.data.lastSync;
            var lastSync = _.isUndefined(socket.logs.datetime) ? datetime() : socket.logs.datetime;

            Device.findOneAndUpdate({ serial:socket.data.info.sn }, { lastSync:lastSync }, function(err){
                if (err) {
                    log('n', 'e', err);
                    socket.write('e2'+RN);
                    return
                }

                log('n', 'i', 'There are '+socket.logs.count+' event updated since '+prevSync);
                socket.data.lastSync = socket.logs.datetime;
                socket.logs          = {
                    count: 0,
                    lastSync: lastSync
                };
            });
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getEventLogs

function getMap (category, m1, m2, m3, m4) {
    if (category == 'system') {
        return mapping.system.type[m1]+' = '+mapping.system.status[m2];
    } else if (category == 'partition') {
        var usr;

        if (_.isUndefined(mapping.partition.user[m2])) {
            usr = m2;
        } else {
            usr = mapping.partition.user[m2];
        }

        return mapping.partition.status[m1]+' by user ['+usr+']';
    } else if (category == 'zone') {
        return 'Condition:'+mapping.zone.condition[m1]+' | Status:'+mapping.zone.status[m2]+' | Type:'+mapping.zone.type[m3];
    } else if (category == 'emergency') {
        return 'Type:'+mapping.emergency.type[m1]+' | Status:'+mapping.emergency.status[m2]+' | User:'+m3;
    } else if (category == 'light') {
        var val = m3 ? ' ('+m3+')' : '';
        var usr;

        if (_.isUndefined(mapping.light.user[m4])) {
            usr = m4;
        } else {
            usr = mapping.light.user[m4];
        }

        return 'Type:'+mapping.light.type[m1]+' | Status:'+mapping.light.status[m2]+val+' | User:'+usr;
    } else if (category == 'sensor') {
        var val = m3 ? ' ('+m3+')' : '';
        return mapping.sensor.type[m1]+val+' | Status:'+mapping.sensor.status[m2];
    } else if (category == 'label') {
        return mapping.label.item[m1];
    }
} // getMap


function emitDeviceInfo (websocket) {
    var sk;

    if (_.isUndefined(sockets[0])) { // device not online
        // TODO(mongodb): Get device's last status update from database
        sk = {
            deviceId: null,
            info: null,
            status: {
                system: null
            }
        };
    } else {
        sk = sockets[0].data;
    }

    websocket.emit('DeviceInformation', {
        deviceId: sk.deviceId,
        info: sk.info,
        status: sk.status
    });
} // emitDeviceInfo

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

function appUpdate (type, data) {
    var cmd;

    if (type == 'light') {
        cmd = 'li='+data.no+','+data.cmd+','+data.val;

        _.each(sockets, function(s){
            s.app.lastCommand = 'light';
            s.app.light       = 'server sent';
            s.write(cmd+RN);
        });
    }

    log('w', 'i', 'App update ['+type+'], command: '+cmd);
    log('w', 'd', data);
} // appUpdate

function reportedOkay (socket) {
    var cmd = socket.app.lastCommand;

    if (!cmd) {
        log('n', 'e', 'Last command is empty');
    } else if (_.isUndefined(socket.app[cmd])) {
        log('n', 'e', 'Last command ['+cmd+'] not found');
    } else {
        log('n', 'i', 'Last command ['+cmd+'] has received by device');
        socket.app[cmd]        = 'device received';
        socket.app.lastCommand = null;
    }
} // reportedOkay



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
    value: Number,
    partition: Number,
    type: Number,
    user: String
});



//
// Connect middleware
//
var app = connect()
    .use(connect.favicon())
    .use(connect.logger('dev'))
    .use(connect.static('public', { index:'index.htm' }))
    .use(connect.directory('public'))
    .use(connect.cookieParser())
    .use(connect.session({ secret: 'session secret at here' }))
    .use(function(req, res){
        fs.readFile(__dirname + '/index.htm', function(err, data){
            if (err) {
                res.writeHead(500, { 'Content-Type':'text/plain' });
                return res.end('Error');
            }
            res.writeHead(200, { 'Content-Type':'text/html' });
            res.end(data);
        });
    });

//
// Web Server
//
var webserver = http.createServer(app);
webserver.listen(8080, host);
log('s', 'i', 'Webserver running at http://'+host+':8080');



//
// Net Server
//
var server = net.createServer(function (socket) {
    socket.id   = socket._handle.fd;
    socket.app  = {};
    socket.data = {};
    socket.logs = {
        count: 0
    };

    log('n', 'i', 'Client '+socket.id+' connected');
    sockets.push(socket); // assign socket to global variable
    socket.setKeepAlive(true, 90000);
    socket.write('id?'+RN);

    socket.on('data', function(data) { // send from client
        var dt  = data.toString();
        var stt = ['si','pt','zn','em','dv','li','ss'];
        var lgt = ['lsi','lpt','lzn','lem','ldv','lli','lss'];
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
            // PROCESS OF ALL STATUS UPDATE
            getCurrentStatus(socket, dt);
        } else if (lgt.indexOf(dt.substr(0,3)) >= 0) { // receive event logs from device
            // EVENT LOG RECEIVED WILL UPDATE SERVER DATABASE
            getEventLogs(socket, dt);
        } else if (stt.indexOf(dt.substr(0,2)) >= 0) { // receive status update from device
            // SOME STATUS HAS CHANGED ON DEVICE, APP MIGHT NEED TO REFRESH WITH THE UPDATE
            socket.write('ok'+RN);
        } else if (isc(dt, 'ok')) { // device reply receive of previous sent command
            reportedOkay(socket);
        } else { // don't try to make funny thing to server
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

        // TODO(system): notify offline status to user who connected to it
        for (var i=0; i<websockets.length; i++) {
            websockets[i].emit('Offline');
        }
    });
});

server.listen(1470, host);
log('s', 'i', 'Net listening to '+host+':1470');



//
// Socket.io
//
io = io.listen(webserver);
log('s', 'i', 'Socket.io listening to '+host+':8080');
io.sockets.on('connection', function(websocket) {
    log('w', 'i', 'web client '+websocket.id+' connected');
    websockets.push(websocket); // assign websocket to global variable

    emitDeviceInfo(websocket); // get device information

    websocket.on('app update', function(type, data){
        appUpdate(type, data);
    });
});


exports.sockets = sockets;