
mongoose = require 'mongoose'
_        = require 'lodash'
# validate = require '../../lib/validate'

# appModel   = require './appModel'
lifecycle  = require 'mongoose-lifecycle'
upsertDate = require './plugins/upsertDate'

appModel =
  events: (Model, customEvents) ->
    events =
      beforeInsert: (data) ->
      afterInser: (data) ->
      beforeUpdate: (data) ->
        @modified = new Date if not @modified
      afterUpdate: (data) ->
      beforeSave: (data) ->
      afterSave: (data) ->
      beforeRemove: (data) ->
      afterRemove: (data) ->

    if not customEvents? and _.isObject customeEvents
      _.assign events, customEvents

    _.each events, (fn, name) ->
      Model.on name, (data) ->
        fn data

    Model
  # END events

  methods: (Schame, customMethods) ->
    methods =
      lastUpdate: (model, callback) ->
        @model(model).findOne {}, '-_id modified', sort: modified: -1, callback

    if not customMethods? and _.isObject customMethods
      _.assign methods, customMethods

    _.each methods, (fn, name) ->
      Schema.static name, fn

    Schema.plugin upsertDate
    Schema.plugin lifecycle

    Schema
  # END methods

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

# compile the model
Device = mongoose.model 'Device', appModel.methods Schema, Methods

# handle events
Device = appModel.events Client, Events


module.exports = Device