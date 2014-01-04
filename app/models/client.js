
var mongoose = require('mongoose');
var upsertDate = require('./plugins/upsertDate');
var validEmail = require('../../lib/validate/email');
var Mixed = mongoose.Schema.Types.Mixed;

var schema = mongoose.Schema({
    username: { type:String, validate:validEmail },
    password: { type:String, required:true },
    fullname: { type:String, required:true },
    accessToken: Mixed,
    services: Array
});

schema.statics.findClient = function (id, callback) {
    return this.model('Client').find({ email:id }, callback);
};
schema.statics.edit = function (req, callback) {
    var email = req.param('email');
    var query = { username:email };

    var update = {};
    update.password = req.param('password');
    update.fullname = req.param('fullname');

    this.update(query, update, function(err, numAffected) {
        if (err) return callback(err);

        if (0 === numAffected) {
            return callback(new Error('Record is not modify'));
        }

        callback();
    })
};


// add created/modified date property
schema.plugin(upsertDate);


// compile the model
var Client = mongoose.model('Client', schema);


// handle events
Client.on('beforeInsert', function (data) {});
Client.on('afterInsert', function (data) {});
Client.on('beforeRemove', function (data) {});
Client.on('afterRemove', function (data) {});


module.exports = Client;
