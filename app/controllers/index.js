var fs = require('fs');
var _  = require('lodash');

//var appController = require('./appController');
var appController = {
    layout: 'default',

    beforeRender: function(){},

    render: function(name, layout){
        this.beforeRender();
    }
};

/*
 * Modules are automatically loaded once they are declared in the controllers directory.
 */
fs.readdirSync(__dirname).forEach(function(file) {
    if (file != 'index.js') {
        var moduleName = file.substr(0, file.indexOf('.'));
        var controller = require('./' + moduleName);

        if (!_.isFunction(controller) && !_.isArray(controller) && _.isObject(controller)) { // extend if it's an Object
            exports[moduleName] = _.assign(appController, controller);
        } else {
            exports[moduleName] = controller;
        }
    }
});


/*
 * Use with ExpressJS framework
 *
 module.exports = function (app) {
 // homepage
 app.get('/', function(req, res, next){
 res.render('index.handlebars', { data:{} });
 });


 // All Controllers
 require('./users')(app);
 };
 */