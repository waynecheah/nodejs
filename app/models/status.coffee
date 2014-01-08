
mongoose = require 'mongoose'
# validate = require '../../lib/validate'
Mixed    = mongoose.Schema.Types.Mixed

exports.Name = 'Status'

exports.Schema = mongoose.Schema
  deviceId: type: String, require: true
  serial: type: String, require: true
  info:
    cn: type: String
    pn: type: String
    sn: type: String
    vs: type: Number
  status: type: Mixed
# END Schema

exports.Events =
  beforeInsert: (data) ->
  afterInsert: (data) ->
# END Events

exports.Methods =
  findStatus: (id, callback) ->
    @model('Status').find deviceId:id, callback

  otherMethod: (data) ->
# END Methods