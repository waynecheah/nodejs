var nodemailer = require('nodemailer'),
    env = process.env.NODE_ENV || 'development';

var email = {
    development: {
        transport: nodemailer.createTransport('SMTP', {
            service: 'KokWeng.net',
            auth: {
                user: 'nodejs@kokweng.net',
                pass: 'jumpknee123'
            }
        }),
        options: {
            from: "Nodejs Rock ✔ <nodejs@kokweng.net>", // sender address
            to: "cheah_88@hotmail.com", // list of receivers
            subject: "Say Hello ✔", // Subject line
            text: "Hello world ✔", // plaintext body
            html: "<b>Hello world ✔</b>" // html body
        }
    },

    test: {
        transport: {
            sendMail: function(opts){
            }
        }
    },

    production: {
        transport: nodemailer.createTransport('SMTP', {
            service: 'Innerzon.com',
            auth: {
                user: 'info@innerzon.com',
                pass: 'jumpknee123'
            }
        }),
        options: {
            from: "Nodejs Rock ✔ <nodejs@kokweng.net>", // sender address
            to: "cheah_88@hotmail.com", // list of receivers
            subject: "Say Hello ✔", // Subject line
            text: "Hello world ✔", // plaintext body
            html: "<b>Hello world ✔</b>" // html body
        }
    }
};

module.exports = email[env];
