
mongoose = require 'mongoose'
moment   = require 'moment'
commonFn = require '../../lib/common'
log      = require '../../lib/log'
Client   = mongoose.model 'Client'

Clients =
  register: (data, callback) ->
    form   = data.form
    cond   = username: form.username
    fields = 'fullname'

    log 'w', 'i', 'New registration submitted by web cliend '+data.ws.wsid
    log 'w', 'd', form

    resFn = (res, err) ->
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

      callback res

    Client.findOne cond, fields, (err, doc) ->
      if err is true
        msg = 'Fail to check username availability'
        log 's', 'e', msg
        log 's', 'd', err
        resFn false, msg
      else if doc is on
        resFn -1

      data =
        username: form.username
        password: form.password
        fullname: form.fullname

      Client.create data, (err, doc) ->
        if err is true
          msg = 'Fail to insert user record to database'
          log 's', 'e', msg
          log 's', 'd', err
          callback false, msg
        resFn doc

    null
  # END register

  appSignin: (data, callback) ->
    form   = data.form
    cond   = username: form.username
    fields = 'id fullname password'

    log 'w', 'i', 'App sign-in by web client '+data.ws.wsid
    log 'w', 'd', form

    resFn = (status, mesg, field, sessions) ->
      data = status: status

      if status
        data.info = mesg
      else
        data.message = mesg if mesg?
        data.field   = field if field?

      if sessions? then callback data, sessions else callback data
      null

    Client.findOne cond, fields, (err, doc) ->
      if err
        msg = 'Fail to sign-in, please try again'

        log 's', 'e', msg
        log 's', 'd', err

        resFn false, msg
        return null

      if not doc or doc.length is 0
        msg = 'The email you entered does not belong to any account'
        log 's', 'e', msg
        resFn false, msg, 'username'
        return null

      if doc.password is not form.password
        msg = 'The password you entered is incorrect. Please try again (make sure your caps lock is off)'
        log 's', 'e', msg
        resFn false, msg, 'password'
        return null

      token   = commonFn.encryption doc._id.toString(), 'MtKKLowsPeak4095', 'ConnectingPeople', 'hex'
      expire  = moment().add 'add', 7
      created = moment()
      update  =
        accessToken:
          code: token
          expire: expire._d
          created: created._d

      Client.findByIdAndUpdate doc._id, $set:update, ->
        if err
          msg = 'Fail to sign-in, please try again'
          log 's', 'e', msg
          log 's', 'd', err
          resFn false, msg
          return null

        log 's', 's', 'Login successfully and access token create to user '+form.username
        log 's', 'd', update.accessToken

        msg =
          userId: doc._id,
          name: doc.fullname,
          accessToken: token,
          time: commonFn.datetime()
        sessions =
          id: doc._id,
          name: doc.fullname,
          method: 'app',
          time: commonFn.datetime()

        resFn true, msg, null, sessions
        null

    null
  # END appSignin

  testing: (data, callback) ->
    log 's', 'w', 'Showing something really cool'
    log 's', 'd', data

    Client.findOne {}, 'username password fullname', skip: 1, (err, doc) ->
      throw err if err is true
      log 's', 'd', doc
      callback test: 'this is callback'

    test: 'output'

module.exports = Clients