'use strict';
var LIVERELOAD_PORT = 35729;
var SERVER_PORT     = 9000;

module.exports = function (grunt) {
    // Load grunt tasks automatically
    require('load-grunt-tasks')(grunt);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    // Define the configuration for all the tasks
    grunt.initConfig({

        // Project settings
        yeoman: {
            // Configurable paths
            app: 'app/assets',
            dist: 'dist',
            tmp: '.tmp'
        },

        // Watches files for changes and runs tasks based on the changed files
        watch: {
            coffee: {
                files: ['<%= yeoman.app %>/scripts/{,*/}*.coffee'],
                tasks: ['coffee:dist']
            },
            js: {
                files: ['<%= yeoman.app %>/scripts/{,*/}*.js', '<%= yeoman.tmp %>/js/{,*/}*.js'],
                tasks: ['jshint', 'newer:copy:scripts'],
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
                tasks: ['sass:server', 'autoprefixer']
            },
            styles: {
                files: ['<%= yeoman.app %>/styles/{,*/}*.css'],
                tasks: ['newer:copy:styles', 'autoprefixer']
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
                    open: true,
                    base: [
                        '<%= yeoman.tmp %>',
                        '<%= yeoman.app %>',
                        '<%= yeoman.dist %>'
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
                '<%= yeoman.app %>/scripts/{,*/}*.js',
                '!<%= yeoman.app %>/scripts/vendor/*'
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
                    generatedImagesDir: '<%= yeoman.dist %>/images/generated',
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
                    dest: '<%= yeoman.dist %>/css',
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
                    sourcemap: 'true'
                }
            }
        },

        // Add vendor prefixed styles
        autoprefixer: {
            options: {
                browsers: ['last 1 version', 'android >= 4', 'bb >= 10'],
                diff: true
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= yeoman.tmp %>/css/',
                    src: '{,*/}*.css',
                    dest: '<%= yeoman.tmp %>/css/'
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
                        '<%= yeoman.dist %>/fonts/{,*/}*.*'
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
                assetsDirs: ['<%= yeoman.dist %>']
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
        //         files: {
        //             '<%= yeoman.dist %>/css/main.css': [
        //                 '<%= yeoman.tmp %>/css/{,*/}*.css',
        //                 '<%= yeoman.app %>/styles/{,*/}*.css'
        //             ]
        //         }
        //     }
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

        // Copies remaining files to places other tasks can use
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '<%= yeoman.app %>',
                    dest: '<%= yeoman.dist %>',
                    src: [
                        '*.{ico,png,txt}',
                        '.htaccess',
                        'images/{,*/}*.webp',
                        '{,*/}*.html',
                        'styles/fonts/{,*/}*.*',
                        'bower_components/sass-bootstrap/fonts/*.*'
                    ]
                }]
            },
            styles: {
                expand: true,
                dot: true,
                cwd: '<%= yeoman.app %>/styles',
                dest: '<%= yeoman.tmp %>/css/',
                src: '{,*/}*.css'
            },
            scripts: {
                expand: true,
                dot: true,
                cwd: '<%= yeoman.app %>/scripts',
                dest: '<%= yeoman.tmp %>/js/',
                src: '{,*/}*.js'
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
                //'compass:server',
                'sass:server',
                'copy:styles',
                'imagemin:server'
            ],
            dist: [
                //'compass',
                'sass:dist',
                'copy:styles',
                'imagemin',
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
            'autoprefixer',
            'bower-install',
            'connect:livereload',
            'watch'
        ]);
    });

    grunt.registerTask('build', [
        'clean:dist',
        'useminPrepare',
        'concurrent:dist',
        'autoprefixer',
        'concat',
        'cssmin',
        'uglify',
        'copy:dist',
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