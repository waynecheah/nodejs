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
var _statusCls  = 'text-success text-danger text-warning text-muted';
var _transition = 'slide';
var _wsProcess  = [];
var _timer      = {};
var fbParams    = {
    appId: '553789621375577',
    cookie: true,
    email: true
};
var glParams    = {
    apiKey: 'AIzaSyD6z5RkfXSuBKGwm0djIHoRWm-OLsS7IYI',
    client_id: '341678844265-5ak3e1c5eiaglb2h9ortqbs9q57ro6gb.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com/auth/plus.login https://www.googleapis.com/auth/userinfo.email',
    immediate: true
};
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
var socket, xmlhttp, userID;

function appLogin () {
    if (!innerzon.serverOnline) {
        return;
    }

    var username = $('#username').val();
    var password = $('#password').val();
    var remember = $('#save-password').val();

    if (!username || !password) {
        if (!username) {
            $('div[data-position-to=#username]').popup('open');
        } else if (!password) {
            $('div[data-position-to=#password]').popup('open');
        }
        return;
    }

    emitAppSignin({
        username: username,
        password: password,
        remember: remember
    });
} // appLogin
function appLogout (appOnly) {
    var fnSignInPage = function(){
        userID = null;
        $.removeCookie('userID');
        $.removeCookie('accessToken');
        $.removeCookie('loggedBy');
        $.mobile.changePage('#page-sign-in', {
            transition: 'flip',
            reverse: true
        });
    };
    fnSignInPage();
} // appLogout

function fbLogin () {
    if (!window.onLine) {
        return;
    }

    $('#page-sign-in').animate({opacity:0.4}, 800);
    $.mobile.loading('show', {
        text: 'Sign in with Facebook',
        textVisible: true,
        theme: 'a'
    });

    FB.login(function(res){
            if (res.status == 'connected'){
                /*$.cookie.json = true;
                $.cookie('fb.authResponse', res.authResponse, {
                    expires: addSec2DateObj(res.authResponse.expiresIn)
                });*/
                var dateObj = addSec2DateObj(res.authResponse.expiresIn);
                $.cookie('userID', res.authResponse.userID, { expires: dateObj });
                $.cookie('loggedBy', 'facebook', { expires: dateObj });

                userID  = res.authResponse.userID;
                var fql = 'SELECT email, first_name, last_name, name, username ' +
                          'FROM user WHERE uid ='+userID;
                FB.api({
                    method: 'fql.query',
                    query: fql
                }, function(data) {
                    if (!data || data.error || _.isUndefined(data[0])) {
                        innerzon.debug('Error occurred', 'err');
                    } else {
                        var client = {
                            username: data[0].email,
                            fullname: data[0].name,
                            services: {
                                facebook: res.authResponse
                            }
                        };
                        emitFBSignin(client);
                    }
                });
            } else {
                innerzon.debug('User cancel the login process');
                statusNotifier('The sign in process has been cancelled', 'a', 3000, function(){
                    $('#page-sign-in').animate({opacity:1}, 800);
                });
            }
        }, {
            scope: 'email,user_location,user_online_presence,read_stream'//,publish_stream'
        }
    );
} // fbLogin
function fbLogout (appOnly) {
    var fnSignInPage = function(){
        userID = null;
        $.removeCookie('userID');
        $.removeCookie('loggedBy');
        $.mobile.changePage('#page-sign-in', {
            transition: 'flip',
            reverse: true
        });
    };

    innerzon.gdebug('Facebook logout');

    if (_.isUndefined(appOnly)) { // logout from Facebook
        FB.logout(function(res) {
            userID = null;
            fnSignInPage();
            innerzon.debug('Logout user from facebook');
            innerzon.debug(res);
            innerzon.gdebug(false);
        });
    } else { // log out from our APP only
        FB.api('/me/permissions', 'delete', function(res) {
            userID = null;
            fnSignInPage();
            innerzon.debug('Logout App from facebook');
            innerzon.debug(res);
            innerzon.gdebug(false);
        });
    }
} // fbLogout

function gapiOnload () {
    innerzon.gdebug('Google API javascript client');
    innerzon.debug('Client library is loaded');
    gapi.client.setApiKey(glParams.apiKey);

    innerzon.debug('Getting authorize result from google..');
    window.setTimeout(function(){ // check authorization
        gapi.auth.authorize(glParams, function(authResult){
            innerzon.debug(authResult);

            if (userID) {
                innerzon.debug('User was logged before by Google+');
            } else if (authResult && !authResult.error) {
                innerzon.debug('User has just logged with Google+');
                if (!window.location.hash){ // in loading page
                    $.mobile.changePage('#home', {
                        transition: 'pop'
                    });
                }
            } else {
                innerzon.debug('User has not sign-in with Google+');
                if (window.location.hash != '#page-sign-in') {
                    $.mobile.changePage('#page-sign-in', {
                        transition: 'pop'
                    });
                }
            }

            $('a.google').css('opacity', 1).removeClass('disallowed');
            $('a.googleGlass').css('opacity', 1).removeClass('disallowed');
            $('a.google span.text').html('Sign in with <b>Google</b>');

            innerzon.gdebug(false);
        });
    }, 1);
} // gapiOnload
function glLogin (service) {
    if (!window.onLine || $('a.google').hasClass('disallowed')) {
        return;
    }
    if (_.isUndefined(service)) {
        var scope = glParams.scope;
    } else if (service == 'glass') {
        var scope = glParams.scope+' https://www.googleapis.com/auth/glass.timeline';
    } else {
        var scope = glParams.scope;
    }

    $('#page-sign-in').animate({opacity:0.4}, 800);
    $.mobile.loading('show', {
        text: 'Sign in with Google+',
        textVisible: true,
        theme: 'a'
    });

    var config = {
        'client_id': glParams.client_id,
        'scope': scope
    };
    var token;

    gapi.auth.authorize(config, function(){
        token = gapi.auth.getToken();
        innerzon.debug('Google authorization callback');
        innerzon.debug(token);

        if (!token) {
            statusNotifier('The sign in process has been cancelled', 'a', 3000, function(){
                $('#page-sign-in').animate({opacity:1}, 800);
            });
        } else {
            var dateObj = addSec2DateObj(token.expires_in);

            gapi.client.load('plus', 'v1', function() {
                gapi.client.plus.people.get({
                    userId: 'me',
                    fields: 'id,displayName,emails,image,name,nickname'
                }).execute(function(res) {
                    $.cookie('userID', res.id, { expires:dateObj });
                    $.cookie('loggedBy', 'google', { expires:dateObj });

                    userID = res.id;

                    var client = {
                        username: res.emails[0].value,
                        fullname: res.displayName,
                        services: {
                            google: token
                        }
                    };
                    emitGLSignin(client);
                });
            });
        }
    });
    $(window).one('focus',function(){
        setTimeout(function(){
            if (!token) {
                statusNotifier('The sign in process has been cancelled', 'a', 3000, function(){
                    $('#page-sign-in').animate({opacity:1}, 800);
                });
            }
        }, 300);
    });
} // glLogin
function glLogout () {
    var token        = gapi.auth.getToken();
    var fnSignInPage = function(){
        userID = null;
        $.removeCookie('userID');
        $.removeCookie('loggedBy');
        $.mobile.loading('hide');
        $.mobile.changePage('#page-sign-in', {
            transition: 'flip',
            reverse: true
        });
    };

    innerzon.gdebug('Google logout');
    $.mobile.loading('show', {
        text: 'Logging out Google+..',
        textVisible: true,
        theme: 'a'
    });

    $.ajax({
        type: 'GET',
        url: 'https://accounts.google.com/o/oauth2/revoke?token='+token.access_token,
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function(res) {
            innerzon.debug('Logout App from google');
            innerzon.debug(res);
            innerzon.gdebug(false);
            fnSignInPage();
        },
        error: function(e) {
            innerzon.debug('Fail logout App from google');
            innerzon.debug(e);
            innerzon.gdebug(false);
            statusNotifier('Fail logout from google. Please try again', 'a', 3000);
        }
    });
} // glLogout
function makeRequest () {
    gapi.client.load('mirror', 'v1', function() {
        var request = gapi.client.mirror.timeline.list({
            includeDeleted: true,
            maxResults: 5,
            fields: 'items(created,displayTime,id,location,notification,text,title,updated)'
        });
        request.execute(function(err, res) {
            if (err) {
                innerzon.debug(err, 'err');
                return;
            }

            _.each(res, function(o){
                innerzon.debug(o);
            });
        });
    });
} // makeRequest

function loggedSuccess () {
    var id = userID ? userID : $.cookie('userID');
    socket.emit('user logged', {
        clientId: id
    });
} // loggedSuccess
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
                innerzon.debug('Close notification after '+time+' '+title);
                ntf.cancel();
            }, time);
            innerzon.debug('Display notification '+title);
        };
        ntf.onclose = function() {
            innerzon.debug('Close notification');
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

function initSidePanel () {
    $('nav.sidepanel').removeClass('hide');
    $('nav#location').mmenu({
        classes: 'mm-light',
        counters: false,
        dragOpen: {
            open: true
        },
        slidingSubmenus: false
    }).on('opening.mm', absPositionHeader).on('closed.mm', function(){
        $('div.header').css({
            position: 'fixed',
            top: 0,
            left: 0
        });
    });

    $('nav.sidepanel li.location a').click(function(){
        $('nav.sidepanel li.location').removeClass('mm-active');
        $(this).parent('li').addClass('mm-active');
    });
} // initSidePanel

function absPositionHeader () {
    var top = $('div.mm-page').scrollTop();

    $('div.header').css({
        position: 'absolute',
        top: top+'px',
        left: '0'
    });
} // absPositionHeader

function cloneHeader (page, title) {
    $('#header-tpl div.row').clone(true).appendTo('#page-'+page+' div[data-role=header]');
    $('#page-'+page+' div.header').attr('data-theme', 'c');
    $('#page-'+page+' h3.headerTitle').html(title);
} // cloneHeader

function updateAppOnlineStatus () {
    if (innerzon.serverOnline) { // server is connected
        $('.connection').removeClass('text-danger text-default').addClass('text-success').html('Connected');
        $('div.header span.i-server').removeClass('ico-cloud '+_statusCls).addClass('ico-upload-cloud text-success');
        if (_wsProcess.indexOf('connecting_websocket') < 0 && !socket.socket.connected) { // attempt reconnect socket if socket has disconnected
            socket.socket.connect();
        }
    } else {
        $('div.header span.i-server').removeClass('ico-upload-cloud '+_statusCls).addClass('ico-cloud text-muted');
        $('div.header span.i-hardware').removeClass(_statusCls).addClass('text-muted');
        $('div.header span.i-lock').removeClass(_statusCls).addClass('text-muted').show();
        $('div.header span.i-health').removeClass(_statusCls).addClass('text-muted').show();
        $('div.header span.i-emergency').hide();
        $('div.header span.i-troubles').hide();
        disableLightsUpdate();
    }

    if (window.onLine) { // internet is connected
        $('div.header span.i-internet').removeClass(_statusCls).addClass('text-success');
    } else {
        $('div.header span.i-internet').removeClass(_statusCls).addClass('text-danger');
    }
} // updateAppOnlineStatus

function appUpdateFailureTimer (type, cancelUpdate) {
    _timer[type] = setTimeout(function(){
        innerzon.debug('Update of ['+type+'] failure..');
        cancelUpdate();
    }, 5000);
} // appUpdateFailureTimer


function updateDeviceStatus (data) {
    if (data.deviceId) { // device is online
        $('div.header span.i-hardware').removeClass(_statusCls).addClass('text-success');
        $('.status').removeClass('text-danger text-default').addClass('text-success').html(data.info.pn+' connected');
        $('#page-security div.armBtnWrap').show();
    } else {
        $('div.header span.i-hardware').removeClass(_statusCls).addClass('text-danger');
    }

    updateAlarmStatus();
    updateZones();
    updateTroubles();
    updateSystemStatus();
    updateLights();
} // updateDeviceStatus

function updateAlarmStatus (alert) {
    var color, info, txt;
    var rdr  = $('#page-security').attr('data-render');
    var cls  = _statusCls;
    var thm  = 'b';
    var ptid = 1;
    var sts  = null;

    _.each(_data.status.partition, function(str){
        info = str.split(',');
        if (ptid == info[0]) {
            sts = info[1];
        }
    });

    if (sts == '1' || sts == '2' || sts == '3') { // alarm currently armed
        thm   = 'e';
        color = 'text-success';

        if (sts == '1') {
            txt = 'Armed Away';
        } else if (sts == '2') {
            txt = 'Home Armed';
        } else if (sts == '3') {
            txt = 'Night Armed';
        }

        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-lock');
        $('#page-security a.armBtn span.armTxt').html(txt+' - Press to Disamed');

        $('span.i-lock').removeClass(cls+' ico-lock-open').addClass(color+' ico-lock').show();
    } else if (sts == '0') { // alarm currently disarmed
        txt   = 'Disarmed';
        color = 'text-warning';

        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
        $('#page-security a.armBtn span.armTxt').html('Disarmed - Press to Arm');

        $('span.i-lock').removeClass(cls+' ico-lock').addClass(color+' ico-lock-open').show();
    } else if (sts == 'p') { // TODO(remove): panic shouldn't appear here?
        txt   = 'Panic';
        color = 'text-danger';

        $('#page-security a.armBtn span.glyphicon').attr('class', 'glyphicon glyphicon-warning-sign');
        $('#page-security a.armBtn span.armTxt').html('Panic - Press to Arm');

        $('span.i-emergency').removeClass(cls).addClass(color).show();
    }

    $('.armStatus').removeClass(cls).addClass(color).html(txt);
    $('#page-security a.armBtn').attr('data-status', sts);

    if (rdr == '1') { // page is rendered by jQuerymobile
        //$('#page-security a.armBtn').button('refresh');
        $('#page-security a.armBtn').buttonMarkup({ theme:thm });
    } else {
        $('#page-security a.armBtn').attr('data-theme', thm);
    }

    if (!_.isUndefined(alert) || alert) {
        notification('Alarm Status', 'Alarm status is now changed to '+txt);
    }
} // updateAlarmStatus

function updateZones () {
    var cls, con, info, id, no, pt, s1, s2, stt, thm, ty;
    var serialNo = _data.info.sn;
    var ptid     = 1;
    var pts      = {};
    var listview = '';
    var liHtml   = '';

    _.each(_data.status.zones, function(str){
        info = str.split(',');

        no = info[0];
        id = 'zn'+no;
        s1 = ' selected';
        s2 = '';
        pt = info[3];
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

        if (_.isUndefined(pts[pt])) {
            pts[pt] = [no];
        } else {
            pts[pt].push(no);
        }

        if (pt > 1) { // TODO(Partition): currently only show partition 1, future version show all available partitions
            return;
        }

        listview += '<li data-theme="'+thm+'" class="'+id+'"><img data-src="holder.js/80x80" alt="..." class="ui-li-thumb" />' +
                    '<h3>Zone '+no+' <span class="pl5 s12">'+ty+'</span></h3><p>'+con+'</p><span class="ui-li-aside">' +
                    '<div data-role="fieldcontain" data-status="'+info[2]+'" class="bypass" style="display:none;">' +
                    '<select name="'+id+'" id="bp'+no+'" data-no="'+no+'" data-theme="d" data-role="slider">' +
                    '<option value="0"'+s1+'>Open</option><option value="1"'+s2+'>Bypass</option></select>' +
                    '</div></span></li>';
    });

    $('#page-security ul[data-role=listview]').html(listview);
    $('#page-security ul[data-role=listview] li select[data-role=slider]').on('slidestop', function(e, ui){
        var info;
        var no  = $(e.target).attr('data-no');
        var cmd = $(e.target).val();

        if (cmd == '1') {
            $('li.zn'+no+' p.ui-li-desc').html('Open<span class="p5"> - </span><span class="text-success zoneStatus">Bypass</span>');
        } else {
            $('li.zn'+no+' p.ui-li-desc').html('Open');
        }

        _.each(_data.status.zones, function(str,i){
            info = str.split(',');
            if (info[0] == no) {
                info[2] = (cmd == '1') ? 2 : 0;
                _data.status.zones[i] = info.join(',');
            }
        });
        socket.emit('app update', 'zone', {
            no: no,
            cmd: cmd
        });
    });
    Holder.run();

    if ($('#page-security.ui-page').length) { // page already rendered
        $('#page-security').trigger('create');
        $('#page-security ul[data-role=listview]').listview('refresh');
    }


    if (_.keys(pts).length == 1) {
        liHtml = '<li class="security"><em class="mm-counter">'+pts['1'].length+'</em>' +
                 '<a href="#page-security" class="ico-megaphone"> Security Status</a></li>';
    } else {
        _.each(pts, function(zones, i){
            liHtml += '<li class="security"><em class="mm-counter">'+zones.length+'</em>' +
                      '<a href="#page-security/p'+i+'" class="ico-megaphone"> Security Partition '+i+'</a></li>';
        });
    }

    $('#location ul.sn li.security').remove();
    $('#location ul.sn').prepend(liHtml);
    $('#home span.totalZones').html(pts[ptid].length);
    initSidePanel();
} // updateZones

function updateSystemStatus () {
    var css, info, sts, type;
    var html  = '';
    var cls   = 'text-success text-danger text-warning text-muted';
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
        $('div.header span.i-health').hide();
        $('span.i-troubles').removeClass(cls+' ico-gauge ico-stethoscope').addClass('ico-warning-empty text-danger').show();
    } else if (fault) {
        $('div.header span.i-health').hide();
        $('span.i-health').removeClass(cls+' ico-gauge ico-warning-empty').addClass('ico-stethoscope text-warning').show();
    } else {
        $('div.header span.i-troubles').hide();
        $('span.i-health').removeClass(cls+' ico-stethoscope ico-warning-empty').addClass('ico-gauge text-success').show();
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

function checkPattern () {
    $('div.patternlocklinehorizontal').css('visibility', 'hidden');
    $('div.patternlocklinevertical').css('visibility', 'hidden');
    $('div.patternlocklinediagonalforward').css('visibility', 'hidden');
    $('div.patternlocklinediagonalbackwards').css('visibility', 'hidden');
    $('div.patternlockbuttoncontainer div.patternlockbutton').removeClass('touched multiple');

    // TODO(validate): check if pattern draw correctly
    armDisarmed();

    return false;
} // checkPattern

function armDisarmed () {
    var info;
    var sts  = null;
    var ptid = 1;

    _.each(_data.status.partition, function(str){
        info = str.split(',');
        if (ptid == info[0]) {
            sts = info[1];
        }
    });

    if (sts == '0' || sts == 0) { // do arm process
        // TODO(secure update): check current zones status if it can really arm

        $('div.patternArm').hide();

        armCountdown(5);
        $.mobile.loading('show', {
            text: 'Arm in 10 seconds...',
            textVisible: true,
            theme: 'a'
        });
        $('#page-how-to-arm div.countdown').fadeIn();
    } else { // do disarmed process
        socket.emit('app update', 'partition', {
            no: ptid,
            cmd: 0,
            password: $('#patternlock').val()
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
    }
} // armDisarmed

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
        var armType = '1';
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
        socket.emit('app update', 'partition', {
            no: 1,
            cmd: armType,
            password: $('#patternlock').val()
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

    if (window.onLine) {
        imgObj.src = url;
    }
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
    var info, no, opts, type, status, value, user, tpl;
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

        if (type == 2) { // dimmable light
            tpl = $(html2);

            if (!_data.deviceId || status == 0) { // device is not online or dimmable light in off mode, disabled by default
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

        opts = {
            id: 'lightSwitch'+no,
            'data-no': no
        };
        if (!_data.deviceId) { // device is not online, disabled by default
            opts.disabled = 'disabled';
        }

        tpl.attr('data-id', 'li'+no);
        tpl.find('h3.listTitle').append(type);
        tpl.find('select[data-role=slider]').attr(opts);
        tpl.find('select[data-role=slider]').val(status); // light on/off
        tpl.appendTo('#page-lights ul[data-role=listview]');
    });

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

function disableLightsUpdate (no) {
    if ($('#page-lights.ui-page').length == 0) { // the page is not rendered yet
        return;
    }

    if (!_.isUndefined(no) && no) {
        $('#page-lights li[data-id=li'+no+'] select[data-role=slider]').slider('disable');
        $('#page-lights li[data-id=li'+no+']').find('div.slider input').slider('disable').addClass('ui-disabled');
    } else {
        $('#page-lights li select[data-role=slider]').slider('disable');
        $('#page-lights li').find('div.slider input').slider('disable').addClass('ui-disabled');
    }
} // disableLightsUpdate

function resRegistered (data) {
    _.pull(_wsProcess, 'register');
    $('#register-btn').parent().find('span.ui-btn-text').html('<span class="ico-user-add"></span> Register');

    if (!data.status) {
        $('#register-btn').button('enable');

        if (data.errMessage) {
            statusNotifier(data.errMessage, 'e', 3000);
        }
        if (data.usernameTaken) {
            $('div[data-position-to=#reg-username] span.msg').html('The username is already been taken, please try another..');
            $('div[data-position-to=#reg-username]').popup('open');
        }
        return;
    }

    statusNotifier('Registration has done successfully! You may login now', 'a', 2500, function(){
        $('#username').val($('#reg-username').val());
        $('#register-btn').button('enable');
        window.history.back();
        setTimeout(function(){
            $('#password').focus()
        }, 1000);
    });
} // resRegistered

function resAppLogin (data) {
    $.mobile.loading('hide');

    if (data.status) { // user logged using app and proceed to home page
        userID = data.info.userId;

        var dateObj = addSec2DateObj(data.info.expiresIn);
        $.cookie('userID', userID, { expires: dateObj });
        $.cookie('accessToken', data.info.accessToken, { expires: dateObj });
        $.cookie('loggedBy', 'app', { expires: dateObj });

        $.mobile.changePage('#home', {
            transition: 'flip'
        });
        $('#password').val('');
    } else {
        if (!_.isUndefined(data.field)) {
            $('#'+data.field).focus();
            $('div[data-position-to=#'+data.field+'] span.msg').html(data.message);
            $('div[data-position-to=#'+data.field+']').popup('open');
        } else if (!_.isUndefined(data.message)) {
            statusNotifier(data.message, 'e', 3000);
        }
    }
} // resAppLogin

function resFbSignIn (data) {
    $('#page-sign-in').animate({opacity:1}, 800);
    $.mobile.loading('hide');

    if (data.status) { // user logged with Facebook and proceed to home page
        $.mobile.changePage('#home', {
            transition: 'flip'
        });
    } else {
        statusNotifier(data.message, 'e', 3000);
    }
} // resFbSignIn

function resGlSignIn (data) {
    $('#page-sign-in').animate({opacity:1}, 800);
    $.mobile.loading('hide');

    if (data.status) { // user logged with Google and proceed to home page
        $.mobile.changePage('#home', {
            transition: 'flip'
        });
    } else {
        statusNotifier(data.message, 'e', 3000);
    }
} // resGlSignIn


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

function emitRegistration (data) {
    $('#register-btn').button('disable');
    $('#register-btn').parent().find('span.ui-btn-text').html('<span class="ico-spin4 animate-spin"></span> Sending..');
    _wsProcess.push('register');
    socket.emit('app request', 'register', data);

    setTimeout(function(){ // timeout in 5 seconds
        if (_wsProcess.indexOf('register') >= 0) { // mission incomplete
            $('#register-btn').button('enable');
            $('#register-btn').parent().find('span.ui-btn-text').html('<span class="ico-user-add"></span> Register');
        }
    }, 5000);
} // emitRegistration

function emitAppSignin (data) {
    $.mobile.loading('show', {
        text: 'Logging..',
        textVisible: true,
        theme: 'a'
    });
    socket.emit('app request', 'app signin', data);
} // emitAppSignin

function emitFBSignin (data) {
    socket.emit('app request', 'fb signin', data);
} // emitFBSignin

function emitGLSignin (data) {
    socket.emit('app request', 'gl signin', data);
} // emitGLSignin


function isOffline () {
    innerzon.debug('Check if server offline');
    innerzon.serverOnline = false; // make a test if server really down

    checkServer();
    checkInternet();
    setTimeout(function(){
        if (window.onLine == false) {
            innerzon.debug('Confirm client is disconnected from internet', 'err');
            $(window).trigger('offline'); // confirm internet is offline now, trigger offline event
            $(window).trigger('internetOff');
        } else if (innerzon.serverOnline == false) {
            innerzon.debug('Confirm server is offline', 'err');
            $(window).trigger('offline'); // confirm server is offline now, trigger offline event
        }
    }, 3000);
} // isOffline

function checkServer (loop) {
    if (!xmlhttp) {
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        } else {
            xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
        }
        xmlhttp.onreadystatechange = function(){
            if (xmlhttp.readyState==4 && xmlhttp.status==200){
                innerzon.debug('Server is online now');
                innerzon.serverOnline = true;
                $(window).trigger('online');
                _.pull(_wsProcess, 'checkServerStatus');
            }
        };
    }

    if (typeof loop == 'undefined' && _wsProcess.indexOf('checkServerStatus') >= 0) { // checking server status is in progress
        return;
    }
    if (_wsProcess.indexOf('checkServerStatus') < 0) {
        _wsProcess.push('checkServerStatus'); // register task name to progress list
    }

    xmlhttp.open('GET', 'js/online.status.js?t='+(new Date).getTime(), true);
    xmlhttp.send();

    setTimeout(function(){
        if (!innerzon.serverOnline) { // server still down
            checkServer(true);
        }
    }, 3000);
} // checkServer

function checkInternet (loop) {
    if (typeof loop == 'undefined' && _wsProcess.indexOf('checkInternet') >= 0) { // checking internet status is in progress
        return;
    }
    if (_wsProcess.indexOf('checkInternet') < 0) {
        _wsProcess.push('checkInternet'); // register task name to progress list
    }

    $('#internetChecker').one('load', function(){
        innerzon.debug('Client has internet connectivity now');
        $(window).trigger('online');
        $(window).trigger('internetOn');
        window.onLine = true;
    }).attr('src', 'https://developers.google.com/_static/images/silhouette36.png?t='+(new Date).getTime());

    setTimeout(function(){
        if (!window.onLine) { // internet still down
            checkInternet(true);
        }
    }, 3000);
} // checkInternet

function validationPopup (page) {
    $('#'+page+' div.errPop').popup({
        history: false,
        shadow: false,
        theme: 'e',
        transition: 'flow',
        afterclose: function(){
            var id = $(this).attr('data-position-to');
            $(id).focus().select();
        }
    });
    $('#'+page+' div.errPop a').buttonMarkup({
        icon: 'delete',
        iconpos: 'notext',
        theme: 'e'
    });
} // validationPopup

function statusNotifier (text, theme, closeInSec, callback) {
    $.mobile.loading('show', {
        text: text,
        textVisible: true,
        textonly: true,
        theme: theme
    });

    if (_.isUndefined(closeInSec)) {
        return;
    }
    if (_.isUndefined(callback)) {
        callback = null;
    }

    setTimeout(function(){
        $.mobile.loading('hide');
        callback && callback();
    }, closeInSec);
} // statusNotifier

function getUrlVars () {
    var vars  = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
} // getUrlVars

function pad (number, length) {
    var str = '' + number;

    while (str.length < length) {
        str = '0' + str;
    }

    return str;
} // pad

function addSec2DateObj (seconds) {
    var d = new Date();
    var n = d.getTime() + (seconds * 1000);

    d.setTime(n);
    return d;
} // addSec2DateObj


function init () {
    var icoOnline  = 'ico-upload-cloud ';
    var icoOffline = 'ico-cloud ';

    _wsProcess.push('connecting_websocket');

    socket = io.connect('http://'+document.domain+':'+window.location.port, {
        'max reconnection attempts': 100
    });

    socket.on('error', function(){
        _.pull(_wsProcess, 'connecting_websocket');
        isOffline();
    });
    socket.on('connect', function(){
        _.pull(_wsProcess, 'connecting_websocket');
        $('.connection').removeClass(_statusCls).addClass('text-success').html('Connected');
        $('div.header span.i-server').removeClass(icoOffline+_statusCls).addClass(icoOnline+'text-success');
    });
    socket.on('connecting', function(){
        _wsProcess.push('connecting_websocket');
        $('.connection').removeClass(_statusCls).addClass('text-default').html('Connecting..');
        $('div.header span.i-server').removeClass(icoOnline+_statusCls).addClass(icoOffline+'text-warning');
    });
    socket.on('connect_failed', function(){
        _.pull(_wsProcess, 'connecting_websocket');
        isOffline();
    });
    socket.on('disconnect', function(){
        $('#page-security div.armBtnWrap').hide();
        $('.troubles').removeClass(_statusCls).addClass('text-warning').html('Unavailable');
        $('.status').removeClass(_statusCls).addClass('text-warning').html('Unavailable');
        $('.connection').removeClass(_statusCls).addClass('text-danger').html('Disconnected');

        notification('Server Offline', 'Server is currently detected offline, this may due to scheduled maintenance.', 10000);
        isOffline();
    });
    socket.on('reconnect', function(){
        _.pull(_wsProcess, 'connecting_websocket');
        loggedSuccess();
        notification('Server Online', 'Server is detected back to online now, this may due to maintenance completed.', 10000);
        $('div.header span.i-server').removeClass(icoOffline+_statusCls).addClass(icoOnline+'text-success');
        isOffline();
    });
    socket.on('reconnect_failed', function(){
        _.pull(_wsProcess, 'connecting_websocket');
        isOffline();
    });

    socket.on('DeviceInformation', function(data){
        _data = data;
        updateDeviceStatus(data);
    });
    socket.on('Offline', function(data){
        $('#page-security div.armBtnWrap').hide();
        $('div.header span.i-hardware').removeClass(_statusCls).addClass('text-danger');

        $('.status').removeClass('text-success text-default').addClass('text-danger').html('Disconnected');

        disableLightsUpdate();
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
            updateAlarmStatus(true);
        } else if (d.type == 'lights') {
            updateLights();
        }
    });
    socket.on('ResponseOnRequest', function(req, data){
        if (req == 'register') {
            resRegistered(data);
        } else if (req == 'app signin') {
            resAppLogin(data);
        } else if (req == 'fb signin') {
            resFbSignIn(data);
        } else if (req == 'gl signin') {
            resGlSignIn(data);
        }
    });
    socket.on('AES', function(data){
        var cmd, info, sts, txt;

        _.each(_data.status.partition, function(str){
            info = str.split(',');
            if (1 == info[0]) {
                sts = info[1];
            }
        });

        if (sts == '1' || sts == '2' || sts == '3') {
            txt = 'Disarmed in 2 seconds';
            cmd = 0;
        } else {
            txt = 'Armed in 2 seconds';
            cmd = 1;
        }
        txt = '';

        $.mobile.loading('show', {
            html: '<h1>I have knew your secret! <div class="text-danger">"'+data+'"</div>'+txt+'</h1>',
            textVisible: true,
            textonly: true,
            theme: 'e'
        });
        setTimeout(function(){
            /*socket.emit('app update', 'partition', {
                no: 1,
                cmd: cmd,
                password: data
            });*/
            $.mobile.loading('hide');
        }, 2000);
    });


    // Sign In //
    if (!$.mobile.path.get()) {
        $('#username').focus();
    }
    $('#page-sign-in').on('pagecreate', function(){
        $.mobile.defaultPageTransition = 'pop';
        validationPopup('page-sign-in');
    }).on('pageshow', function(){
        $.mobile.defaultPageTransition = _transition;
        $('#username').focus();
    });


    $(document).on('pagebeforechange', function(e, data){
        if (typeof data.toPage === 'string') {
            var obj = $.mobile.path.parseUrl(data.toPage);

            innerzon.gdebug('Page before change controller');
            innerzon.debug('Hash: '+obj.hash);

            if (userID) {
                innerzon.debug('User is logged');
                if (!obj.hash || obj.hash == '#page-sign-in' || obj.hash == '#page-register') {
                    innerzon.debug('User should not in loading/sign-in/registration page','warn');
                    e.preventDefault();
                    $.mobile.urlHistory.ignoreNextHashChange = true;
                    window.location.hash = '#home';
                }
            } else if (obj.hash == '#page-sign-in' || obj.hash == '#page-register') {
                innerzon.debug('Go to sign in/registration page');
            } else {
                innerzon.debug('Note user they have not logged, can not browser any other page', 'warn');
                e.preventDefault();
                $.mobile.urlHistory.ignoreNextHashChange = true;
                window.location.hash = '#page-sign-in';
            }

            innerzon.gdebug(false);
        }
    });

    // Register //
    $('#page-register').on('pagecreate', function(){
        $('#page-register div.errPop').popup({
            history: false,
            shadow: false,
            theme: 'e',
            transition: 'flow',
            afterclose: function(){
                var id = $(this).attr('data-position-to');
                $(id).focus().select();
            }
        });
        $('#page-register div.errPop a').buttonMarkup({
            icon: 'delete',
            iconpos: 'notext',
            theme: 'e'
        });
        $('#register-btn').click(function(){
            var username = $('#reg-username').val();
            var password = $('#reg-password').val();
            var fullname = $('#reg-fullname').val();

            if (!username || !password || !fullname) {
                if (!username) {
                    $('div[data-position-to=#reg-username] span.msg').html('...Please enter your email here...');
                    $('div[data-position-to=#reg-username]').popup('open');
                } else if (!password) {
                    $('div[data-position-to=#reg-password]').popup('open');
                } else if (!fullname) {
                    $('div[data-position-to=#reg-fullname]').popup('open');
                }
                return;
            }

            emitRegistration({
                username: username,
                password: password,
                fullname: fullname
            });
        });
    }).on('pageshow', function(){
        $('#reg-username').focus();
    });

    // HOME PAGE //
    $('#home').on('pagebeforecreate', function(){
        initSidePanel();
        $('nav#main-menu').mmenu({
            counters: false,
            dragOpen: {
                open: true
            },
            position: 'right',
            zposition: 'front',
            slidingSubmenus: false
        });
    }).on('pagecreate', function(){
        var startX = 0;
        var valid  = false;

        loggedSuccess();

        $('div.mm-page').on('dragright', function(e){
            if (startX == 0) {
                startX = e.gesture.center.pageX;
                if (startX < 150) {
                    valid = true;
                }
            } else if (valid) {
                if (e.gesture.center.pageX - startX >= 40) {
                    valid = false;
                    absPositionHeader();
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
    }).on('pageshow', function(){
        $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
        $('nav.sidepanel ul li:first').addClass('mm-selected');
        $('nav.sidepanel li.location:first').addClass('mm-active');
    });

    // SECURITY PAGE //
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
                    $('body').addClass('ui-overlay-a');
                    $.mobile.changePage('#dialog-alert-opened-zones', {
                        role: 'dialog',
                        transition: 'slidedown'
                    });
                } else {
                    $.mobile.changePage('#page-how-to-arm');
                }
            } else {
                $.mobile.changePage('#page-how-to-arm');
            }

            $.mobile.defaultPageTransition = _transition;
        });
    }).on('pageshow', function(){
        $('body').removeClass('ui-overlay-a');
        $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
        $('nav.sidepanel ul li.security').addClass('mm-selected');
    }).on('pagehide', function(){
        var url = jQuery.mobile.path.get();
        if (url != 'page-how-to-arm' && url.indexOf('&ui-state=dialog') == -1) {
            $('#page-security ul[data-role=listview] div.bypass').hide();
        }
    });

    // HOW TO ARM PAGE //
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

        $('div.patternArm').show();

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
        if (_countDown) { // in arm count down process, leave page make cancel of arming
            _cancelArm = true;
        }
        $('#page-how-to-arm input.passcode').val('');
        $('#page-how-to-arm div.countdown').hide();
    });

    // SYSTEM STATUS PAGE //
    $('#page-system-status').on('pagecreate', function(){
        cloneHeader('system-status', 'System Status');
    }).on('pageshow', function(){
        $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
        $('nav.sidepanel ul li.system-status').addClass('mm-selected');
    });

    // ALARM PAGE //
    $('#page-alarm').on('pagecreate', function(){
        cloneHeader('alarm', 'Alarm');
    }).on('pageshow', function(){
        $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
        $('nav.sidepanel ul li.alarm').addClass('mm-selected');
    });

    // CAMERAS PAGE //
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

    // CAMERA PAGE //
    $('#page-camera').on('pagebeforecreate', function(){
        var url = 'http://cheah.homeip.net:81/snapshot.cgi?loginuse=cheah&loginpas=jumpkne';
        $('#page-camera div.cameraWrap img.cam').attr('src', url);
    }).on('pageshow', function(){
        _loadCam = true;
        loadCamera();
    }).on('pagehide', function(){
        _loadCam = false;
    });

    // LIGHTS PAGE //
    $('#page-lights').on('pagecreate', function(){
        cloneHeader('lights', 'Lights');
    }).on('pageshow', function(){
        $('nav.sidepanel ul li').removeClass('mm-active mm-selected');
        $('nav.sidepanel ul li.lights').addClass('mm-selected');
    });

    // EVENT LOGS //
    $('#page-history').on('pagecreate', function(){
        cloneHeader('history', 'Event Logs');
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
                $.mobile.loading('show', {
                    text: 'Arm in 10 seconds...',
                    textVisible: true,
                    theme: 'a'
                });
                $('#page-how-to-arm div.countdown').fadeIn();
            }

            $(this).blur();
        } else {
            $('#page-how-to-arm #code'+i).val('').focus();
        }
    });

    $('#page-camera img.cam').on('load', function(){
        _camLoaded = true;
    });
} // init


$(function() {
    userID = $.cookie('userID');
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
    $('#body').fadeIn();

    init();
    isOffline();

    $('#login').click(appLogin);
    $('a.facebook').click(fbLogin);
    $('a.google').click(function(){
        glLogin();
    });
    $('a.googleGlass').click(function(){
        glLogin('glass');
    });
    $('a.i-logout').click(function(){
        var loggedBy = $.cookie('loggedBy');

        if (loggedBy == 'app') {
            appLogout();
        } else if (loggedBy == 'facebook') {
            fbLogout(true);
        } else if (loggedBy == 'google') {
            glLogout();
        }
    });

    var internetStatusFn = function(status){
        if (status) {
            $('a.facebook').css('opacity', 1).removeClass('disallowed');
            $('a.google').css('opacity', 1).removeClass('disallowed');
            $('a.googleGlass').css('opacity', 1).removeClass('disallowed');
            $('a.i-logout').css('opacity', 1).removeClass('disallowed');
        } else {
            $('a.facebook').css('opacity', 0.4).addClass('disallowed');
            $('a.google').css('opacity', 0.4).addClass('disallowed');
            $('a.googleGlass').css('opacity', 0.4).addClass('disallowed');
            $('a.i-logout').css('opacity', 0.4).addClass('disallowed');
        }
    };
    internetStatusFn(false);
    var internetOkFn = function(){
        FB.init(fbParams);
        FB.getLoginStatus(function(res){
            if (res.status === 'connected') {
                userID = res.authResponse.userID;

                if (!window.location.hash){ // in loading page
                    $.mobile.changePage('#home', {
                        transition: 'pop'
                    });
                }
            } else if (res.status === 'not_authorized') {
                if (window.location.hash != '#page-sign-in') {
                    $.mobile.changePage('#page-sign-in', {
                        transition: 'pop'
                    });
                }
            } else { // the user isn't logged in to Facebook.
                if (window.location.hash != '#page-sign-in') {
                    $.mobile.changePage('#page-sign-in', {
                        transition: 'pop'
                    });
                }
            }
        });

        $('a.google').css('opacity', 0.4).addClass('disallowed');
        $('a.googleGlass').css('opacity', 0.4).addClass('disallowed');
        $('a.google span.text').html('Checking login status..');

        var po   = document.createElement('script');
        po.type  = 'text/javascript';
        po.async = true;
        po.src   = '//apis.google.com/js/client.js?onload=gapiOnload';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(po, s);
    };

    $(window).bind('online', updateAppOnlineStatus);
    $(window).bind('offline', updateAppOnlineStatus);
    $(window).on('internetOff', function(){
        internetStatusFn(false);
    });
    $(window).on('internetOn', function(){
        internetStatusFn(true);
    });

    if (window.onLine) {
        internetOkFn();
    } else {
        $(window).one('internetOn', internetOkFn);
    }
});