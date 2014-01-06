
var mongoose = require('mongoose');
var _  = require('lodash');
//var validate = require('../../lib/validate');
var validEmail = require('../../lib/validate/email');


//var appModel = require('./appModel');
var lifecycle  = require('mongoose-lifecycle');
var upsertDate = require('./plugins/upsertDate');
var appModel = {
    events: function(Model, customEvents){
        var events = {
            beforeInsert: function(data){},

            afterInsert: function(data){},

            beforeUpdate: function(data){
                if (!this.modified) this.modified = new Date;
            },

            afterUpdate: function(data){},

            beforeSave: function(data){},

            afterSave: function(data){},

            beforeRemove: function(data){},

            afterRemove: function(data){}
        };

        if (!_.isUndefined(customEvents) && _.isObject(customEvents)) {
            _.assign(events, customEvents);
        }

        _.each(events, function(fn, name){
            Model.on(name, function(data){
                fn(data);
            });
        });

        return Model;
    }, // events

    methods: function(Schema, customMethods){
        var methods = {
            lastUpdate: function(model, callback){
                this.model(model).findOne({}, '-_id modified', { sort:{ modified:-1 } }, callback);
            } // lastUpdate
        };

        if (!_.isUndefined(customMethods) && _.isObject(customMethods)) {
            _.assign(methods, customMethods);
        }

        _.each(methods, function(fn, name){
            Schema.static(name, fn);
        });


        Schema.plugin(upsertDate); // add created/modified date property to all models
        Schema.plugin(lifecycle); // add lifecyle events to all models

        return Schema;
    } // method
};

var Mixed  = mongoose.Schema.Types.Mixed;
var Schema = mongoose.Schema({
    username: { type:String, validate:validEmail }, // validate.email
    password: { type:String, required:true },
    fullname: { type:String, required:true },
    accessToken: Mixed,
    services: Array
});


var Client;
var Events = {
    beforeInsert: function(data){
    },

    afterInsert: function(data){
    }
};
var Methods = {
    findClient: function(id, callback){
        return this.model('Client').find({ email:id }, callback);
    }, // findCLient

    edit: function(req, callback){
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
        });
    } // edit
};


// compile the model
Client = mongoose.model('Client', appModel.methods(Schema, Methods));

// handle events
Client = appModel.events(Client, Events);


module.exports = Client;
