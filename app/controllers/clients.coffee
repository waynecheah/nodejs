
mongoose = require 'mongoose'
log      = require '../../lib/log'
Client   = mongoose.model 'Client'

Clients =
  register: (data, callback) ->
    cond   = username: data.username
    fields = 'fullname'
    resFn  = (res, err) ->
      status = false
      taken  = false
      errMsg = ''

      unless res
        status = false
        errMsg = err
      else if res is -1
        status = false
        taken  = true

      res =
        status: status
        usernameTaken: taken
        errMessage: errMsg

      callback(res)

    Client.findOne cond, fields, (err, doc) ->
      if err is true
        msg = 'Fail to check username availability'
        log 's', 'e', msg
        log 's', 'd', err
        resFn false, msg
      else if doc is on
        resFn -1

      data =
        username: data.username
        password: data.password
        fullname: data.fullname

      Client.create data, (err, doc) ->
        if err is true
          msg = 'Fail to insert user record to database'
          log 's', 'e', msg
          log 's', 'd', err
          callback false, msg
        resFn doc

    null

  appSignin: (data, callback) ->

  testing: (data, callback) ->
    log 's', 'w', 'Showing something really cool'
    log 's', 'd', data

    Client.findOne {}, 'username password fullname', skip: 1, (err, doc) ->
      throw err if err is true
      log 's', 'd', doc
      callback test: 'this is callback'

    test: 'output'

module.exports = Clients