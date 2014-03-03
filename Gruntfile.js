'use strict';
var LIVERELOAD_PORT = 35729;
var SERVER_PORT     = 9000;

module.exports = function (grunt) {
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt, { pattern: ['grunt-*', '!grunt-contrib-sass'] });

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Define the configuration for all the tasks
    grunt.initConfig({

        // Project settings
        yeoman: {
            // Configurable paths
            app: 'app/mobile',
            dist: 'dist',
            tmp: '.tmp'
        },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            coffee: {
                files: ['<%= yeoman.app %>/scripts/{,*/}*.coffee'],
                tasks: ['coffee:server', 'jsbeautifier', 'jshint']
            },
            js: {
                files: ['<%= yeoman.app %>/scripts/vendor/{,*/}*.js'],
                tasks: ['newer:copy:scripts', 'jshint'],
                options: {
                    livereload: true
                }
            },
            gruntfile: {
                files: ['Gruntfile.js']
            },
            //compass: {
            //    files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
            //    tasks: ['compass:server', 'autoprefixer']
            //},
            sass: {
                files: ['<%= yeoman.app %>/styles/{,*/}*.{scss,sass}'],
                tasks: ['sass:server'] // for own working file, the code should already prefix to work with test browser
            },
            styles: {
                files: ['<%= yeoman.app %>/styles/{,*/}*.css'],
                tasks: ['newer:copy:styles', 'autoprefixer:server']
            },
            imagemin: {
                files: ['<%= yeoman.app %>/images/{,*/}*.{gif,jpeg,jpg,png}'],
                tasks: ['imagemin:server']
            },
            livereload: {
                options: {
                    livereload: '<%= connect.options.livereload %>'
                },
                files: [
                    '<%= yeoman.app %>/{,*/}*.html',
                    '<%= yeoman.tmp %>/css/{,*/}*.css',
                    '<%= yeoman.tmp %>/js/{,*/}*.js',
                    '<%= yeoman.app %>/images/{,*/}*.{gif,jpeg,jpg,png,svg,webp}',
                    '<%= yeoman.app %>/scripts/templates/*.{ejs,jade,mustache,hbs}'
                ]
            }
        },

        // The actual grunt server settings
        connect: {
            options: {
                port: SERVER_PORT,
                livereload: LIVERELOAD_PORT,
                // Change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    open: {
                        appName: 'Google Chrome Canary'
                    },
                    base: [
                        '<%= yeoman.app %>',
                        '<%= yeoman.tmp %>'
                    ]
                }
            },
            dist: {
                options: {
                    open: true,
                    base: '<%= yeoman.dist %>',
                    livereload: false
                }
            }
        },

        nodemon: {
            server: {
                options: {
                    file: 'server.js',
                    args: ['l'],
                    //nodeArgs: ['--debug'],
                    ignoredFiles: [
                        '.idea', '.sass-cache', '.tmp', 'app/assets', 'dist', 'node_modules/**', 'public',
                        'aes.js', 'app.js', 'bower.json', 'gapis.js'
                    ],
                    watchedExtensions: ['ejs','handlebars','html','jade'],
                    watchedFolders: [
                        'app',
                        'app/controllers',
                        'app/models',
                        'app/models/plugins',
                        'app/views/*',
                        'config',
                        'lib/*'
                    ],
                    //delayTime: 1,
                    cwd: __dirname,
                    env: {
                        PORT: '8080'
                    }
                }
            },
            exec: {
                options: {
                    exec: 'less'
                }
            }
        },


        // Empties folders to start fresh
        clean: {
            dist: {
                files: [{
                    dot: true,
                    src: [
                        '<%= yeoman.tmp %>',
                        '<%= yeoman.dist %>/*',
                        '!<%= yeoman.dist %>/.git*'
                    ]
                }]
            },
            server: '<%= yeoman.tmp %>'
        },

        // Make sure code styles are up to par and there are no obvious mistakes
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                //'<%= yeoman.app %>/scripts/{,*/}*.js',
                //'!<%= yeoman.app %>/scripts/vendor/*',
                '<%= yeoman.tmp %>/js/{,*/}*.js',
                '!<%= yeoman.tmp %>/js/vendor/*'
            ]
        },



        // Compiles Coffee to JS
        coffee: {
            dist: {
                files: [{
                    // Rather than compiling multiple files here you should require them into your main .coffee file
                    expand: true,
                    cwd: '<%= yeoman.app %>/scripts',
                    src: '{,*/}*.coffee',
                    dest: '<%= yeoman.tmp %>/js',
                    ext: '.js'
                }]
            },
            server: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/scripts',
                    src: '{,*/}*.coffee',
                    dest: '<%= yeoman.tmp %>/js',
                    ext: '.js'
                }],
                options: {
                    bare: true,
                    sourceMap: true
                }
            }
        },

        jsbeautifier: {
            files: [
                '<%= yeoman.tmp %>/js/{,*/}*.js',
                '!<%= yeoman.tmp %>/js/vendor/*'
            ],
            options: {
                js: {
                    wrapLineLength: 0
                }
            }
        },

        // Compiles Sass to CSS and generates necessary files if requested
        compass: {
            options: {
                //config: 'config/config.rb'
                sassDir: '<%= yeoman.app %>/styles',
                cssDir: '<%= yeoman.tmp %>/css',
                //specify: [], // ignores filenames starting with underscore
                imagesDir: '<%= yeoman.app %>/images',
                generatedImagesDir: '<%= yeoman.tmp %>/img/generated',
                javascriptsDir: '<%= yeoman.app %>/scripts',
                fontsDir: '<%= yeoman.app %>/styles/fonts',
                importPath: '<%= yeoman.app %>/bower_components',
                httpImagesPath: '/img',
                httpGeneratedImagesPath: '/img/generated',
                httpFontsPath: '/css/fonts',
                relativeAssets: false,
                assetCacheBuster: false
            },
            dist: {
                options: {
                    generatedImagesDir: '<%= yeoman.dist %>/img/generated',
                    environment: 'production'
                }
            },
            server: {
                options: {
                    debugInfo: true
                }
            }
        },
        sass: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/styles',
                    src: ['*.scss'],
                    dest: '<%= yeoman.tmp %>/css',
                    ext: '.css'
                }]
            },
            server: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/styles',
                    src: ['*.scss'],
                    dest: '<%= yeoman.tmp %>/css',
                    ext: '.css'
                }],
                options: {
                    //sourcemap: false,
                    //lineNumbers: true // grunt-contrib-sass options
                    //sourceMap: '<%= yeoman.app %>/styles/',
                    sourceComments: 'normal' // grunt-sass options
                }
           }
        },

        // Add vendor prefixed styles
        autoprefixer: {
            options: {
                browsers: ['last 1 version', 'android >= 4', 'bb >= 10'],
                diff: false
            },
            server: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.tmp %>/css/',
                    src: '{,*/}*.css',
                    dest: '<%= yeoman.tmp %>/css/'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.tmp %>/concat/css/',
                    src: '{,*/}*.css',
                    dest: '<%= yeoman.tmp %>/concat/css/'
                }]
            }
        },

        // Automatically inject Bower components into the HTML file
        'bower-install': {
            target: {
                src: ['<%= yeoman.app %>/index.html'],
                ignorePath: '<%= yeoman.app %>/'
            }
        },

        // Renames files for browser caching purposes
        rev: {
            dist: {
                files: {
                    src: [
                        '<%= yeoman.dist %>/js/{,*/}*.js',
                        '<%= yeoman.dist %>/css/{,*/}*.css',
                        '<%= yeoman.dist %>/img/{,*/}*.{gif,jpeg,jpg,png,webp}',
                        '<%= yeoman.dist %>/fonts/{,*/}*.{eot,svg,ttf,woff}'
                    ]
                }
            }
        },

        // Reads HTML for usemin blocks to enable smart builds that automatically
        // concat, minify and revision files. Creates configurations in memory so
        // additional tasks can operate on them
        useminPrepare: {
            options: {
                dest: '<%= yeoman.dist %>'
            },
            html: '<%= yeoman.app %>/index.html'
        },

        // Performs rewrites based on rev and the useminPrepare configuration
        usemin: {
            options: {
                assetsDirs: [
                    '<%= yeoman.dist %>', '<%= yeoman.dist %>/css', '<%= yeoman.dist %>/fonts',
                    '<%= yeoman.dist %>/img', '<%= yeoman.dist %>/js'
                ]
            },
            html: ['<%= yeoman.dist %>/{,*/}*.html'],
            css: ['<%= yeoman.dist %>/css/{,*/}*.css']
        },

        // The following *-min tasks produce minified files in the dist folder
        imagemin: {
            server:  {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/images',
                    src: '{,*/}*.{gif,jpeg,jpg,png}',
                    dest: '<%= yeoman.tmp %>/img'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/images',
                    src: '{,*/}*.{gif,jpeg,jpg,png}',
                    dest: '<%= yeoman.dist %>/img'
                }]
            }
        },
        svgmin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.app %>/images',
                    src: '{,*/}*.svg',
                    dest: '<%= yeoman.dist %>/img'
                }]
            }
        },
        htmlmin: {
            dist: {
                options: {
                    collapseBooleanAttributes: true,
                    collapseWhitespace: true,
                    removeAttributeQuotes: true,
                    removeCommentsFromCDATA: true,
                    removeEmptyAttributes: true,
                    removeOptionalTags: true,
                    removeRedundantAttributes: true,
                    useShortDoctype: true
                },
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.dist %>',
                    src: '{,*/}*.html',
                    dest: '<%= yeoman.dist %>'
                }]
            }
        },

        // By default, your `index.html`'s <!-- Usemin block --> will take care of
        // minification. These next options are pre-configured if you do not wish
        // to use the Usemin blocks.
        // cssmin: {
        //     dist: {
        //         files: [{
        //             expand: true,
        //             cwd: '<%= yeoman.tmp %>/css/concat',
        //             src: '{,*/}*.css',
        //             dest: '<%= yeoman.dist %>/css'
        //         }]
        //    }
        // },
        // uglify: {
        //     dist: {
        //         files: {
        //             '<%= yeoman.dist %>/js/scripts.js': [
        //                 '<%= yeoman.dist %>/js/scripts.js'
        //             ]
        //         }
        //     }
        // },
        // concat: {
        //     dist: {}
        // },

        concat: {
            customBuild: {
                files: {
                    '<%= yeoman.tmp %>/concat/css/main.css': [
                        '<%= yeoman.tmp %>/css/main.css'
                    ],
                    '<%= yeoman.tmp %>/concat/js/main.js': [
                        '<%= yeoman.tmp %>/js/main.js',
                        '<%= yeoman.tmp %>/js/plugins.js'
                    ]
                }
            }
        },

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>',
                    dest: '<%= yeoman.dist %>',
                    src: [
                        '*.{ico,mp3,png,txt}',
                        '.htaccess',
                        '{,*/}*.html',
                        'bower_components/sass-bootstrap/fonts/*.{eot,svg,ttf,woff}',
                        'fonts/{,*/}*.{eot,svg,ttf,woff}',
                        'images/{,*/}*.webp',
                        'styles/fonts/{,*/}*.{eot,svg,ttf,woff}'
                    ]
                }, {
                    '<%= yeoman.tmp %>/js/plugins.js': '<%= yeoman.app %>/scripts/plugins.js'
                }]
            },
            server: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>',
                    dest: '<%= yeoman.tmp %>',
                    src: [
                        'fonts/{,*/}*.{eot,svg,ttf,woff}'
                    ]
                }]
            },
            styles: {
                expand: true,
                dot: true,
                cwd: '<%= yeoman.app %>/styles',
                dest: '<%= yeoman.tmp %>/css/',
                src: [
                    '{,*/}*.css',
                    '{images,img}/{,*/}*.{gif,jpeg,jpg,png}',
                    'fonts/{,*/}*.{eot,svg,ttf,woff}'
                ]
            },
            scripts: { // when watch JS files is changing, do this..
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>/scripts',
                    dest: '<%= yeoman.tmp %>/js/',
                    src: [
                        '{,*/}*.js',
                        'vendor/{,*/}*.js'
                    ]
                }]
            }
        },


        // Generates a custom Modernizr build that includes only the tests you
        // reference in your app
        modernizr: {
            devFile: '<%= yeoman.app %>/bower_components/modernizr/modernizr.js',
            outputFile: '<%= yeoman.dist %>/bower_components/modernizr/modernizr.js',
            files: [
                '<%= yeoman.dist %>/js/{,*/}*.js',
                '<%= yeoman.dist %>/css/{,*/}*.css',
                '!<%= yeoman.dist %>/js/vendor/*'
            ],
            uglify: true
        },

        // Run some tasks in parallel to speed up build process
        concurrent: {
            server: [
                'coffee:server',
                //'compass:server',
                'sass:server',
                'copy:server',
                'copy:scripts',
                'copy:styles',
                'imagemin:server'
                //'svgmin:server'
            ],
            background: ['watch','nodemon:server'],
            dist: [
                'coffee:dist',
                //'compass:dist',
                'sass:dist',
                'imagemin:dist',
                'svgmin'
            ]
        }
    });


    grunt.registerTask('server', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'concurrent:server',
            'autoprefixer:server',
            'bower-install',
            'connect:livereload',
            'watch'
        ]);
    });

    grunt.registerTask('build', [
        'clean:dist',
        'useminPrepare',
        'concurrent:dist',
        'concat',
        'concat:customBuild',
        'autoprefixer:dist',
        'cssmin',
        'uglify',
        'copy:dist', // copy over the rest of other files that not required any process to dist folder
        'modernizr',
        'rev',
        'usemin',
        'htmlmin'
    ]);

    grunt.registerTask('default', [
        'newer:jshint',
        'build'
    ]);
};
