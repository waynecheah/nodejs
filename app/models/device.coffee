
mongoose = require 'mongoose'
# validate = require '../../lib/validate'

exports.Name = 'Device'

exports.Schema = mongoose.Schema
  name: String
  macAdd: type: String, require: true
  serial: type:String, require: true, index:true
  owner: String
  users: type:Array, index:true
  registerOn: Date
  lastSync: Date
# END Schema

exports.Events =
  beforeInsert: (data) ->
  afterInsert: (data) ->
# END Events

exports.Methods =
  findDevice: (id, callback) ->
    @model('Device').find email:id, callback

  otherMethod: (data) ->
# END Methods