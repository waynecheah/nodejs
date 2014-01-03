var fs = require('fs');

/*module.exports = function (app) {
    // homepage
    app.get('/', function(req, res, next){
        res.render('index.handlebars', { data:{} });
    });


    // All Controllers
    users(app);
};*/


/*
 * Modules are automatically loaded once they are declared
 * in the controller directory.
 */
fs.readdirSync(__dirname).forEach(function(file) {
    if (file != 'index.js') {
        var moduleName = file.substr(0, file.indexOf('.'));
        exports[moduleName] = require('./' + moduleName)(app);
    }
});