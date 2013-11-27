var readline   = require('readline');
var googleapis = require('googleapis'),
    OAuth2Client = googleapis.OAuth2Client;
var _          = require('lodash');

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var OAUTH2 = {
    clientId: '341678844265-5ak3e1c5eiaglb2h9ortqbs9q57ro6gb.apps.googleusercontent.com',
    clientSecret: '-nJjY2oC-qhcPiCKbaSM5x73',
    redirectUrl: 'http://localhost:8080/oauth2callback',
    code: null
};
var client, oauth2Client;


googleapis.discover('mirror', 'v1').execute(function(err, data){
    if (err) {
        console.log(err);
        return;
    }

    oauth2Client = new OAuth2Client(OAUTH2.clientId, OAUTH2.clientSecret, OAUTH2.redirectUrl);
    client = data;

    if (!oauth2Client.credentials) {
        setToken(timeline_list);
    } else {
        timeline_list();
    }
});


function generateAuthUrl () {
    var url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/glass.timeline https://www.googleapis.com/auth/glass.location'
    });
    return url;
} // generateAuthUrl

function setToken (callback) {
    rl.question('Enter the credentials token here:', function(token) {
        if (token.length > 20) { // ya29.1.AADtN_Wtd6Pa3QxJrlDEXqxADZvZFkewiVL1zDcGANswvwXr04IFJuFfZ_zD_fw
            oauth2Client.credentials = {
                access_token: token,
                //refresh_token: '',
                token_type: 'Bearer'
            };
            callback();
        } else {
            var url = generateAuthUrl();
            console.log('Visit the url: \r\n', url);

            rl.question('Enter the authorization code here:', function(code) {
                OAUTH2.code = code;
                getAccessToken(code, callback);
            });
        }
    });
} // setToken

function getAccessToken (code, callback) {
    oauth2Client.getToken(code, function(err, tokens) {
        if (err) {
            console.log(err);
            return;
        }

        // contains an access_token and optionally a refresh_token. save them permanently.
        console.log('Gain access token');
        console.log(tokens);
        oauth2Client.credentials = tokens;
        callback && callback();
    });
} // getAccessToken

function refreshToken () {
    oauth2Client.refreshAccessToken();
} // refreshToken

function timeline_list () {
    client.mirror.timeline.list({
        includeDeleted: true,
        maxResults: 5,
        fields: 'items(created,displayTime,id,location,notification,text,title,updated)'
    }).withAuthClient(oauth2Client).execute(function(err,res){
        if (err) {
            console.log(err);
            return;
        }

        _.each(res, function(o){
            console.log(o);
        })
    });
} // timeline_list