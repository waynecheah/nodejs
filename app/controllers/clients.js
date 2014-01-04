
var mongoose = require('mongoose');
var Client   = mongoose.model('Client');

var Clients = {
    register: function(data){
        return {};
    },

    appSignin: function(data){
        return {};
    }
};

module.exports = Clients;