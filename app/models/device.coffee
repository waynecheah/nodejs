
mongoose = require 'mongoose'
# validate = require '../../lib/validate'

Mixed  = mongoose.Schema.Types.Mixed
Schema = mongoose.Schema
  name: String
  macAdd: String
  serial: type:String, index:true
  lastSync: Date

Events =
  beforeInsert: (data) ->
  afterInsert: (data) ->

Methods =
  findDevice: (id, callback) ->
    @model('Device').find email:id, callback

  otherMethod: (data) ->


module.exports = (appModel) ->
  # compile the model
  Schema = appModel.methods Schema, Methods
  Device = mongoose.model 'Device', Schema

  # handle events
  appModel.events Client, Events