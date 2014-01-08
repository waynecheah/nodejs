
mongoose = require 'mongoose'
_        = require 'lodash'
# validate = require '../../lib/validate'
validEmail = require '../../lib/validate/email'
Mixed    = mongoose.Schema.Types.Mixed

exports.Name = 'Client'

exports.Schema = mongoose.Schema
  username: type: String, validate: validEmail
  password: type: String, required: true
  fullname: type: String, required: true
  accessToken: Mixed
  services: Array
# END Schema

exports.Events =
  beforeInsert: (data) ->
  afterInsert: (data) ->
# END Events

exports.Methods =
  findClient: (id, callback) ->
    @model('Client').find email: id, callback

  edit: (req, callback) ->
    email = req.param('email')
    query = username: email

    update =
      password: req.param 'password'
      fullname: req.param 'fullname'

    @update query, update, (err, numAffected) ->
      return callback err if err
      return callback(new Error 'Record is not modified') if numAffected is 0
      callback()
# END Methods


###
module.exports =
  name: 'Client'
  Schema: Schema
  Event
###