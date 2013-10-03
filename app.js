
var mongoose   = require('mongoose');
var http       = require('http');
var net        = require('net');
var connect    = require('connect');
var io         = require('socket.io');
var fs         = require('fs');
var crypto     = require('crypto');
var colors     = require('colors');
var _          = require('lodash');
var nodemailer = require('nodemailer');

var sockets    = [];
var websockets = [];
var RN         = '\r\n';
var _timer     = null;
var host       = '192.168.1.75';
var tmpInfo    = {};
var tmpSystem  = {};
var tmpZones   = {};
var clientErr  = {};
var serverErr  = {
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
var webErr     = {};

/*var config  = {
 mail: require('./config/mail')
 };*/
var smtpTransport = nodemailer.createTransport('SMTP', {
    service: 'KokWeng.net',
    auth: {
        user: 'nodejs@kokweng.net',
        pass: 'jumpknee123'
    }
});
var mailOptions = {
    from: "Nodejs Rock ✔ <nodejs@kokweng.net>", // sender address
    to: "cheah_88@hotmail.com", // list of receivers
    subject: "Say Hello ✔", // Subject line
    text: "Hello world ✔", // plaintext body
    html: "<b>Hello world ✔</b>" // html body
}

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

function getDeviceInfo (socket, data) {
    var info = data.split(RN);
    var ps;

    _.each(info, function(dt,i){
        if (ps = iss(dt, 'serial')) {
            log('n', 'i', 'Received serial: '+gv(dt, ps));
            tmpInfo.serial = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'name')) {
            log('n', 'i', 'Received name: '+gv(dt, ps));
            tmpInfo.name = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'version')) {
            log('n', 'i', 'Received version: '+gv(dt, ps));
            tmpInfo.version = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (isc(dt, '-done-')) {
            var t = tmpInfo;

            if (typeof t.serial == 'undefined' || typeof t.name == 'undefined' || typeof t.version == 'undefined') {
                log('n', 'w', 'Device has not submitted all required authorisation data');
                socket.write('e3'+RN);
                return;
            }

            Device.findOne({ serial:t.serial }, 'id owner clientId', function(err, data){
                if (err) {
                    log('n', 'e', err);
                    log('n', 'd', tmpInfo);
                    socket.write('e2'+RN);
                } else if (!data || typeof data.id == 'undefined') { // unrecognized serial
                    log('n', 'w', 'Device ID ['+socket.id+'] made an invalid access. Unrecognized serial '+t.serial);
                    log('n', 'd', tmpInfo);
                    socket.write('e4'+RN);
                } else {
                    log('n', 'i', 'Device ID ['+socket.id+'] has logged successfully');
                    log('n', 'd', tmpInfo);
                    log('n', 'd', data);
                    socket.clientId = data.clientId;
                    socket.info     = tmpInfo;
                    tmpInfo         = {};
                    socket.write('alarm_status?'+RN);
                }
            });
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getDeviceInfo

function getSystemStatus (socket, data) {
    var system = data.split(RN);
    var ps;

    _.each(system, function(dt,i){
        if (ps = iss(dt, 'alarm_status')) {
            var allSts = ['a', 'h', 'r', 'p'];
            var status = gv(dt, ps);

            if (allSts.indexOf(status) < 0) {
                log('n', 'e', 'Unrecognized alarm status: '+status);
                socket.write('e5'+RN);
            } else {
                log('n', 'i', 'Received alarm status: '+status);
                tmpSystem.alarm_status = status;
                socket.write('ok'+RN);
                setTimeout(function(){
                    socket.write('system_status?'+RN);
                }, 50);
            }
        } else if (ps = iss(dt, 'power')) {
            log('n', 'i', 'Received system power status: '+gv(dt, ps));
            tmpSystem.power = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'battery')) {
            log('n', 'i', 'Received system battery status: '+gv(dt, ps));
            tmpSystem.battery = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'pstn')) {
            log('n', 'i', 'Received system pstn status: '+gv(dt, ps));
            tmpSystem.pstn = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'comm')) {
            log('n', 'i', 'Received system communication status: '+gv(dt, ps));
            tmpSystem.comm = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (ps = iss(dt, 'keypad')) {
            log('n', 'i', 'Received system keypad status: '+gv(dt, ps));
            tmpSystem.keypad = gv(dt, ps);
            socket.write('ok'+RN);
        } else if (isc(dt, '-done-')) {
            var t = tmpSystem;
            if (typeof t.alarm_status == 'undefined') {
                log('n', 'w', 'Device has not submitted alarm status');
                socket.write('e6'+RN);
            } else if (typeof t.power == 'undefined' || typeof t.battery == 'undefined' || typeof t.pstn == 'undefined' ||
                typeof t.comm == 'undefined' || typeof t.keypad == 'undefined') {
                log('n', 'e', 'Device has not submitted all system status it should have');
                socket.write('e7'+RN);
            } else {
                log('n', 'i', 'Device id ['+socket.id+'] has completely updated its current alarm & system status');
                log('n', 'd', tmpSystem);
                socket.status = tmpSystem;
                tmpSystem     = {};
                socket.write('zones?'+RN);

                Device.findOneAndUpdate({ serial:socket.info.serial }, { status:socket.status });
            }
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getSystemStatus

function getZones (socket, data) {
    var allSts = ['o', 'c', 'b', 'd'];
    var zones  = data.split(RN);
    var obj, sts;

    _.each(zones, function(dt,i){
        if (obj = issi(dt, 'z')) {
            sts = gv(dt, obj.p);
            if (allSts.indexOf(sts) < 0) {
                log('n', 'e', 'Unrecognized zone status: '+sts);
                socket.write('e8'+RN);
            } else {
                log('n', 'i', 'Received Zone '+obj.i+' status: '+sts);
                tmpZones['z'+obj.i] = sts;
                socket.write('ok'+RN);
            }
        } else if (isc(dt, '-done-')) {
            if (_.size(tmpZones) == 0) {
                log('n', 'e', 'No any zone received for update');
                socket.write('e9'+RN);
            } else {
                log('n', 'i', _.size(tmpZones)+' zones have updated of its status');
                log('n', 'd', tmpZones);
                socket.zones = tmpZones;
                tmpZones     = {};

                statusUpdate({
                    info: socket.info,
                    status: socket.status,
                    zones: socket.zones
                });
            }
        } else if (dt) {
            log('n', 'e', 'Invalid input: '+dt.replace(RN,''));
            socket.write('e0'+RN);
        }
    });
} // getZones

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

    if (typeof socketInfo != 'undefined' && typeof socketInfo.serial != 'undefined') {
        fnDeviceLog(type, socketInfo.serial, id, value);
    }
} // deviceUpdate



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

function authorised (socket) {
    if (typeof socket.logged == 'undefined' || !socket.logged) {
        log('n', 'w', 'Device is not logged yet');
        socket.write('e1\r\n');
        return false;
    }
    return true;
} // authorised

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
// Mongoose
//
mongoose.connect('mongodb://localhost/mydb');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function(){
    log('s', 'i', 'MongoDB connected! host: '+db.host+', port: '+db.port);
});
var ObjectId = mongoose.Schema.Types.ObjectId;
var Client = mongoose.model('Client', {
    username: String,
    password: String,
    fullname: String,
    created: { type:Date, default:Date.now },
    modified: { type:Date, default:Date.now }
});
var Device = mongoose.model('Device', {
    name: String,
    macAdd: String,
    serial: { type:String, index:true},
    owner: { type:String, index:true},
    clientId: { type:ObjectId, index:true },
    attrs: {
        gpi: Boolean,
        gpo: Boolean,
        var: String,
        sta: Boolean
    },
    status: {
        alarm_status: String,
        power: String,
        battery: String,
        pstn: String,
        comm: String,
        keypad: String
    },
    zones: [{ id:Number, name:String, status:String }],
    created: { type:Date, default:Date.now },
    modified: { type:Date, default:Date.now }
});
var Log = mongoose.model('Log', {
    date: String,
    time: String,
    type: String,
    user: String,
    device: String,
    query: String,
    key: String,
    value: String
});
var fnDeviceLog = function(type, serial, key, val) {
    var date = new Date();
    var logs = new Log({
        date: date.toDateString(),
        time: date.toTimeString(),
        type: type,
        device: serial,
        key: key,
        value: val
    });
    logs.save(function(err) {
        if (err) {
            log('s', 'e', 'Event has logged failure');
            return;
        }
        log('s', 's', 'Event has logged successfully');
        log('s', 'd', logs);
    });
};
var fnUserLog = function(type, client, key, val) {
    var date = new Date();
    var logs = new Log({
        date: date.toDateString(),
        time: date.toTimeString(),
        type: type,
        user: client,
        key: key,
        value: val
    });
    logs.save(function(err, data) {
        if (err) {
            log('s', 'e', 'Event has logged failure');
            return;
        }
        log('s', 's', 'Event has logged successfully');
        log('s', 'd', data);
    });
};


//
// Connect middleware
//
var app = connect()
    .use(connect.favicon())
    .use(connect.logger('dev'))
    .use(connect.static('public'))
    .use(connect.directory('public'))
    .use(connect.cookieParser())
    .use(connect.session({ secret: 'session secret at here' }))
    .use(function(req, res){
        fs.readFile(__dirname + '/index.html', function(err, data){
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
    socket.id = socket._handle.fd;

    log('n', 'i', 'Client '+socket.id+' connected');
    sockets.push(socket); // assign socket to global variable
    socket.setKeepAlive(true, 90000);
    socket.write('id?'+RN);

    socket.on('connect', function(){
        socket.write('Welcome! And you name is?');
    });
    socket.on('data', function(data) { // send from client
        var mesg = data.toString().replace(RN, '');
        var body = ['BGPI','BGPO','BVAR','BSTA'];
        var dt   = data.toString();
        var ps   = 0;
        var obj  = {};

        if (mesg == 'quit') {
            socket.write('\r\nSee ya ;)\r\n');

            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    sockets[i].end();
                }
            }
        } else if (mesg.substr(0,7) == '-hello-') { // for device checking server alive and response
            socket.write('ok'+RN);
        } else if (typeof socket.tmp == 'undefined' && !iss(dt, 'serial')) {
            log('n', 'i', 'Probably this is welcome message sent from device when initial connect');
            log('n', 'd', dt);
            socket.tmp = {
                welcome: dt.replace(RN, '')
            };
        } else if (typeof socket.info == 'undefined') { // when device has not logged, all data sent will go here
// AUTHORISATION
            getDeviceInfo(socket, dt);
        } else if (typeof socket.status == 'undefined') {
// GET DEVICE CURRENT STATUS
            getSystemStatus(socket, dt);
        } else if (typeof socket.zones == 'undefined') {
// GET DEVICE ZONES INFORMATION
            getZones(socket, dt);
        } else if (typeof socket.zones != 'undefined') { // continue listening to device
// READY MODE, ANY EVENT TRIGGER GOES HERE
            var allsts = ['o', 'c', 'b', 'd'];
            var sts;

            if (ps = iss(dt, 'alarm_status')) {
                log('n', 'i', 'Alarm status changed: '+gv(dt, ps));
                socket.status.alarm_status = gv(dt, ps);
                socket.write('ok'+RN);
                deviceUpdate('alarm_status', 'status', gv(dt, ps), socket.info);
            } else if (ps = iss(dt, 'power')) {
                log('n', 'i', 'System power changed: '+gv(dt, ps));
                socket.status.power = gv(dt, ps);
                socket.write('ok'+RN);
                deviceUpdate('power', 'status', gv(dt, ps), socket.info);
            } else if (ps = iss(dt, 'battery')) {
                log('n', 'i', 'System battery changed: '+gv(dt, ps));
                socket.status.battery = gv(dt, ps);
                socket.write('ok'+RN);
                deviceUpdate('battery', 'status', gv(dt, ps), socket.info);
            } else if (ps = iss(dt, 'pstn')) {
                log('n', 'i', 'System pstn changed: '+gv(dt, ps));
                socket.status.pstn = gv(dt, ps);
                socket.write('ok'+RN);
                deviceUpdate('pstn', 'status', gv(dt, ps), socket.info);
            } else if (ps = iss(dt, 'comm')) {
                log('n', 'i', 'System comm changed: '+gv(dt, ps));
                socket.status.comm = gv(dt, ps);
                socket.write('ok'+RN);
                deviceUpdate('comm', 'status', gv(dt, ps), socket.info);
            } else if (ps = iss(dt, 'keypad')) {
                log('n', 'i', 'System keypad changed: '+gv(dt, ps));
                socket.status.keypad = gv(dt, ps);
                socket.write('ok'+RN);
                deviceUpdate('keypad', 'status', gv(dt, ps), socket.info);
            } else if (obj = issi(dt, 'z')) {
                sts = gv(dt, obj.p);
                if (allsts.indexOf(sts) < 0) {
                    log('n', 'e', 'Unrecognized zone status: '+sts);
                    socket.write('e8'+RN);
                } else if (typeof socket.zones['z'+obj.i] == 'undefined') {
                    log('n', 'e', 'Invalid zone: z'+obj.i);
                    socket.write('e10'+RN);
                } else {
                    log('n', 'i', 'Zone '+obj.i+' status changed: '+sts);
                    socket.zones['z'+obj.i] = sts;
                    socket.write('ok'+RN);
                    deviceUpdate('z'+obj.i, 'zone', sts, socket.info);
                }
            }
        } else if (mesg.substr(0,5) == 'HEAD=' || mesg.substr(0,3) == 'HID') {
// SET HEAD
            if (mesg == 'HEAD=1') { // device initialed login request
                log('n', 'i', 'Device ID ['+socket.id+'] initial HEAD=1');
                socket.head = true;
                socket.hid  = { h1:'', h2:'', h3:'', h4:'' };
            } else if (mesg.substr(0,3) == 'HID') { // device is sending required login information
                var no  = mesg.substr(3,1);
                var val = mesg.substr(5);

                if (typeof socket.head == 'undefined' || !socket.head) {
                    log('n', 'e', 'HEAD has not initialized');
                    socket.write('e1\r\n');
                    return;
                }
                if (!no) {
                    log('n', 'e', 'HID attribute received without any index number');
                    socket.write('e1\r\n');
                    return;
                }

                if (typeof socket.hid['h'+no] == 'undefined') {
                    log('n', 'e', 'Undefined variable for HEAD request: HID'+no);
                    socket.write('e1\r\n');
                } else {
                    log('n','i', 'Device ID ['+socket.id+'] has set HID'+no+' = '+val);
                    socket.hid['h'+no] = val;
                }
            } else if (mesg == 'HEAD=0') { // do confirm device's identity
                log('n', 'i', 'Device ID ['+socket.id+'] initial HEAD=0');

                if (typeof socket.hid == 'undefined') {
                    log('n', 'e', 'HEAD has not initialized');
                    socket.write('e1\r\n');
                    return;
                }

                Device.findOne({ serial:socket.hid.h3 }, 'id owner clientId', function(err, data){
                    if (err) {
                        log('n', 'e', err);
                        log('n', 'd', socket.hid);
                        socket.write('e1\r\n');
                        return;
                    } else if (!data || typeof data.id == 'undefined') { // unrecognized serial
                        log('n', 'w', 'Device ID ['+socket.id+'] made an invalid access. Unrecognized serial '+socket.hid.h3);
                        log('n', 'd', socket.hid);
                        socket.write('e1\r\n');
                        return;
                    } else {
                        log('n', 'i', 'Device ID ['+socket.id+'] has logged successfully');
                        log('n', 'd', socket.hid);
                        log('n', 'd', data);
                        socket.head     = false;
                        socket.logged   = true;
                        socket.clientId = data.clientId;
                        socket.write('ok\r\n');
                    }
                });
            }
        } else if (mesg.substr(0,4) == 'BODY' || mesg.substr(0,4) == 'BTYP' || (body.indexOf(mesg.substr(0,4)) >= 0 && mesg.substr(6,1) == '=')) {
            if (typeof socket.logged == 'undefined' || !socket.logged) {
                log('n', 'w', 'Device is not logged yet');
                socket.write('e1\r\n');
                return;
            }
            if (mesg == 'BODY=1') { // device initialed body request
                log('n', 'i', 'Device ID ['+socket.id+'] initial BODY=1');
                socket.body = true;
                socket.bCon = {};
            } else if (mesg.substr(0,5) == 'BTYP=') {
                log('n', 'i', 'Body type has updated. '+mesg);
            } else if (body.indexOf(mesg.substr(0,4)) >= 0) { // device is updating server of its current status
                var attr = mesg.substr(0,4);
                var no   = mesg.substr(4,2);
                var val  = mesg.substr(7);

                if (typeof socket.body == 'undefined' || !socket.body) {
                    log('n', 'e', 'HEAD has not initialized');
                    socket.write('e1\r\n');
                    return;
                }
                if (!no) {
                    log('n', 'e', 'BODY attribute received without any index number');
                    socket.write('e1\r\n');
                    return;
                }

                if (parseInt(no) < 1 || parseInt(no) > 99) {
                    log('n', 'e', 'Attribute '+attr+no+' is out of range (01-99)');
                    socket.write('e1\r\n');
                } else {
                    log('n','i', 'Device ID ['+socket.id+'] update server its attribute '+attr+no+' = '+val);
                    socket.bCon[attr+no] = val;
                }
            } else if (mesg == 'BODY=0') { // confirm device's BODY attributes completely send
                log('n', 'i', 'Device ID ['+socket.id+'] initial BODY=0');

                if (typeof socket.bCon == 'undefined') {
                    log('n', 'e', 'BODY has not initialized');
                    socket.write('e1\r\n');
                    return;
                }

                if (socket.bCon.length == 0) {
                    log('n', 'w', 'Device ID ['+socket.id+'] submit an empty BODY without attributes');
                    log('n', 'd', socket.bCon);
                    socket.write('e1\r\n');
                    return;
                }

                log('n', 'i', 'Device ID ['+socket.id+'] has updated server of its current status');
                log('n', 'd', socket.bCon);
                socket.body = false;
                socket.write('ok\r\n');
            }
        } else if (mesg == 'QUE?') {
            var que = false;

            //if (!authorised()) { return; }
            if (typeof socket.logged == 'undefined' || !socket.logged) {
                log('n', 'w', 'Device is not logged yet');
                socket.write('e1\r\n');
                return;
            }

            for (var i=0; i<websockets.length; i++) { // check if device's owner online
                if (typeof websockets[i].store != 'undefined') {
                    if (typeof websockets[i].store.data != 'undefined') {
                        if (typeof websockets[i].store.data.user != 'undefined') {
                            if (websockets[i].store.data.user.id == socket.clientId) { // device's owner found online
                                que = true;
                            }
                        }
                    }
                }
            }

            if (que) {
                log('n', 'i', 'Something in queue, device need to send each BODY ATTRIBUTE(?) to get all update');
                socket.write('ok\r\n');
            } else {
                log('n', 'i', 'Nothing in queue, so nothing to update device BODY');
                socket.write('na\r\n');
            }
        } else if (body.indexOf(mesg.substr(0,4)) >= 0 && mesg.substr(6,1) == '?') { // device ask if server want to update its attribute
            log('n', 'i', 'Change device attribute: '+mesg.substr(0,6));
            var attr = mesg.substr(0,4);
            var no   = mesg.substr(4,2);
            var val  = '';

            if (typeof socket.bCon == 'undefined') {
                log('n', 'e', 'BODY has not initialized\r\n');
                socket.write('e1\r\n');
                return;
            }
            if (typeof socket.bCon[attr+no] != 'undefined') {
                val = socket.bCon[attr+no];
                //socket.write(val+'\r\n');
            } else {
                log('n', 'i', 'Unrecognized BODY attribute name ['+attr+no+']');
                socket.write('e1\r\n');
                return;
            }

            // TODO(remove): testing purpose, to be removed
            if (mesg.substr(0,4) == 'BGPI') {
                log('n', 'i', 'value not available,Input'+no);
                socket.write('na\r\n');
            } else if (mesg.substr(0,4) == 'BGPO') {
                log('n', 'i', 'value change to 1,Output'+no);
                socket.write('d=1'+no+'\r\n');
            } else if (mesg.substr(0,4) == 'BVAR') {
                log('n', 'i', 'value not available,Var'+no);
                socket.write('na\r\n');
            } else if (mesg.substr(0,4) == 'BSTA') {
                log('n', 'i', 'value not available,Status'+no);
                socket.write('na\r\n');
            } else {
                log('n', 'e', 'Unknown attribute name ['+mesg.substr(0,4)+']');
                socket.write('e1\r\n');
            }
        } else if (mesg.substr(0,4) == 'RQS?') {
// SET BODY
            log('n', 'i', 'Device send request to check if both party still in connect and maintaining the communication, reply ok to continue');
            socket.write('ok\r\n');
        } else if (mesg.substr(0,4) == 'DNT?') {
            log('n', 'i', 'Device asking for current time ['+datetime()+'] to update its timer');
            socket.write('d=\r\n'); // TODO(date): yyymmdd, hhmmss
        } else if (mesg.substr(0,5) == 'STS=1') {
            log('n', 'i', 'Device asking if server wanted to lead, reply ok to lead');
            socket.write('ok\r\n'); // if server refuse to lead, send d=0\r\n
            log('n', 's', 'Server is leading now!');

            _timer = setTimeout(function(){ // TODO(remove): for temporary testing propose
                log('n', 'i', 'Send d=0 to ask device to lead back itself');
                socket.write('d=0\r\n');
            }, 10000);
        } else if (mesg.substr(0,5) == 'STS=0') {
            log('n', 'i', 'Device URGENTLY want to lead back, probably some Event has triggered!!!');
            clearTimeout(_timer);
            socket.write('ok\r\n');
        } else if (mesg == 'check') { // for debug only
// DEBUG HEAD AND BODY
            if (typeof socket.hid == 'undefined') {
                socket.write('HEAD has not initialized\r\n');
            } else {
                socket.write(JSON.stringify(socket.hid)+'\r\n');
            }

            if (typeof socket.bCon == 'undefined') {
                socket.write('BODY has not initialized\r\n');
            } else {
                socket.write(JSON.stringify(socket.bCon)+'\r\n');
            }
        } else if (mesg == 'aes') {
// AES (128bit) TEST
            var encrypted = encryption('hellohellohello!', 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');
            log('n', 'i', 'Encrypted: ['+encrypted+']');

            var decrypted = decryption(encrypted, 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');
            log('n', 'i', 'Decrypted: ['+decrypted+']');

            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    socket.write('\n'+decrypted+': '+encrypted+'\r');
                }
            }
        } else if (mesg.substr(0,4) == 'enc=') {
            var encrypted = encryption(mesg.substr(4), 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');
            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    socket.write('Encrypted: ['+encrypted+']\n\r');
                }
            }
            log('n', 's', 'Encrypted: ['+encrypted+']');
        } else if (mesg.substr(0,4) == 'dec=') {
            log('n', 'i', '['+mesg.substr(4)+']');
            var decrypted = decryption(mesg.substr(4), 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex');
            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) {
                    socket.write('Decrypted: ['+decrypted+']\n\r');
                }
            }
            log('n', 's', 'Decrypted: ['+decrypted+']');
        } else if (mesg == 'mail') {
// SEND MAIL
            smtpTransport.sendMail(mailOptions, function(err, res){
                if (err) {
                    log('n', 'e', err);
                } else {
                    log('n', 's', 'Email sent: '+res.message);
                }
                //smtpTransport.close(); // shut down the connection pool, no more messages
            });
        } else {
// FREE CHAT
            var x    = sockets.indexOf(socket);
            var id   = (x < 0) ? null : sockets[x]._handle.fd;
            var name = (id) ? 'Client '+id : 'Unknown Device';

            log('n', 'i', name+' just enter: '+mesg);

            for (var i=0; i<sockets.length; i++) {
                if (sockets[i] == socket) { // self
                    continue;
                }
                sockets[i].write(name+': '+mesg+'\r\n'); // broadcast to everyone on the NET
            }
            for (var i=0; i<websockets.length; i++) {
                websockets[i].emit('netChat', {
                    client: id,
                    time: datetime(),
                    message: mesg
                });
            }
        }
    });
    socket.on('message', function(msg) { // send from server
        for (var i=0; i<sockets.length; i++) {
            sockets[i].write('Server: '+msg+'\r\n');
        }
    });
    socket.on('end', function() {
        var i = sockets.indexOf(socket);
        log('n', 'i', 'client '+socket.id+' disconnected');

        delete socket.info;
        delete socket.status;
        delete socket.zones;

        sockets.splice(i, 1);

        // TODO(system): notify offline status to user who connected to it
        for (var i=0; i<websockets.length; i++) {
            websockets[i].emit('Offline');
        }
        //process.exit(0);
    });

    //socket.write('\r\n~~ Welcome to our server ~~\r\n\r\n');
    //socket.pipe(socket);
});

server.listen(1470, host);
log('s', 'i', 'Net listening to '+host+':1470');


//
// Socket.io
//
io = io.listen(webserver);
log('s', 'i', 'Socket.io listening to '+host+':8080');
io.sockets.on('connection', function(sock) {
    log('w', 'i', 'web client '+sock.id+' connected');
    websockets.push(sock); // assign websocket to global variable

    if (typeof sockets[0] != 'undefined') {
        var sk = sockets[0];
        sock.emit('InitialUpdates', {
            info: sk.info,
            status: sk.status,
            zones: sk.zones
        });
    }

    sock.on('app update', function(type, data){
        for (var i=0; i<sockets.length; i++) {
            _.each(data, function(v, k){
                log('w', 'i', 'App update '+type+', set '+k+' = '+v);
                sockets[i][type][k] = v;
                sockets[i].write(k+'='+v+RN);

                fnUserLog(type, sock.id, k, v);
                deviceUpdate(k, type, v, false);
            });
        }
        log('w', 'd', data);
    });

    sock.emit('WelcomeMessage', { message:'~ Welcome to the world of socket.io ~', user:'Unknown' })

    sock.on('message server', function(data) {
        log('w', 'i', 'Client push:\r');
        log('w', 'd', data);
    });
    sock.on('login', function (data) {
        if (data.username == 'root' && data.password == 'abc123') {
            log('w', 's', 'User has logged as '+data.username);

            sock.set('user', { username:'root', root:true }, function () {
                sock.emit('StatusUpdate', {
                    status: true,
                    callback: 'loggedSuccess',
                    root: true,
                    mesg: 'Root have successfully logged'
                });
            });
            return;
        }

        Client.findOne({ 'username':data.username, 'password':data.password }, 'id username fullname', function (err, client) {
            if (err) {
                log('w', 'e', err);
                sock.emit('StatusUpdate', {
                    status: false,
                    mesg: 'Login process failure, please try again..'
                });
                return;
            }

            if (client && typeof client.fullname != 'undefined' && client.fullname) {
                log('w', 's', 'User has logged as '+data.username);
                Device.findOne({ clientId:client.id }, 'id serial', function(err, device){
                    var body = [];

                    if (err) {
                        log('w', 'e', err);
                        sock.emit('StatusUpdate', {
                            status: false,
                            mesg: 'Find devices process failure, please try again..'
                        });
                        return;
                    }

                    if (device && typeof device.serial != 'undefined' && device.serial) { // list all owner devices
                        for (var i=0; i<sockets.length; i++) { // loop all devices that on the line
                            if (sockets[0].hid.h3 == device.serial) { // owner's device match & found online
                                body = sockets[0].bCon;
                            }
                        }
                    }

                    sock.set('user', client, function () {
                        sock.emit('StatusUpdate', {
                            status: true,
                            callback: 'loggedSuccess',
                            client: client,
                            body: body,
                            mesg: 'You have successfully logged'
                        });
                    });
                });
            } else {
                log('w', 'e', 'Attempt login failure');
                sock.emit('StatusUpdate', {
                    status: false,
                    mesg: 'Invalid username or password'
                });
            }
        });
    });
    sock.on('send chat', function(chat){
        sock.get('user', function (err, user) {
            var name = (!user || typeof user.username == 'undefined') ? 'Web Client' : user.username;

            log('w', 'i', name+' just enter: '+chat);

            for (var i=0; i<websockets.length; i++) {
                if (websockets[i] == sock) { // self
                    continue;
                }
                websockets[i].emit('netChat', {
                    user: name,
                    time: datetime(),
                    message: chat
                });
            }
            for (var i=0; i<sockets.length; i++) {
                sockets[i].write(name+': '+chat+'\r\n'); // broadcast to everyone on the NET
            }
        });
    });
    sock.on('add client', function(req){
        sock.get('user', function (err, user) {
            if (!user || typeof user.username == 'undefined') {
                sock.emit('StatusUpdate', {
                    status: false,
                    mesg: 'You have not logged'
                });
                return;
            }

            if (typeof user.root == 'undefined') { // Client can not add client
                log('w', 'w', 'Unrecognized serial '+req.serial);
                sock.emit('StatusUpdate', {
                    status: false,
                    mesg: 'You are not authorised to do this'
                });
                return;
            }

            var client = new Client({
                username: req.username,
                password: req.password,
                fullname: req.fullname
            });
            client.save(function(err, data) {
                if (err) {
                    log('w', 'e', err);
                    sock.emit('StatusUpdate', {
                        status: false,
                        mesg: 'Fail to add new client to the system'
                    });
                } else {
                    log('w', 's', 'New client added successfully');
                    log('w', 'd', data);
                    sock.emit('StatusUpdate', {
                        status: true,
                        callback: 'addClientSuccess',
                        mesg: 'New client has added successfully'
                    });
                }
            });
        });
    });
    sock.on('add device', function(req){
        sock.get('user', function (err, user) {
            if (typeof user.username == 'undefined') {
                sock.emit('StatusUpdate', {
                    status: false,
                    mesg: 'You have not logged'
                });
                return;
            }

            if (typeof user.root == 'undefined') { // Client want to register new device
                Device.findOne({ serial:req.serial }, 'id name', function(err, data){
                    if (err) {
                        log('w', 'e', err);
                        sock.emit('StatusUpdate', {
                            status: false,
                            mesg: 'Error when register device to the system, please try again..'
                        });
                    } else if (!data || typeof data.id == 'undefined') { // unrecognized serial
                        log('w', 'w', 'Unrecognized serial '+req.serial);
                        sock.emit('StatusUpdate', {
                            status: false,
                            mesg: 'Fail register device, unrecognized serial '+req.serial+ ' for user '+user.id
                        });
                    } else { // done register device, send email to client
                        Device.findByIdAndUpdate(data.id, {
                            owner: user.fullname,
                            clientId: user.id,
                            modified: Date.now()
                        }, function(err, data){
                            if (err) {
                                log('w', 'e', err);
                            }
                        });

                        var mailOpts = {
                            from: "Nodejs Rock ✔ <nodejs@kokweng.net>",
                            to: user.fullname+" <"+user.username+">",
                            subject: "Your new registered device verification code ✔",
                            text: 'Dear '+user.fullname+", ✔\r\nFollowing is your newly registered device verification code\r\nCode: "+data.id,
                            html: '<p>Dear <b>'+user.fullname+', ✔</b></p><div>Following is your newly registered device verification code</div><div>Code: <u>'+data.id+'</u></div>'
                        };
                        smtpTransport.sendMail(mailOpts, function(err, res){
                            if (err) {
                                log('w', 'e', err);
                            } else {
                                log('w', 's', 'Device has registered successfully, verification code has sent to '+user.username);
                                log('w', 'd', data);
                                sock.emit('StatusUpdate', {
                                    status: true,
                                    callback: 'registerDeviceSuccess',
                                    mesg: 'You have registered the new device, please check your email to confirm the process'
                                });
                            }
                        });
                    }
                });
                return;
            }

            // Admin add new device information to the system
            var device = new Device({
                name: req.name,
                macAdd: req.macAdd,
                serial: req.serial,
                owner: user.username
            });
            device.save(function(err, data) {
                if (err) {
                    log('w', 'e', err);
                    sock.emit('StatusUpdate', {
                        status: false,
                        mesg: 'Fail to add new device to the system'
                    });
                } else {
                    log('w', 's', 'New device added successfully');
                    log('w', 'd', data);
                    sock.emit('StatusUpdate', {
                        status: true,
                        callback: 'addDeviceSuccess',
                        mesg: 'New device has added successfully'
                    });
                }
            });
        });
    });
    sock.on('set body', function(req){
        sock.get('user', function(err, user){
            if (typeof user.username == 'undefined') {
                sock.emit('StatusUpdate', {
                    status: false,
                    mesg: 'You have not logged'
                });
                return;
            }
        });
    });
    sock.on('command device', function(data){
        sock.get('user', function (err, user) {
            if (!user || typeof user.username == 'undefined') {
                log('w', 'w', 'Invalid command sent from anonymous');
                sock.emit('StatusUpdate', {
                    status: false,
                    callback: 'commandFail',
                    mesg: 'Send command failure, You have not login yet'
                });
                return;
            }

            var devices = [];
            var json    = {
                status: true,
                callback: 'commandSuccess',
                mesg: 'Command has received by server'
            };

            if (data.command == 'listall') { // check if device online
                if (sockets.length == 0) {
                    json.mesg += '<div>There is no any device on the line at the moment</div>';
                } else {
                    for (var i=0; i<sockets.length; i++) {
                        devices.push(sockets[i].id);
                    }
                    json.mesg += '<div>Your device with ID <b>'+devices.join(',')+'</b> is connected to server</div>';
                }
            } else if (data.command == 'check') { // for debug only
                //console.log(sock);
                Device.findOne({ serial:'112233445566' }, 'id name macAdd', function(err, data){
                    console.log(data);
                });
            }

            log('w', 'i', 'Command ['+data.command+'] sent by '+user.username);
            sock.emit('StatusUpdate', json);
        });
    });
    sock.on('disconnect', function () {
        io.sockets.emit('user disconnected');
        var i = websockets.indexOf(sock);
        websockets.splice(i, 1);
    });
});


exports.sockets = sockets;