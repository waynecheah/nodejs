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

function resetMessage (second) {
    if (typeof second == 'undefined') {
        second = 3000;
    }
    setTimeout(function(){
        $('div.alert').fadeOut(function(){
            $(this).attr('class', 'alert').html('');
        });
    }, second);
} // resetMessage

function updateTroubles (id) {
    var troubles = 0;
    var total    = 0;

    $.each(_data.status, function(k, v){
        if (k != 'alarm_status') {
            total++;
            if (v == 0) {
                troubles++
            }
        }
    });

    if (troubles) {
        $('.troubles').removeClass('text-success text-default').addClass('text-danger').html('Problem '+troubles+'/'+total);
    } else {
        $('.troubles').removeClass('text-danger text-default').addClass('text-success').html('OK '+troubles+'/'+total);
    }

    if (typeof id != 'undefined') {
        var sts, css;

        if (_data.status[id] == 1) {
            sts = 'OK';
            css = 'text-success';
        } else {
            sts = 'Failure';
            css = 'text-danger';
        }

        $('#page-system-status').find('span.'+id).html(sts).removeClass('text-success text-danger').addClass(css);
        notification('System Status', 'System status of '+id+' is now changed to '+sts);
    }
} // updateTroubles

function updateAlarmStatus (alert) {
    var rdr = $('#page-security').attr('data-render');
    var thm = 'b';
    var sts = '';

    if (_data.status.alarm_status == 'a') {
        thm = 'e';
        sts = 'Armed Away';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-lock');
        $('#page-security a.armBtn span.armTxt').html('Armed Away - Press to Disamed');
    } else if (_data.status.alarm_status == 'h') {
        thm = 'e';
        sts = 'Armed Home';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-lock');
        $('#page-security a.armBtn span.armTxt').html('Armed Home - Press to Disamed');
    } else if (_data.status.alarm_status == 'r') {
        sts = 'Disarmed';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
        $('#page-security a.armBtn span.armTxt').html('Disarmed - Press to Arm');
    } else if (_data.status.alarm_status == 'p') {
        sts = 'Panic';
        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
        $('#page-security a.armBtn span.armTxt').html('Panic - Press to Arm');
    }

    $('#page-security a.armBtn').attr('data-status', _data.status.alarm_status);

    if (rdr == '1') {
        //$('#page-security a.armBtn').button('refresh');
        $('#page-security a.armBtn').buttonMarkup({ theme:thm });
    } else {
        console.log('not render '+rdr);
        $('#page-security a.armBtn').attr('data-theme', thm);
    }

    if (alert) {
        notification('Alarm Status', 'Alarm status is now changed to '+sts);
    }
} // updateAlarmStatus

function updateZones () {
    var rendered = $('#page-security').attr('data-render');
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

    if (rendered == '1') {
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

function updateSystemStatus () {
    var sts, css;

    $.each(_data.status, function(k, v){
        if (k != 'alarm_status') {
            if (v == 1) {
                sts = 'OK';
                css = 'text-success';
            } else {
                sts = 'Failure';
                css = 'text-danger';
            }
            $('#page-system-status').find('span.'+k).html(sts).removeClass('text-success text-danger').addClass(css);
        }
    });
} // updateSystemStatus

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


var socket = io.connect('http://cheah.homeip.net:8081', {
    'max reconnection attempts': 100
});

socket.on('connect', function(){
    $('.connection').removeClass('text-danger text-default').addClass('text-success').html('Connected');
});
socket.on('connecting', function(){
    $('.connection').removeClass('text-danger text-success').addClass('text-default').html('Connecting..');
});
socket.on('disconnect', function(){
    $('#page-security div.armBtnWrap').hide();
    $('.troubles').removeClass('text-success text-default').addClass('text-warning').html('Unavailable');
    $('.status').removeClass('text-success text-default').addClass('text-warning').html('Unavailable');
    $('.connection').removeClass('text-success text-default').addClass('text-danger').html('Disconnected');
    notification('Server Offline', 'Server is currently detected offline, this may due to scheduled maintenance.', 10000);
});
socket.on('reconnect', function(){
    notification('Server Online', 'Server is detected back to online now, this may due to maintenance completed.', 10000);
});
socket.on('InitialUpdates', function(data){
    if (typeof data.info != 'undefined') {
        _data = data;

        $('.status').removeClass('text-danger text-default').addClass('text-success').html(data.info.name+' connected')
        $('#page-security div.armBtnWrap').show();
        updateTroubles();
        updateAlarmStatus(false);
        updateZones();
        updateSystemStatus();
    }
});
socket.on('Offline', function(data){
    $('#page-security div.armBtnWrap').hide();
    $('.troubles').removeClass('text-success text-default').addClass('text-danger').html('N/A');
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

$('#home').on('pagecreate', function(){
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
    $(this).attr('data-render', '1');
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
});
$('#page-security').on('pagehide', function(){
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
});
$('#page-how-to-arm').on('pageshow', function(){
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
$('#page-cameras').on('pageshow', function(){
    $.each($('#page-cameras canvas.ipcam'), function(){
        var id   = $(this).attr('id');
        var size = $(this).attr('data-size');
        var url  = $(this).attr('data-url');
        resizeImage(id, url, size);
    });
});
$('#page-camera').on('pageshow', function(){
    _loadCam = true;
    loadCamera();
}).on('pagehide', function(){
        _loadCam = false;
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
});