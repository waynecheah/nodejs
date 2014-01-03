var fs = require('fs');

/*
 * Modules are automatically loaded once they are declared in the controllers directory.
 */
fs.readdirSync(__dirname).forEach(function(file) {
    if (file != 'index.js') {
        var moduleName = file.substr(0, file.indexOf('.'));
        exports[moduleName] = require('./' + moduleName);
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