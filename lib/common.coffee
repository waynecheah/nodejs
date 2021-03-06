
crypto       = require 'crypto'
moment       = require 'moment'
randomString = require 'random-string'

log = require './log'
RN = '\r\n'


exports.isc = (data, cmd) ->
  length = cmd.length
  data   = data.replace RN, ''
  data   = data.substr 0, length

  return true if data is cmd

  false
# isc

exports.issi = (data, key) ->
  data = data.replace RN, ''
  pos1 = data.search key
  pos2 = data.search '='

  return false if pos1 < 0 or pos2 < 0

  index = data.substr (pos1+1), (pos2-1)

  p: (pos2+1), i: index
# issi

exports.iss = (data, key) -> # is set
  length = key.length + 1
  data   = data.replace RN, ''
  data   = data.substr 0, length

  return length if data is key+'='

  false
# iss

exports.gv = (data, start) -> # get value
  data = data.replace RN, ''
  data.substr start
# gv

exports.encryption = (data, key, iv, format) ->
  cipher = crypto.createCipheriv 'aes-128-cbc', key, iv
  strlen = data.length

  random = switch
    when strlen <= 12 then 15-strlen # use 16 bytes
    when strlen <= 28 then 31-strlen # use 32 bytes
    when strlen <= 44 then 47-strlen # use 48 bytes
    else false
  return false unless random

  random = randomString length:random
  data   = random + '|' + data
  log 's', 'i', 'Encrypt data: '+data

  cipher.setAutoPadding false
  cipher.update data, 'utf8', format
#  encryption

exports.decryption = (data, key, iv, format) ->
  decipher = crypto.createDecipheriv 'aes-128-cbc', key, iv

  decipher.setAutoPadding false
  decrData = decipher.update data, format, 'utf8'
  position = decrData.indexOf '|' # get separator position

  if position < 0 # invalid data, there should have a | within decrypted data
    log 'n', 'e', 'Invalid decrypted data: '+decrData
    return false

  log('n', 's', 'Decrypted data: '+decrData);
  decrData.substr(position+1);
# decryption

exports.datetime = ->
  moment().format 'YYMMDDHHmmss'
# datetime