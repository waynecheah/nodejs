
var mongoose = require('mongoose');
var log      = require('../../lib/log');
var Client   = mongoose.model('Client');

var Clients = {
    register: function(data, callback){
        var cond   = {
            username: data.username
        };
        var fields = 'fullname';
        var resFn  = function(res, err){
            var status = true;
            var taken  = false;
            var errMsg = '';

            if (!res) {
                status = false;
                errMsg = err;
            } else if (res == -1) {
                status = false;
                taken  = true;
            }

            var res = {
                status: status,
                usernameTaken: taken,
                errMessage: errMsg
            };

            callback(res);
        };

        Client.findOne(cond, fields, function(err, doc){
            if (err) {
                var msg = 'Fail to check username availability';
                log('s', 'e', msg);
                log('s', 'd', err);
                resFn(false, msg);
                return;
            } else if (doc) { // username taken
                resFn(-1);
                return;
            }

            var data = {
                username: data.username,
                password: data.password,
                fullname: data.fullname
            };
            Client.create(data, function(err, doc){
                if (err) {
                    var msg = 'Fail to insert user record to database';
                    log('s', 'e', msg);
                    log('s', 'd', err);
                    callback(false, msg);
                    return;
                }
                resFn(doc);
            });
        });
    }, // register

    appSignin: function(data, callback){
    }, // appSignin


    testing: function(data, callback){
        log('s', 'w', 'Showing something cool');
        log('s', 'd', data);

        Client.findOne({}, 'username password fullname', function(err, doc){
            if (err) throw err;
            log('s', 'd', doc);
            callback({ test:'callback' });
        });
        return { test:'output' };
    } // testing
};

module.exports = Clients;