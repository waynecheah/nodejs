
var coffeeScript = require('coffee-script');
var mongoose     = require('mongoose');
var http         = require('http');
var net          = require('net');
var connect      = require('connect');
var io           = require('socket.io');
var cons         = require('consolidate');
var fs           = require('fs');
var crypto       = require('crypto');
var colors       = require('colors');
var _            = require('lodash');
var moment       = require('moment');
var nodemailer   = require('nodemailer');
var randomString = require('random-string');
var models       = require('./app/models');
var controllers  = require('./app/controllers');
var config       = require('./config/config');
var commonFn     = require('./lib/common');
var log          = require('./lib/log');

var environment = _.isUndefined(process.env.NODE_ENV) ? 'development' : process.env.NODE_ENV;
var sockets     = [];
var websockets  = [];
var RN          = '\r\n';
var _timer      = null;
var host        = '192.168.1.75';


_.each(config, function(v, name){
    this[name] = v;
});
_.each(commonFn, function(fn, name){ // temporary fix
    this[name] = fn;
});

var i, ps;


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
                log('n', 'i', 'All current status have updated successfully');
                socket.data.status = socket.tmp;
                socket.tmp         = {};

                dbUpdateLastSync(socket.data.info.sn);
                dbStatusUpdate(socket, function(){
                    _.each(websockets, function(websocket){
                        emitDeviceInfo(websocket);
                    });
                });
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

            event.create(function(err, data){
                if (err) {
                    log('s', 'e', 'Device event has logged failure');
                    socket.write('e6'+RN);
                    return;
                }
                log('s', 's', 'Device event has logged successfully');
                log('s', 'd', data);
                socket.write('ok'+RN);
                socket.logs.datetime = info[5];
                socket.logs.count   += 1;
            });
        } else if (isc(dt, '-done-')) { // TODO(remove): to be removed since there won't be receive a -done- here
            var prevSync = socket.data.lastSync;
            var lastSync = _.isUndefined(socket.logs.datetime) ? Date.now() : socket.logs.datetime;

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

function getDeviceUpdate (socket, data) {
    var updates = data.split(RN);
    var info, ps, str, success;

    _.each(updates, function(dt,i){
        success = false;

        if (ps = iss(dt, 'si')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 2) {
                log('n', 'e', 'Invalid system info update, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            _.each(socket.data.status.system, function(s, i){
                var inf = s.split(',');
                if (inf[0] == info[0]) {
                    log('s', 's', 'Socket status data "system" has updated to ['+str+']');
                    socket.data.status.system[i] = str;
                }
            });

            success = true;
            emitDeviceUpdate(socket.data.info.sn, 'system', str);
        } else if (ps = iss(dt, 'pt')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid partition update, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            _.each(socket.data.status.partition, function(s, i){
                var inf = s.split(',');
                if (inf[0] == info[0]) {
                    log('s', 's', 'Socket status data "partition" has updated to ['+str+']');
                    socket.data.status.partition[i] = str;
                }
            });

            success = true;
            emitDeviceUpdate(socket.data.info.sn, 'partition', str);
        } else if (ps = iss(dt, 'zn')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid zone update, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            _.each(socket.data.status.zones, function(s, i){
                var inf = s.split(',');
                if (inf[0] == info[0]) {
                    log('s', 's', 'Socket status data "zones" has updated to ['+str+']');
                    socket.data.status.zones[i] = str;
                }
            });

            success = true;
            emitDeviceUpdate(socket.data.info.sn, 'zones', str);
        } else if (ps = iss(dt, 'em')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 3) {
                log('n', 'e', 'Invalid emergency update, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            //TODO(DeviceUpdate): on emergency update
        } else if (ps = iss(dt, 'li')) {
            str  = gv(dt, ps);
            info = str.split(',');

            if (info.length != 5) {
                log('n', 'e', 'Invalid light update, improper format sent');
                socket.write('e5'+RN);
                return;
            }

            _.each(socket.data.status.lights, function(s, i){
                var inf = s.split(',');
                if (inf[0] == info[0]) {
                    log('s', 's', 'Socket status data "lights" has updated to ['+str+']');
                    socket.data.status.lights[i] = str;
                }
            });

            success = true;
            emitDeviceUpdate(socket.data.info.sn, 'lights', str);
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
            return;
        }

        if (success) {
            log('n', 'i', 'Server reply "ok" to device for the status update:- '+dt);
            socket.write('ok'+RN);
            dbStatusUpdate(socket);
        }
    });
} // getDeviceUpdate

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
    var callback = function(sk){
        websocket.emit('DeviceInformation', {
            deviceId: sk.deviceId,
            info: sk.info,
            status: sk.status,
            modified: sk.modified.getTime()
        });
    };

    if (_.isUndefined(sockets[0])) { // device not online
        // Get device's last status update from database
        var cond    = {}; //{ //serial: '1234' }; // TODO(user): get user's device serial number
        var fields  = 'deviceId info status modified';
        var options = { sort: { modified: -1 } };

        var sk = {
            deviceId: null,
            info: null,
            status: {
                system: null
            },
            modified: null
        };

        Status.findOne(cond, fields, options, function(err, doc){
            if (err) {
                log('s', 'e', 'Fail retrieve device last status info');
                callback(sk);
                return;
            } else if (!doc) {
                callback(sk);
                return;
            }

            doc.deviceId = null; // this mean device not online
            callback(doc);
        });
    } else {
        sockets[0].data.modified = new Date();
        callback(sockets[0].data);
    }
} // emitDeviceInfo

function emitDeviceUpdate (serial, type, value) {
    _.each(websockets, function(websocket){
        // TODO(users): filter by users who has rights to get the update
        if (serial) {}

        log('n', 'i', 'Emit device update to APP. Type: '+type+' | Value: '+value);
        websocket.emit('DeviceUpdate', {
            type: type,
            value: value,
            time: (new Date()).getTime()
        });
    });
} // emitDeviceUpdate

function appUpdate (type, data, callback) {
    var cmd, eData;
    var time = (new Date).getTime();

    if (type == 'partition') {
        cmd   = 'pt='+data.no+','+data.cmd+','+data.password;
        eData = {
            datetime: time,
            device: sockets[0].data.deviceId,
            category: type,
            log: cmd,
            number: data.no,
            command: data.cmd,
            value: data.password,
            user: 103,
            succeed: false
        };
    } else if (type == 'zone') {
        cmd   = 'zn='+data.no+','+data.cmd+','+data.ptid;
        eData = {
            datetime: time,
            device: sockets[0].data.deviceId,
            category: type,
            log: cmd,
            number: data.no,
            command: data.cmd,
            partition: data.ptid,
            user: 103,
            succeed: false
        };
    } else if (type == 'device') {
        cmd   = 'dv='+data.no+','+data.cmd+','+data.val;
        eData = {
            datetime: time,
            device: sockets[0].data.deviceId,
            category: type,
            log: cmd,
            number: data.no,
            command: data.cmd,
            user: 103,
            succeed: false
        };

        if (data.val && data.val != '-') {
            eData.value = data.val;
        }
    } else if (type == 'light') {
        cmd   = 'li='+data.no+','+data.cmd+','+data.val;
        eData = {
            datetime: time,
            device: sockets[0].data.deviceId,
            category: type,
            log: cmd,
            number: data.no,
            command: data.cmd,
            user: 103,
            succeed: false
        };

        if (data.val && data.val != '-') {
            eData.value = data.val;
        }
    }

    log('w', 'i', 'App update ['+type+'], command: '+cmd);
    log('w', 'd', data);
    dbAddAppEvent(eData, function(err, doc){
        callback(err, doc);

        if (cmd) {
            _.each(sockets, function(s){
                s.app.lastCommand = type;
                s.app[type]       = {
                    status: 'server sent',
                    eid: doc._id,
                    time: time
                };
                s.write(cmd+RN);
            });
        }
    });
} // appUpdate

function reportedOkay (socket, data) {
    var stt = ['si','pt','zn','em','dv','li','ss'];
    var lgt = ['lsi','lpt','lzn','lem','ldv','lli','lss'];
    var cmd = socket.app.lastCommand;

    if (!cmd) {
        log('n', 'e', 'Receive ok from hardware, but last command is empty');
    } else if (_.isUndefined(socket.app[cmd])) {
        log('n', 'e', 'Receive ok from hardware, but last command ['+cmd+'] not found in list');
    } else {
        log('n', 'i', 'Receive ok from hardware, confirm last command ['+cmd+'] has received by device');
        socket.app[cmd].status = 'device received';
        socket.app.lastCommand = null;
        dbUpdateAppEvent(socket.app[cmd].eid);
    }

    // TODO(code structure): This line is not done in proper, think a better way to do it later
    var info = data.split(RN);

    _.each(info, function(dt){
        if (isc(dt, 'ok')) { // yes , it should has 'ok' at first line
        } else if (lgt.indexOf(dt.substr(0,3)) >= 0) { // receive event logs from device
            // EVENT LOG RECEIVED WILL UPDATE SERVER DATABASE
            getEventLogs(socket, dt);
        } else if (stt.indexOf(dt.substr(0,2)) >= 0) { // receive status update from device
            // SOME STATUS HAS CHANGED ON DEVICE, APP MIGHT NEED TO REFRESH WITH THE UPDATE
            getDeviceUpdate(socket, dt);
        }
    });
} // reportedOkay


function dbUserRegistration (o, callback) {
    var cond = {
        username: o.username
    };
    var fields = 'fullname';

    Client.findOne(cond, fields, function(err, doc){
        if (err) {
            var msg = 'Fail to check username availability';
            log('s', 'e', msg);
            log('s', 'd', err);
            callback(false, msg);
            return;
        } else if (doc) {
            callback(-1);
            return;
        }

        var data = {
            username: o.username,
            password: o.password,
            fullname: o.fullname
        };
        Client.create(data, function(err, doc){
            if (err) {
                var msg = 'Fail to insert user record to database';
                log('s', 'e', msg);
                log('s', 'd', err);
                callback(false, msg);
                return;
            }
            callback(doc);
        });
    });
} // dbUserRegistration

function dbUpdateLastSync (serial, callback) {
    var lastSync = new Date;

    Device.findOneAndUpdate({ serial:serial }, { lastSync:lastSync }, function(err){
        if (err) {
            log('n', 'e', err);
            socket.write('e2'+RN);
            return
        }

        var datetime = lastSync.toLocaleDateString()+' '+lastSync.toLocaleTimeString();
        log('n', 'i', 'Update database of it last sync date & time: '+datetime);

        if (!_.isUndefined(callback) && _.isFunction(callback)) {
            callback();
        }
    });
} // dbUpdateLastSync

function dbStatusUpdate (socket, callback) {
    var cond = {
        deviceId: socket.id,
        serial: socket.data.info.sn
    };
    var update = {
        $set: {
            info: socket.data.info,
            status: socket.data.status,
            modified: Date.now()
        }
    };

    Status.update(cond, update, { upsert:true }, function(err, updated, rawResponse){
        if (err) {
            log('s', 'e', 'Fail update device last status info to DB');
            socket.write('e10'+RN);
            return;
        }

        if (rawResponse.updatedExisting) {
            log('s', 's', 'Device last status info has updated to DB successfully. '+updated+' document inserted');
        } else {
            log('s', 's', 'Device last status info has inserted to DB successfully. '+updated+' document updated');
        }
        log('s', 'd', rawResponse);

        if (!_.isUndefined(callback) && _.isFunction(callback)) {
            callback();
        }
    });
} // dbStatusUpdate

function dbAddAppEvent (data, callback) {
    if (!data) {
        if (!_.isUndefined(callback) && _.isFunction(callback)) {
            callback(null, false);
        }
        return;
    }

    Event.create(data, function(err, doc){
        if (err) {
            log('s', 'e', 'App event has logged failure');
            log('s', 'd', err);
        } else {
            log('s', 's', 'App event has logged successfully');
            log('s', 'd', doc);
        }

        if (!_.isUndefined(callback) && _.isFunction(callback)) {
            callback(err, doc);
        }
    });
} // dbAddAppEvent

function dbUpdateAppEvent (eid) {
    if (_.isUndefined(eid)) {
        return;
    }

    var cond   = { _id: eid };
    var update = {
        $set: { succeed:true }
    };

    Event.findOneAndUpdate(cond, update, function(err, doc){
        if (err) {
            log('s', 'e', err);
            return;
        }
        log('s', 's', 'Update App event delivered and execute at hardware side successfully');
        log('s', 'd', doc);
    });
} // dbUpdateAppEvent



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
var hosts = 'ns1.node-server.com:27101,' +
            'ns1.node-server.com:27102,' +
            'cheah.homeip.net:27201,' +
            'innerzon.dyndns.ws:27301,' +
            'cheah.homeip.net:27401,' +
            'cheah.homeip.net:27501,' +
            'node.homeip.net:27601';
mongoose.connect('mongodb://localhost/mydb');
//mongoose.connect('mongodb://'+hosts+'/mydb?replicaSet=innerzon&w=majority&journal=true', { replset: { rs_name: 'innerzon' } });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    log('s', 'i', 'MongoDB connected! host: '+db.host+', port: '+db.port);
});
var ObjectId = mongoose.Schema.Types.ObjectId;
var Client = mongoose.model('Client');
var Device = mongoose.model('Device');
var Status = mongoose.model('Status');
var Event  = mongoose.model('Event');



//
// Connect middleware
//
var lgr = (environment == 'development') ? 'dev' : function(tokens, req, res){ /* write to logfile */ };
var app = connect()
    .use(connect.favicon())
    .use(connect.logger(lgr))
    .use(connect.static('public'))
    //.use(connect.directory('public'))
    .use(connect.cookieParser())
    .use(connect.session({ secret: 'session secret at here' }))
    .use(connect.query())
    .use(function(req, res){
        if (!_.isUndefined(req.query.code)) {
            console.log('authorize code: ');
            console.log(req.query.code);
        }

        fs.readFile(__dirname + '/public/index.htm', function(err, data){
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
/*var server = net.createServer(function (socket) {
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
        } else if (dt.substr(0,4) == 'aes=') {
            var secret = dt.split(RN);
            var str, serverSecret;
            var words = [
                'do not call me lao ban',
                'you want lor choi only',
                'it is a fair world',
                'we both have pressure',
                'do not touch my shoulder',
                'alex is real lao ban',
                'we are only fake lao ban',
                'who make kee wee kiasu',
                'do you believe in god',
                'innerzon has talents'
            ];
            var i = randomString({ length:1, letters:false });

            _.each(secret, function(s){
                if (s.substr(0,4) == 'aes=') {
                    log('n', 'i', 'Receive AES data: '+s.substr(4));
                    str = decryption(s.substr(4), 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');

                    if (str) {
                        log('n', 'i', 'Secret came from hardware: '+str);

                        _.each(websockets, function(websocket){
                            websocket.emit('AES', str);
                        });
                    }
                }
            });
            socket.write('ok'+RN);

            serverSecret = encryption(words[i], 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');
            if (serverSecret) {
                log('s', 's', 'Sent encrypted data: '+serverSecret);
                socket.write(serverSecret+RN);
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
            getDeviceUpdate(socket, dt);
        } else if (isc(dt, 'ok')) { // device reply receive of previous sent command
            reportedOkay(socket, dt);
        } else { // don't try to make funny thing to server
            var x    = sockets.indexOf(socket);
            var id   = (x < 0) ? null : sockets[x]._handle.fd;
            var name = (id) ? 'Client '+id : 'Unknown client';

            log('n', 'e', name+' just sent an invalid input: '+dt);
            socket.write('e0'+RN);
        }
    });
    socket.on('end', function() {
        log('n', 'i', 'client '+socket.id+' has sent FIN packet to close connection, host acknowledge by send back FIN');
    });
    socket.on('error', function(data) {
        log('n', 'i', 'The connection for client '+socket.id+' has error occur');
        log('n', 'd', data);
    });
    socket.on('close', function(hasErr) {
        var msg = hasErr ? 'Error occur before connection closed' : 'No error was found';
        log('n', 'i', 'client '+socket.id+' has disconnected. '+msg);

        delete socket.data;

        i = sockets.indexOf(socket);
        sockets.splice(i, 1);

        // TODO(system): notify offline status to user who connected to it
        for (var i=0; i<websockets.length; i++) {
            websockets[i].emit('Offline');
        }
    });
});*/
var server = net.createServer(controllers.devices.main);

server.listen(1470, host);
log('s', 'i', 'Net listening to '+host+':1470');



//
// Socket.io
//
io = io.listen(webserver);
io.configure('production', function(){
    io.enable('browser client minification');
    io.enable('browser client etag');
    io.enable('browser client gzip');
    io.set('log level', 1); // 0: error, 1: warn, 2: info, 3: debug

    io.set('transports', [
        'websocket',
        'flashsocket',
        'htmlfile',
        'xhr-polling',
        'jsonp-polling'
    ]);
});
io.configure('development', function(){
    io.set('log level', 2);
    io.set('transports', ['websocket']);
});

log('s', 'i', 'Socket.io listening to '+host+':8080');
io.sockets.on('connection', function(websocket) {
    log('w', 'i', 'web client '+websocket.id+' connected');
    websocket.data = {
        wsid: websocket.id
    };
    websockets.push(websocket); // assign websocket to global variable


    websocket.on('user logged', function(data){ // once user has login to system
        emitDeviceInfo(websocket); // get device information
    });
    websocket.on('disconnect', function () { // disconnect - io predefined status
        var i = websockets.indexOf(websocket);
        log('w', 'i', 'web client '+websocket.id+' has disconnected');
        websockets.splice(i, 1);

        io.sockets.emit('user disconnected');
    });
    websocket.on('app update', function(type, data){
        appUpdate(type, data, function(err, doc){
            // TODO(event): notify app the update is done successfully
        });
    });
    websocket.on('app request', function(req, data){
        if (req.indexOf('/')) {
            var routes = req.split('/');
            var contr  = routes[0];
            var method = 'index';

            if (routes.length > 1) {
                method = routes[1];
            }
            if (contr in controllers && method in controllers[contr]) { // controller and method are found
                var data = {
                  form: data,
                    ws: websocket.data
                };
                controllers[contr][method](data, function(res, sessions){ // call execution
                    log('s', 'i', 'Processed controller ['+contr+'] and method ['+method+'] has completed');
                    websocket.emit('ResponseOnRequest', req, res);

                    if (!_.isUndefined(sessions) && _.isObject(sessions)) {
                        _.assign(websocket.data, sessions);
                    }
                });
            }
        }


        if (req == 'register') {
            log('w', 'i', 'New registration submitted by web cliend '+websocket.id);
            log('w', 'd', data);

            dbUserRegistration(data, function(res, err){
                var status = true;
                var taken  = false;
                var errMsg = '';

                if (!res) {
                    status = false;
                    errMsg = err;
                } else if (res == -1) {
                    status = false;
                    taken  = true;
                }

                websocket.emit('ResponseOnRequest', req, {
                    status: status,
                    usernameTaken: taken,
                    errMessage: errMsg
                });
            });
        } else if (req == 'app signin') {
            log('w', 'i', 'App sign-in by web client '+websocket.id);
            log('w', 'd', data);

            var cond    = { username:data.username };
            var fields  = 'id fullname password';
            var fnLogin = function(status, mesg, field){
                var data = { status:status };

                if (status) {
                    data.info = mesg;
                } else {
                    if (!_.isUndefined(mesg)) {
                        data.message = mesg;
                    }
                    if (!_.isUndefined(field)) {
                        data.field = field;
                    }
                }

                websocket.emit('ResponseOnRequest', req, data);
            };

            Client.findOne(cond, fields, function(err, doc){
                if (err) {
                    var msg = 'Fail to sign-in, please try again';
                    log('s', 'e', msg);
                    log('s', 'd', err);
                    fnLogin(false, msg);
                    return;
                }
                if (!doc || doc.length == 0) {
                    var msg = 'The email you entered does not belong to any account';
                    log('s', 'e', msg);
                    fnLogin(false, msg, 'username');
                    return;
                }
                if (doc.password != data.password) {
                    var msg = 'The password you entered is incorrect. Please try again (make sure your caps lock is off)';
                    log('s', 'e', msg);
                    fnLogin(false, msg, 'password');
                    return;
                }

                var token   = encryption(doc._id.toString(), 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');
                var expire  = moment().add('days', 7);
                var created = moment();
                var update  = {
                    accessToken: {
                        code: token,
                        expire: expire._d,
                        created: created._d
                    },
                    modified: created._d
                };

                Client.findByIdAndUpdate(doc._id, { $set:update }, function(){
                    if (err) {
                        var msg = 'Fail to sign-in, please try again';
                        log('s', 'e', msg);
                        log('s', 'd', err);
                        fnLogin(false, msg);
                        return;
                    }

                    log('s', 's', 'Login successfully and access token create to user '+data.username);
                    log('s', 'd', update.accessToken);

                    websocket.data.info = {
                        id: doc._id,
                        name: doc.fullname,
                        method: 'app',
                        time: datetime()
                    };
                    fnLogin(true, {
                        userId: doc._id,
                        name: doc.fullname,
                        accessToken: token,
                        expiresIn: (86400 * 7)
                    });
                });
            });
        } else if (req == 'fb signin' || req == 'fb renew token') {
            log('w', 'i', 'Sign-in with facebook by web client '+websocket.id);
            log('w', 'd', data);

            var cond    = { username:data.username };
            var options = {
                upsert: true,
                select: 'id'
            };
            var fnLogin = function(status, mesg){
                websocket.emit('ResponseOnRequest', req, {
                    status: status,
                    message: mesg
                });
            };
            var dateObj = moment();

            data.modified = dateObj._d;

            Client.findOneAndUpdate(cond, data, options, function(err, doc){
                if (err) {
                    var msg = 'Fail upsert user sign-in info to database';
                    log('s', 'e', msg);
                    log('s', 'd', err);
                    fnLogin(false, msg);
                    return;
                }

                log('s', 's', 'User sign-in info has save to DB successfully.');

                websocket.data.info = {
                    id: doc._id,
                    name: data.fullname,
                    method: 'facebook',
                    time: datetime()
                };
                fnLogin(true, '');
            });
        } else if (req == 'gl signin' || req == 'gl renew token') {
            log('w', 'i', 'Sign-in with google by web client '+websocket.id);
            log('w', 'd', data);

            var cond    = { username:data.username };
            var options = {
                upsert: true,
                select: 'id'
            };
            var fnLogin = function(status, mesg){
                websocket.emit('ResponseOnRequest', req, {
                    status: status,
                    message: mesg
                });
            };
            var dateObj = moment();

            data.modified = dateObj._d;

            Client.findOneAndUpdate(cond, data, options, function(err, doc){
                if (err) {
                    var msg = 'Fail upsert user sign-in info to database';
                    log('s', 'e', msg);
                    log('s', 'd', err);
                    fnLogin(false, msg);
                    return;
                }

                log('s', 's', 'User sign-in info has save to DB successfully.');

                websocket.data.info = {
                    id: doc._id,
                    name: data.fullname,
                    method: 'google',
                    time: datetime()
                };
                fnLogin(true, '');
            });
        }
    });
});
controllers.clients.testing({ test:'input' }, function(obj){
    log('s', 'd', obj);
});

exports.sockets = sockets;