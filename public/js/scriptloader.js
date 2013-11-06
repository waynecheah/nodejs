(function(){
    var loader;
    var files = {
        css: [{
            online: '//fonts.googleapis.com/css?family=Open+Sans:300,400,700',
            offline: 'css/googlefont.css'
        }, {
            online: '//code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.min.css',
            offline: 'css/jquery.mobile-1.3.2.min.css'
        }, 'css/mmenu.all.css', 'css/patternlock.css', 'css/bootstrap.css', 'css/animation.css',
        'css/fontello.css', 'css/icons.css', 'css/style.css'],

        headJs: [{
            online: '//cdnjs.cloudflare.com/ajax/libs/modernizr/2.6.2/modernizr.min.js',
            offline: 'js/modernizr.min.js'
        }],

        footJs: [{
            online: '//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js',
            offline: 'js/jquery.min.js',
            testJs: 'window.jQuery'
        }, {
            online: '//code.jquery.com/mobile/1.3.2/jquery.mobile-1.3.2.min.js',
            offline: 'js/jquery.mobile-1.3.2.min.js',
            testJs: '$.mobile'
        }, {
            online: '//cdnjs.cloudflare.com/ajax/libs/hammer.js/1.0.5/jquery.hammer.min.js',
            offline: 'js/jquery.hammer.min.js'
        }, 'js/jquery.mmenu.min.all.js', 'js/patternlock.js', {
            online: '//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.2.1/lodash.min.js',
            offline: 'js/lodash.min.js'
        }, {
            online: '//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min.js',
            offline: 'js/socket.io.min.js'
        }, {
            online: '//cdnjs.cloudflare.com/ajax/libs/holder/2.0/holder.min.js',
            offline: 'js/holder.min.js'
        }, 'js/script.js']
    };
    var v = navigator.appVersion;

    if (v.indexOf('MSIE 7') >= 0 || v.indexOf('MSIE 6') >= 0 || v.indexOf('MSIE 5') >= 0) { // the fix for worse browser
        files.css.push('css/fontello-ie7.css');
        files.footJs = ['js/lte-ie7.js'].concat(files.footJs);
    }


    function loadFile (filename, filetype) {
        if (filetype == 'js') {
            var fileref = document.createElement('script');
            fileref.setAttribute('type', 'text/javascript');
            fileref.setAttribute('src', filename);
        } else if (filetype == 'css') {
            var fileref = document.createElement('link');
            fileref.setAttribute('rel', 'stylesheet');
            fileref.setAttribute('type', 'text/css');
            fileref.setAttribute('href', filename);
        }
        if (typeof fileref != 'undefined') {
            document.getElementsByTagName('head')[0].appendChild(fileref);
        }
    } // loadFile

    function loadJs (i) {
        var file;
        var js = files.footJs;

        if (typeof js[i] == 'string') {
            file = js[i];
        } else if (typeof js[i] == 'object') {
            if (window.onLine && loader.useOnline == true && typeof js[i].online == 'string') {
                file = js[i].online;
            } else if (typeof js[i].offline == 'string') {
                file = js[i].offline;
            }
        }

        var script = document.createElement('script');
        script.onload = function() {
            i++;
            if (js.length > i) {
                if (loader.useOnline == -1) {
                    loader.useOnline = true;
                }
                loader.loadJs(i, useOnline);
            }
        };
        script.onerror = function() {
            if (window.onLine && loader.useOnline == true && typeof js[i].offline == 'string') { // try offline file when CDN fail
                loader.useOnline = -1;
                loader.loadJs(i);
            }
        };
        script.src = file;
        document.getElementsByTagName('head')[0].appendChild(script);
    } // loadJs

    function loadFootJs () {
        var file, i, test;
        var js = files.footJs;

        for (i=0; i<js.length; i++) {
            if (typeof js[i] == 'string') {
                file = js[i];
            } else if (typeof js[i] == 'object') {
                if (window.onLine && loader.useOnline == true && typeof js[i].online == 'string') {
                    file = js[i].online;
                } else if (typeof js[i].offline == 'string') {
                    file = js[i].offline;
                }
            }

            document.write('<script src="'+file+'"><\/script>');
            if (loader.useOnline == true && typeof js[i].offline == 'string' && typeof js[i].testJs == 'string') {
                file = js[i].offline;
                test = js[i].testJs;
                document.write('<script>'+test+' || innerzone.loader.writeScript("'+file+'")</script>');
            }
        }
    } // loadFootJs

    function loadFiles (files, filetype) {
        var file, i;

        for (i=0; i<files.length; i++) {
            file = false;

            if (typeof files[i] == 'string') {
                file = files[i];
            } else if (typeof files[i] == 'object') {
                if (window.onLine && loader.useOnline == true && typeof files[i].online == 'string') {
                    file = files[i].online;
                } else if (typeof files[i].offline == 'string') {
                    file = files[i].offline;
                }
            }

            if (file) {
                loadFile(file, filetype);
            }
        }
    } // loadFiles


    (loader = {
        useOnline: false,

        loadCss: function(){
            loadFiles(files.css, 'css');
            this.loadHeadJs();
        }, // loadCss

        loadHeadJs: function(){
            loadFiles(files.headJs, 'js');
        }, // loadHeadJs

        loadFootJs: function(){
            loadFootJs();
        }, //loadFootJs

        writeScript: function(js){
            document.write('<script src="'+js+'"><\/script>');
        }, // writeScript

        getFootJs: function(){
            return files.footJs;
        } // getFootJs
    }).loadCss();

    return innerzone = { loader:loader };
}).call(this);