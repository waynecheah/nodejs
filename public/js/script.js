var _client     = '';
var _body       = '';
var _countDown  = false;
var _cancelArm  = false;
var _loadCam    = false;
var _camLoaded  = false;
var _data       = {
    status: {
        alarm_status: 'r'
    }
};
var _transition = 'turn';
var _timer      = {};
var _mapping    = {
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
            0: 'OK',
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
            0: 'OK',
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

function cloneHeader (page, title) {
    $('#home div.row').clone(true).appendTo('#page-'+page+' div[data-role=header]');
    $('#page-'+page+' div.header').attr('data-theme', 'c');
    $('#page-'+page+' h3.headerTitle').html(title);
} // cloneHeader

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

function appUpdateFailureTimer (type, cancelUpdate) {
    _timer[type] = setTimeout(function(){
        console.log('Update of ['+type+'] failure..');
        cancelUpdate();
    }, 5000);
} // appUpdateFailureTimer


function updateDeviceStatus (data) {
    if (data.deviceId) { // device is online
        $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-success');
        $('.status').removeClass('text-danger text-default').addClass('text-success').html(data.info.pn+' connected');
        $('#page-security div.armBtnWrap').show();
    } else {
        $('div.header span.icon-hdd-raid').attr('class', 'icon-hdd-raid text-danger');
    }

    updateZones();
    updateTroubles();
    updateSystemStatus();
    updateLights();
} // updateDeviceStatus

function updateZones () {
    var cls, con, info, id, no, s1, s2, stt, thm, ty;
    var listview = '';

    _.each(_data.status.zones, function(str){
        info = str.split(',');

        no = info[0];
        id = 'zn'+no;
        s1 = ' selected';
        s2 = '';
        ty = parseInt(info[4]);

        con = parseInt(info[1]);
        con = _mapping.zone.condition[con];
        stt = parseInt(info[2]);
        thm = 'c';

        if (info[1] == '0') { // disable
            thm = 'a';
        } else if (info[1] == '1') { // zone detect opened
            if (info[2] == '2') { // it's bypassed zone
                s1 = '';
                s2 = ' selected';
                thm = 'b'
            } else {
                thm = 'e';
            }
        }

        if (stt > 0) {
            if (stt == 1) { // alarm
                cls = 'danger';
            } else if (stt == 2) { // bypass
                cls = 'success';
            } else if (stt == 3) { // trouble
                cls = 'muted';
            } else if (stt == 4) { // tamper
                cls = 'warning';
            }

            stt  = _mapping.zone.status[stt];
            con += '<span class="p5"> - </span><span class="text-'+cls+' zoneStatus">'+stt+'</span>';
        }

        if (ty > 0) {
            ty = _mapping.zone.type[ty];
            ty = '('+ty+')';
        } else {
            ty = '';
        }

        listview += '<li data-theme="'+thm+'" class="'+id+'"><img data-src="holder.js/80x80" alt="..." class="ui-li-thumb" />' +
                    '<h3>Zone '+no+' <span class="pl5 s12">'+ty+'</span></h3><p>'+con+'</p><span class="ui-li-aside">' +
                    '<div data-role="fieldcontain" data-status="'+info[2]+'" class="bypass" style="display:none;">' +
                    '<select name="'+id+'" id="bp'+no+'" data-theme="d" data-role="slider">' +
                    '<option value="0"'+s1+'>Open</option><option value="1"'+s2+'>Bypass</option></select>' +
                    '</div></span></li>';
    });

    $('#page-security ul[data-role=listview]').html(listview);
    $('#page-security ul[data-role=listview] li select[data-role=slider]').on('slidestop', function(e){
        socket.emit('app update', 'zone', {
            no: no,
            cmd: $(e.target).val()
        });
    });
    Holder.run();

    if ($('#page-security.ui-page').length) { // page already rendered
        $('#page-security').trigger('create');
        $('#page-security ul[data-role=listview]').listview('refresh');
    }
} // updateZones

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

            if (status == 0) {
                status = 'off';
                tpl.find('div.slider input[type=range]').attr('disabled', true);
            } else {
                status = 'on';
            }

            type  = '';
            value = Math.round((value/255) * 100);

            tpl.find('div.slider label').attr('for', 'light'+no);
            tpl.find('div.slider input[type=range]').attr({
                id: 'light'+no,
                value: value,
                'data-no': no
            });
        } else {
            tpl = $(html1);

            if (status == 0) {
                status = 'off';
                type   = ' ('+_mapping.light.type[type]+')';
            } else if (status == 1) {
                status = 'on';
                type   = ' ('+_mapping.light.type[type]+')';
            }
        }

        tpl.attr('data-id', 'li'+no);
        tpl.find('h3.listTitle').append(type);
        tpl.find('select[data-role=slider]').attr({
            id: 'lightSwitch'+no,
            'data-no': no
        });
        tpl.find('select[data-role=slider]').val(status); // light on/off
        tpl.appendTo('#page-lights ul[data-role=listview]');
    });

    $('#home span.ui-li-count').html(_data.status.lights.length);
    $('li.lights em.mm-counter').html(_data.status.lights.length);

    if ($('#page-lights.ui-page').length) { // page already rendered
        $('#page-lights').trigger('create');
        $('#page-lights ul[data-role=listview]').listview('refresh');
    }

    $('#page-lights select[data-role=slider]').on('slidestop', function(event) { // On/Off
        var no      = $('#'+event.target.id).attr('data-no');
        var command = (event.target.value == 'off') ? 0 : 1;
        var value   = '-';

        if (command == 0) { // disable dimming when light is turn off
            $('#'+event.target.id).parents('li').find('div.slider input').slider('disable').addClass('ui-disabled');
        } else {
            $('#'+event.target.id).parents('li').find('div.slider input').slider('enable').removeAttr('disabled').removeClass('ui-disabled');
        }

        if ($('#'+event.target.id).parents('li').find('div.slider input').length) {
            value = $('#'+event.target.id).parents('li').find('div.slider input').val();
            value = Math.round((value/100) * 255);
            value = pad(value, 3);
        }

        emitLightUpdate(no, command, value);
    });
    $('#page-lights div.slider').on('slidestop', function(event) { // Dimmer
        var no  = $('#'+event.target.id).attr('data-no');
        var val = $('#'+event.target.id).val();
        val     = Math.round((val/100) * 255);
        val     = pad(val, 3);

        emitLightUpdate(no, 2, val);
    });
    Holder.run();
} // updateLights

function emitLightUpdate (no, command, value) {
    socket.emit('app update', 'light', {
        no: no,
        cmd: command,
        val: value
    });
    $('#page-lights li[data-id=li'+no+'] select[data-role=slider]').slider('disable');
    $('#page-lights li[data-id=li'+no+']').find('div.slider input').slider('disable').addClass('ui-disabled');
    appUpdateFailureTimer('lights', updateLights);
} // emitLightUpdate


function pad (number, length) {
    var str = '' + number;

    while (str.length < length) {
        str = '0' + str;
    }

    return str;
} // pad


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
    var newVal, curVal;

    if (!_.isUndefined(_timer[d.type])) { // app update process got response successfully, clear updateFailure's timer
        clearTimeout(_timer[d.type]);
        delete _timer[d.type];
    }

    _.each(_data.status[d.type], function(val, i){
        newVal = d.value.split(',');
        curVal = val.split(',');
        if (newVal[0] == curVal[0]) {
            _data.status[d.type][i] = d.value;
        }
    });

    if (d.type == 'system') {
        updateTroubles();
        updateSystemStatus();
    } else if (d.type == 'partition') {
    } else if (d.type == 'lights') {
        updateLights();
    }
});


var positionHeaderFn = function(){
    var top = $('div.mm-page').scrollTop();

    $('div.header').css({
        position: 'absolute',
        top: top+'px',
        left: '0'
    });
};

$('#home').on('pagebeforecreate', function(){
    $.mobile.defaultPageTransition = 'pop'; // after logged use pop transition

    $('nav#location').mmenu({
        classes: 'mm-light',
        counters: false,
        dragOpen: {
            open: true
        },
        slidingSubmenus: false
    }).on('opening.mm', positionHeaderFn).on('closed.mm', function(){
        $('div.header').css({
            position: 'fixed',
            top: 0,
            left: 0
        });
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
    $('nav.sidepanel li.location a').click(function(){
        $('nav.sidepanel li.location').removeClass('mm-active');
        $(this).parent('li').addClass('mm-active');
    });
}).on('pageshow', function(){
    $.mobile.defaultPageTransition = _transition;
    $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
    $('nav.sidepanel ul li:first').addClass('mm-selected');
    $('nav.sidepanel li.location:first').addClass('mm-active');
}).on('pagecreate', function(){
    var startX = 0;
    var valid  = false;
    $('div.mm-page').on('dragright', function(e){
        if (startX == 0) {
            startX = e.gesture.center.pageX;
            if (startX < 150) {
                valid = true;
            }
        } else if (valid) {
            if (e.gesture.center.pageX - startX >= 40) {
                valid = false;
                positionHeaderFn();
            }
        }
    }).on('dragend', function(){
        startX = 0;
    });

    $('a.changePage').click(function(){
        var href = $(this).attr('href');
        $.mobile.changePage(href);
    });


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
    cloneHeader('security', 'Security');
    $('#page-security a.armBtn').click(function(){
        var id, inf;
        var pts  = _data.status.partition;
        var info = pts[0].split(',');

        $.mobile.defaultPageTransition = 'slideup'; // arm page use slideup transition

        if (info[1] == '0') { // partition alarm: disarmed
            var opened = false;

            _.each(_data.status.zones, function(str){
                inf = str.split(',');
                id  = 'zn'+inf[0];

                if (inf[1] == '1') { // zone condition: open
                    if (inf[2] == '0') { // zone status: ready
                        opened = true;
                    }
                    $('#page-security ul[data-role=listview] li.'+id+' div.bypass').show();
                } else {
                    $('#page-security ul[data-role=listview] li.'+id+' div.bypass').hide();
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

        $.mobile.defaultPageTransition = _transition;
    });
}).on('pageshow', function(){
    $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
    $('nav.sidepanel ul li.security').addClass('mm-selected');
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

    cloneHeader('cameras', 'Cameras');
}).on('pageshow', function(){
    $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
    $('nav.sidepanel ul li.cameras').addClass('mm-selected');
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

$('#page-system-status').on('pagecreate', function(){
    cloneHeader('system-status', 'System Status');
}).on('pageshow', function(){
    $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
    $('nav.sidepanel ul li.system-status').addClass('mm-selected');
});

$('#page-lights').on('pageshow', function(){
    $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
    $('nav.sidepanel ul li.lights').addClass('mm-selected');
});

$('#page-history').on('pagecreate', function(){
    $('#home div.row').clone(true).appendTo('#page-history div[data-role=header]');
    $('#page-history h3.headerTitle').html('Event Logs');
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
    $.mobile.defaultPageTransition = _transition;

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