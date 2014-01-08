
mongoose = require 'mongoose'
# validate = require '../../lib/validate'

exports.Name = 'Event'

exports.Schema = mongoose.Schema
  datetime: String
  device: String
  category: String
  log: String
  number: Number    # [partition, zone, device, light, sensor, label]
  command: String   # [for APP only]
  condition: Number # [zone]
  status: Number    # [system, partition, zone, emergency, device, light, sensor]
  value: String     # [device, light, sensor]
  partition: Number # [zone]
  type: Number      # [system, zone, emergency, device, light, sensor]
  user: String      # [partition, emergency, device, light]
  succeed: Boolean  # [for APP only]
# END Schema

exports.Events =
  beforeInsert: (data) ->
  afterInsert: (data) ->
# END Events

exports.Methods =
  findDevice: (id, callback) ->
    @model('Event').find device:id, callback

  otherMethod: (data) ->
# END Methods