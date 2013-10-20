var _client    = '';
var _body      = '';
var _countDown = false;
var _cancelArm = false;
var _loadCam   = false;
var _camLoaded = false;
var _data      = {
    status: {
        alarm_status: 'r'
    }
};

var _mapping = {
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

function loggedSuccess () {
    var deviceCls = '';
    if (typeof _data.root == 'undefined') {
        _client   = _data.client;
        _body     = _data.body;
        deviceCls = 'clientDevice';
    } else {
        deviceCls = 'addDevice';
    }

    $('div.loginWrap').slideUp(function(){
        $('div.commandWrap,div.'+deviceCls).fadeIn(function(){
            $('#command').focus();
        });
    });
} // loggedSuccess

function updateAlarmStatus (alert) {
    var rdr = $('#page-security').attr('data-render');
    var thm = 'b';
    var sts = '';

    if (_data.status.alarm_status == 'a') {
        thm = 'e';
        sts = 'Armed Away';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-lock');
        $('#page-security a.armBtn span.armTxt').html('Armed Away - Press to Disamed');

        $('div.header span.icon-locked').attr('class', 'icon-locked text-success').show();
        $('div.header span.icon-exclamation').hide();
    } else if (_data.status.alarm_status == 'h') {
        thm = 'e';
        sts = 'Armed Home';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-lock');
        $('#page-security a.armBtn span.armTxt').html('Armed Home - Press to Disamed');

        $('div.header span.icon-locked').attr('class', 'icon-locked text-success').show();
        $('div.header span.icon-exclamation').hide();
    } else if (_data.status.alarm_status == 'r') {
        sts = 'Disarmed';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
        $('#page-security a.armBtn span.armTxt').html('Disarmed - Press to Arm');

        $('div.header span.icon-locked').attr('class', 'icon-locked text-warning').show();
        $('div.header span.icon-exclamation').hide();
    } else if (_data.status.alarm_status == 'p') {
        sts = 'Panic';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
        $('#page-security a.armBtn span.armTxt').html('Panic - Press to Arm');

        $('div.header span.icon-locked').hide();
        $('div.header span.icon-exclamation').attr('class', 'icon-locked text-danger').show();
    }

    $('#page-security a.armBtn').attr('data-status', _data.status.alarm_status);

    if (rdr == '1') {
        //$('#page-security a.armBtn').button('refresh');
        $('#page-security a.armBtn').buttonMarkup({ theme:thm });
    } else {
        $('#page-security a.armBtn').attr('data-theme', thm);
    }

    if (alert) {
        notification('Alarm Status', 'Alarm status is now changed to '+sts);
    }
} // updateAlarmStatus

function updateZones () {
    var listview = '';
    var mapping  = {
        o: 'Opened',
        c: 'Closed',
        b: 'Bypassed',
        d: 'Disabled'
    };

    $.each(_data.zones, function(k, v){
        var s1 = '';
        var s2 = '';

        if (v == 'o') {
            s1 = ' selected';
            s2 = '';
        } else if (v == 'b') {
            s1 = '';
            s2 = ' selected';
        }

        listview += '<li data-theme="c" class="'+k+'"><img data-src="holder.js/80x80" alt="..." class="ui-li-thumb" />' +
            '<h3>'+k.replace('z','Zone ')+'</h3><p>'+mapping[v]+'</p><span class="ui-li-aside">' +
            '<div data-role="fieldcontain" data-status="'+v+'" class="bypass" style="display:none;">' +
            '<select name="'+k+'" id="bp'+k+'" data-theme="d" data-role="slider">' +
            '<option value="o"'+s1+'>Open</option><option value="b"'+s2+'>Bypass</option></select>' +
            '</div></span></li>';
    });

    $('#page-security ul[data-role=listview]').html(listview);
    $('#page-security ul[data-role=listview] li select[data-role=slider]').on('slidestop', function(e, ui){
        var obj = {};
        obj[$(e.target).attr('name')] = $(e.target).val();
        socket.emit('app update', 'zones', obj);
    });
    Holder.run();

    if ($('#page-security.ui-page').length) { // page already rendered
        $('#page-security ul[data-role=listview]').listview('refresh');
    }
} // updateZones

function updateZone (id, value) {
    var mapping = {
        o: 'Opened',
        c: 'Closed',
        b: 'Bypassed',
        d: 'Disabled'
    };

    if ($('#page-security ul[data-role=listview] li').length > 0) { // only if listview is rendered
        if (value == 'o' || value == 'b') {
            $('#bp'+id).val(value);
            $('#page-security ul[data-role=listview] li select[data-role=slider]').slider('refresh');
        } else {
            $('#page-security ul[data-role=listview] li.'+id+' div.bypass').hide();
        }
        $('#page-security ul[data-role=listview] li.'+id+' div.bypass').attr('data-status', value);
        $('#page-security ul[data-role=listview] li.'+id+' p.ui-li-desc').html(mapping[value]);
    }

    notification('Zone Status', id.replace('z', 'Zone ')+' status is now changed to '+mapping[value]);
} // updateZone

function updateLight (id, value) {
} // updateLight


function updateAppOnlineStatus () {
    if (navigator.onLine) {
        $('div.header span.icon-world').attr('class', 'icon-world text-success');
    } else {
        $('div.header span.icon-world').attr('class', 'icon-world text-danger');
        $('div.header span.icon-hdd-net').attr('class', 'icon-hdd-net text-muted');
        $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-muted');
        $('div.header span.icon-locked').attr('class', 'icon-locked text-muted').show();
        $('div.header span.icon-heart').attr('class', 'icon-heart text-muted').show();
        $('div.header span.icon-exclamation').hide();
        $('div.header span.icon-sos').hide();
    }
} // updateAppOnlineStatus

function notification (title, content, timeclose) {
    if (typeof window.webkitNotifications == 'undefined') {
        return;
    }
    if (window.webkitNotifications.checkPermission() == 0) { // 0 is PERMISSION_ALLOWED
        var ntf  = window.webkitNotifications.createNotification('img/warning.png', title, content);
        var time = (typeof timeclose == 'undefined') ? 8000 : timeclose;

        ntf.ondisplay = function() {
            window.setTimeout(function() {
                console.log('close '+title);
                ntf.cancel();
            }, time);
            console.log('display '+title);
        };
        ntf.onclose = function() {
            console.log('Notification closing');
        };
        ntf.show();
    } else {
        window.webkitNotifications.requestPermission();
    }
} // notification

function permissionCheck () {
    if (window.webkitNotifications.checkPermission() == 0) {
        $('div.gainPermissions').fadeOut('normal', function(){
            $(this).remove();
        });
    } else {
        setTimeout(permissionCheck, 1000);
    }
} // permissionCheck

function updateDeviceStatus (data) {
    if (data.deviceId) { // device is online
        $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-success');
        $('.status').removeClass('text-danger text-default').addClass('text-success').html(data.info.pn+' connected');
        $('#page-security div.armBtnWrap').show();
    } else {
        $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-danger');
    }

    updateTroubles();
    updateSystemStatus();
    updateLights();
} // updateDeviceStatus

function updateSystemStatus () {
    var css, info, sts, type;
    var html  = '';
    var alarm = 0;
    var fault = 0;

    if (_.isUndefined(_data.status.system) || _.isNull(_data.status.system)) { // system info unavailable
        return;
    }

    _.each(_data.status.system, function(str){
        info = str.split(',');
        type = info[0];
        sts  = parseInt(info[1]);

        if (sts == 0) {
            css = ' text-success';
        } else if (sts == 1) {
            css = ' text-danger';
            alarm++;
        } else {
            css = ' text-warning';
            fault++;
        }

        type = _mapping.system.type[type];
        sts  = _mapping.system.status[sts];

        html += '<li data-theme="d">'+type+'<span data-type="'+info[0]+'" class="ui-li-aside normal'+css+'">'+sts+'</span></li>';
    });

    $('#page-system-status ul[data-role=listview]').html(html);

    if ($('#page-system-status.ui-page').length) { // page already rendered
        $('#page-system-status ul[data-role=listview]').listview('refresh');
    }

    if (alarm) {
        $('div.header span.icon-heart').hide();
        $('div.header span.icon-sos').attr('class', 'icon-sos text-danger').show();
    } else if (fault) {
        $('div.header span.icon-heart').hide();
        $('div.header span.icon-sos').attr('class', 'icon-sos text-warning').show();
    } else {
        $('div.header span.icon-sos').hide();
        $('div.header span.icon-heart').attr('class', 'icon-heart text-success').show();
    }
} // updateSystemStatus

function updateTroubles ()  {
    var info, sts;
    var trouble = 0;
    var total   = 0;
    var css     = ' text-warning';

    if (_.isNull(_data.status.system)) { // system info unavailable
        return;
    }

    _.each(_data.status.system, function(str){
        info = str.split(',');
        sts  = parseInt(info[1]);

        if (sts > 0) {
            if (sts == 1) {
                css = ' text-danger';
            }
            trouble++;
        }

        total++;
    });

    if (trouble) {
        $('.troubles').attr('class','troubles'+css).html('Problem '+trouble+'/'+total);
    } else {
        $('.troubles').removeClass('text-danger text-default').addClass('text-success').html(total+' ready/restore');
    }
} // updateTroubles

function armCountdown (sec) {
    var cls = null;

    if (!_countDown) {
        _countDown = true;
        _cancelArm = false;
    }

    if (sec >= 0) {
        sec--;

        if (sec <= 3) {
            cls = 'progress-bar-danger';
        } else if (sec <= 7) {
            cls = 'progress-bar-warning';
        } else {
            cls = 'progress-bar-success';
        }

        setTimeout(function(){
            if (_cancelArm) {
                _cancelArm = false;
                return;
            }
            $('#page-how-to-arm div.progress-bar').css('width', (sec*10)+'%')
                .removeClass('progress-bar-success progress-bar-warning progress-bar-danger').addClass(cls);
            $('div.ui-loader h1').html('Arm in '+sec+' seconds');
            armCountdown(sec);
        }, 1000);
    } else {
        var armType = 'r';
        _countDown  = false;
        _cancelArm  = false;

        if ($('#page-how-to-arm div.armTypeWrap:visible').length) {
            armType = $('#page-how-to-arm a.ui-btn-active').attr('data-alarm');
        }

        $('#page-how-to-arm div.countdown').fadeOut(function(){
            $('#page-how-to-arm div.progress-bar').css('width', '100%')
                .removeClass('progress-bar-danger').addClass('progress-bar-success');
        });
        $('#page-how-to-arm input.passcode').val('');
        $.mobile.loading('hide');
        socket.emit('app update', 'status', {
            alarm_status: armType
        });

        setTimeout(function(){
            history.back();
        }, 500);
    }
} // armCountdown

function cancelCountdown (isBackBtn) {
    _cancelArm = true;

    $('#page-how-to-arm input.passcode').val('');

    if (!_countDown) {
        return;
    }
    _countDown = false;

    $('#page-how-to-arm div.countdown').fadeOut(function(){
        $('#page-how-to-arm div.progress-bar').css('width', '100%')
            .removeClass('progress-bar-warning progress-bar-danger').addClass('progress-bar-success');
    });
    $.mobile.loading('hide');

    setTimeout(function(){
        $.mobile.loading('show', {
            text: 'Arm Process Cancelled',
            textVisible: true,
            textonly: true,
            theme: 'b'
        });
    }, 500);

    setTimeout(function(){
        $.mobile.loading('hide');
        if (!isBackBtn) {
            history.back();
        }
    }, 1500);
} // cancelCountdown

function resizeImage (id, url, size) {
    var canvas  = document.getElementById(id);
    var context = canvas.getContext('2d');
    var imgObj  = new Image();
    var width, height;

    if (size == 's') {
        width  = 320;
        height = 240;
    } else {
        width  = 640;
        height = 480;
    }

    imgObj.onload = function() {
        context.drawImage(imgObj, 0, 0, width, height, 0, 0, 120, 80);
    };
    imgObj.src = url;
} // resizeImage

function loadCamera () {
    var time = new Date().getTime();
    var url  = 'http://cheah.homeip.net:81/snapshot.cgi?loginuse=cheah&loginpas=jumpkne&'+time;

    if (_camLoaded) { // only change to new image when previous image finish loaded
        _camLoaded = false;
        $('#page-camera img.cam').attr('src', url);
    }

    if (_loadCam) {
        setTimeout(loadCamera, 1000);
    }
} // loadCamera

function updateLights () {
    var info, no, type, status, value, user, tpl;
    var html1 = $('#light-list').html();
    var html2 = $('#dim-light-list').html();

    if (_.isUndefined(_data.status.lights) || _.isNull(_data.status.lights)) { // lights status unavailable
        return;
    }

    $('#page-lights ul[data-role=listview]').html('');

    _.each(_data.status.lights, function(str){
        info   = str.split(',');
        no     = info[0];
        type   = parseInt(info[1]);
        status = parseInt(info[2]);
        value  = parseInt(info[3]);
        user   = info[4];

        if (type == 2) { // dimabled light
            tpl = $(html2);
        } else {
            tpl = $(html1);
        }

        if (status == 0) {
            status = 'off';
            type   = ' ('+_mapping.light.type[type]+')';
        } else if (status == 1) {
            status = 'on';
            type   = ' ('+_mapping.light.type[type]+')';
        } else { // dimabled light
            if (value == 0) {
                status = 'off';
            } else {
                status = 'on';
                value  = Math.round((value/255) * 100);
            }
            type = '';

            tpl.find('div.slider input[type=range]').attr({
                id: 'light'+no,
                value: value
            });
        }

        tpl.find('li').attr('data-id', 'li'+no);
        tpl.find('h3.listTitle').append(type);
        tpl.find('select[data-role=slider]').attr('id', 'lightSwitch'+no);
        tpl.find('select[data-role=slider]').val(status); // light on/off
        tpl.appendTo('#page-lights ul[data-role=listview]');
    });

    $('#home span.ui-li-count').html(_data.status.lights.length);

    if ($('#page-lights.ui-page').length) { // page already rendered
        $('#page-lights select[data-role=slider]').slider('refresh');
        $('#page-lights input[type=range]').slider('refresh');
        $('#page-lights ul[data-role=listview]').listview('refresh');
    }
    Holder.run();
} // updateLights


var socket = io.connect('http://'+document.domain+':'+window.location.port, {
    'max reconnection attempts': 100
});

socket.on('connect', function(){
    $('.connection').removeClass('text-danger text-default').addClass('text-success').html('Connected');
    $('div.header span.icon-hdd-net').attr('class', 'icon-hdd-net text-success');
});
socket.on('connecting', function(){
    $('.connection').removeClass('text-danger text-success').addClass('text-default').html('Connecting..');
    $('div.header span.icon-hdd-net').attr('class', 'icon-hdd-net text-warning');
});
socket.on('disconnect', function(){
    $('#page-security div.armBtnWrap').hide();
    $('.troubles').removeClass('text-success text-default').addClass('text-warning').html('Unavailable');
    $('.status').removeClass('text-success text-default').addClass('text-warning').html('Unavailable');
    $('.connection').removeClass('text-success text-default').addClass('text-danger').html('Disconnected');

    $('div.header span.icon-hdd-net').attr('class', 'icon-hdd-net text-danger');
    $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-warning');
    $('div.header span.icon-locked').attr('class', 'icon-locked text-muted').show();
    $('div.header span.icon-heart').attr('class', 'icon-heart text-muted').show();
    $('div.header span.icon-exclamation').hide();
    $('div.header span.icon-sos').hide();
    notification('Server Offline', 'Server is currently detected offline, this may due to scheduled maintenance.', 10000);
});
socket.on('reconnect', function(){
    notification('Server Online', 'Server is detected back to online now, this may due to maintenance completed.', 10000);
    $('div.header span.icon-hdd-net').attr('class', 'icon-hdd-net text-success');
});

socket.on('DeviceInformation', function(data){
    _data = data;
    updateDeviceStatus(data);
});
socket.on('Offline', function(data){
    $('#page-security div.armBtnWrap').hide();
    $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-danger');

    $('.status').removeClass('text-success text-default').addClass('text-danger').html('Disconnected');
    notification('Panel Offline', 'Your panel is detected offline now, this may due to internet connection problem.', 10000);
});
socket.on('DeviceUpdate', function(d){
    if (d.type == 'info') {
        _data.info[d.id] = d.value;
    } else if (d.type == 'status') {
        _data.status[d.id] = d.value;

        if (d.id == 'alarm_status') {
            updateAlarmStatus(true);
        } else {
            updateTroubles(d.id);
        }
    } else if (d.type == 'zone' || d.type == 'zones') {
        _data.zones[d.id] = d.value;
        updateZone(d.id, d.value);
    } else if (d.type == 'light' || d.type == 'lights') {
        _data.lights[d.id] = d.value;
        updateLight(d.id, d.value);
    }
});



$('#home').on('pagebeforecreate', function(){
    $.mobile.defaultPageTransition = 'pop';
}).on('pageshow', function(){
    $.mobile.defaultPageTransition = 'slide';
    $('nav#main-menu ul li').removeClass('mm-selected');
    $('nav#main-menu ul li:first').addClass('mm-selected');
}).on('pagecreate', function(){
    if (typeof window.webkitNotifications != 'undefined' && window.webkitNotifications.checkPermission()) {
        $('div.gainPermissions').show();
        $('div.gainPermissions').click(function(){
            window.webkitNotifications.requestPermission();
            permissionCheck();
        });
    } else { // either browser not support Notification or it already gained permission
        $('div.gainPermissions').remove();
    }
});

$('#page-security').on('pagecreate', function(){
    $('#page-security a.armBtn').click(function(){
        var sts = _data.status.alarm_status;

        if (sts == 'r') {
            var opened = false;
            $.each(_data.zones, function(k, v){
                if (v == 'o' || v == 'b') {
                    if (v == 'o') {
                        opened = true;
                    }
                    setTimeout(function(){
                        $('#page-security ul[data-role=listview] li.'+k+' div.bypass').show();
                    }, 1000);
                } else {
                    $('#page-security ul[data-role=listview] li.'+k+' div.bypass').hide();
                }
            });
            if (opened) {
                $.mobile.changePage('#dialog-alert-opened-zones', {
                    role: 'dialog'
                });
                $('#dialog-alert-opened-zones').dialog('option', 'closeBtn', 'none');
                $('#dialog-alert-opened-zones').dialog('option', 'overlayTheme', 'a');
            } else {
                $.mobile.changePage('#page-how-to-arm');
            }
        } else {
            $.mobile.changePage('#page-how-to-arm');
        }
    });
}).on('pageshow', function(){
    $('nav#main-menu ul li').removeClass('mm-selected');
    $('nav#main-menu ul li.security').addClass('mm-selected');
}).on('pagehide', function(){
    $('#page-security ul[data-role=listview] div.bypass').hide();
});

$('#page-how-to-arm').on('pagecreate', function(){
    $('#page-how-to-arm .cancelArm').click(function(){
        var isBackBtn = $(this).hasClass('back');
        cancelCountdown(isBackBtn);
    });
    $('#page-how-to-arm a.armType').click(function(){
        $('#page-how-to-arm a.armType').removeClass('ui-btn-active');
        $(this).addClass('ui-btn-active');
        $('#page-how-to-arm #code1').focus();
    });
}).on('pageshow', function(){
    var sts = _data.status.alarm_status;
    if (sts == 'a' || sts == 'h') {
        $('#page-how-to-arm h3.header').html('Confirm Disarmed');
        $('#page-how-to-arm h4.armCodeTxt').html('Enter Keypad Code To Disarmed');
        $('#page-how-to-arm div.armTypeWrap').hide();
    } else {
        $('#page-how-to-arm h3.header').html('Confirm Arm');
        $('#page-how-to-arm h4.armCodeTxt').html('Enter Keypad Code To Arm');
        $('#page-how-to-arm div.armTypeWrap').show();
    }
    $('#page-how-to-arm #code1').focus();
}).on('pagehide', function(){
    $('#page-how-to-arm input.passcode').val('');
    $('#page-how-to-arm div.countdown').hide();
});

$('#page-cameras').on('pagebeforecreate', function(){
    var html = '';
    var attr = 'width="120" height="80" class="ipcam"';
    var cams = [{
        page: 'page-camera',
        id: 'ipcam1',
        size: 'l',
        url: 'http://cheah.homeip.net:81/snapshot.cgi?loginuse=cheah&loginpas=jumpkne',
        label: 'Outdoor Camera',
        model: 'EasyN H6-837'
    }, {
        page: 'page-camera5',
        id: 'ipcam5',
        size: 's',
        url: 'http://cheah.homeip.net:85/snapshot.cgi?user=cheah&pwd=jumpknee123',
        label: 'Dining Camera',
        model: 'Wansview NC541'
    }, {
        page: 'page-camera6',
        id: 'ipcam6',
        size: 'l',
        url: 'http://cheah.homeip.net:86/snapshot.cgi?user=cheah&pwd=jumpknee123',
        label: 'Parlor Camera',
        model: 'ICam+ i918w'
    }];

    _.each(cams, function(o){
        html += '<li data-theme="c" class="ui-li-has-thumb">' +
                  '<a href="#'+o.page+'" data-transition="slide">' +
                    '<div class="ui-li-thumb freesize">' +
                      '<canvas id="'+o.id+'" data-size="'+o.size+'" data-url="'+o.url+'" '+attr+'></canvas>' +
                    '</div><h3 style="padding-left:40px;">'+o.label+'</h3>' +
                    '<p style="padding-left:40px;">'+o.model+'</p>' +
                  '</a>' +
                '</li>';
    });

    $('#page-cameras ul[data-role=listview]').html(html);
}).on('pageshow', function(){
    $('nav#main-menu ul li').removeClass('mm-selected');
    $('nav#main-menu ul li.cameras').addClass('mm-selected');
    $.each($('#page-cameras canvas.ipcam'), function(){
        var id   = $(this).attr('id');
        var size = $(this).attr('data-size');
        var url  = $(this).attr('data-url');
        resizeImage(id, url, size);
    });
});

$('#page-camera').on('pagebeforecreate', function(){
    var url = 'http://cheah.homeip.net:81/snapshot.cgi?loginuse=cheah&loginpas=jumpkne';
    $('#page-camera div.cameraWrap img.cam').attr('src', url);
}).on('pageshow', function(){
    _loadCam = true;
    loadCamera();
}).on('pagehide', function(){
    _loadCam = false;
});

$('#page-system-status').on('pageshow', function(){
    $('nav#main-menu ul li').removeClass('mm-selected');
    $('nav#main-menu ul li.system-status').addClass('mm-selected');
});

$('#page-lights').on('pageshow', function(){
    $('nav#main-menu ul li').removeClass('mm-selected');
    $('nav#main-menu ul li.lights').addClass('mm-selected');
});



$('#page-how-to-arm input.passcode').click(function(){
    $(this).val('');
}).keyup(function(){
        var n = $(this).attr('data-no');
        var i = parseInt(n) + 1;
        if (i > 4) {
            var sts = _data.status.alarm_status;

            if (sts == 'a' || sts == 'h') {
                socket.emit('app update', 'status', {
                    alarm_status: 'r'
                });

                // TODO(callback): wait callback to confirm disarmed
                $.mobile.loading('show', {
                    text: 'Disarmed successfully',
                    textVisible: true,
                    textonly: true,
                    theme: 'b'
                });
                setTimeout(function(){
                    $.mobile.loading('hide');
                    history.back();
                }, 1000);
            } else {
                // check zone status

                armCountdown(10);
                $(this).blur();
                $.mobile.loading('show', {
                    text: 'Arm in 10 seconds...',
                    textVisible: true,
                    theme: 'a'
                });
                $('#page-how-to-arm div.countdown').fadeIn();
            }
        } else {
            $('#page-how-to-arm #code'+i).val('').focus();
        }
    });

$('#page-camera img.cam').on('load', function(){
    _camLoaded = true;
});

$(function() {
    $.mobile.defaultPageTransition = 'slide';

    $('nav#location').mmenu({
        dragOpen: {
            open: true
        }
    });
    $('nav#main-menu').mmenu({
        counters: false,
        dragOpen: {
            open: true
        },
        position: 'right',
        zposition: 'front',
        slidingSubmenus: false
    });

    $(window).resize(function(){
        if ($(this).width()<598) {
            $('div.header div.iconWrap').css('padding-right', '5px');
            $('div.header table.iconWrap').css('min-width', '94px');
        } else {
            $('div.header div.iconWrap').css('padding-right', '15px');
            $('div.header table.iconWrap').css('min-width', '158px');
        }
    }).trigger('resize');

    updateAppOnlineStatus();
    window.addEventListener('online',  updateAppOnlineStatus);
    window.addEventListener('offline', updateAppOnlineStatus);
});