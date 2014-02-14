
path = require 'path'
root = path.normalize __dirname + '/../..'

module.exports =
  root: root

  port: process.env.PORT || 3000

  db: process.env.MONGOHQ_URL

  dbHost: 'mongodb://localhost/mydb'

  dbHosts: [
    'ns1.node-server.com:27101'
    'ns1.node-server.com:27102'
    'cheah.homeip.net:27201'
    'innerzon.dyndns.ws:27301'
    'cheah.homeip.net:27401'
    'cheah.homeip.net:27501'
    #'node.homeip.net:27605'
  ]

  replication: true

  aesKey: 'MtKKLowsPeak4095'

  aesIv: 'ConnectingPeople'

  clientErr:
    e0: 'Invalid input'
    e3: 'Invalid light status update, improper format sent'

  serverErr:
    e0: 'Invalid input'
    e1: 'System error'
    e2: 'Error found while query made to database'
    e3: 'Required authorisation data not found'
    e4: 'Unrecognized device, serial not found in database'
    e5: 'Invalid event log, improper format sent'
    e6: 'Save event log into database failure'
    e7: 'Reported system info found incomplete'
    e8: 'No any partition status reported'
    e9: 'No any zone status reported'
    e10: 'Fail update device last status info to DB'
    e11: ''
    e12: ''
    e13: ''
  webErr: {}

  mapping:
    system:
      type:
        0: 'N/A'
        1: 'AC'
        2: 'Battery'
        3: 'PSTN'
        4: 'Bell'
        5: 'Peripheral'
        6: 'GSM'
        7: 'Comm Fail'
      status:
        0: 'Ready/Restore'
        1: 'Alarm'
        2: 'Fault'

    partition:
      status:
        0: 'Disarmed'
        1: 'Away'
        2: 'Home'
        3: 'Night'
      user:
        100: 'User1'
        101: 'Keyfob'
        102: 'Auto'
        103: 'Remote'

    zone:
      condition:
        0: 'Disable'
        1: 'Open'
        2: 'Close'
      status:
        0: 'Ready/Restore'
        1: 'Alarm'
        2: 'Bypass'
        3: 'Trouble'
        4: 'Tamper'
      type:
        0: 'N/A'
        1: 'Delay'
        2: 'Instant'
        3: 'Follower'
        4: '24hr'
        5: 'Delay2'
        6: 'Keyswitch'

    emergency:
      type:
        0: 'N/A'
        1: 'Panic'
        2: 'Medical'
        3: 'Fire'
        4: 'Duress'
      status:
        0: 'Ready/Restore',
        1: 'Alarm'

    light:
      type:
        0: 'Disable'
        1: 'Normal'
        2: 'Dim'
        3: 'Toggle'
        4: 'Pulse'
        5: 'Blink'
        6: 'Delay'
      status:
        0: 'Off'
        1: 'On'
        2: 'Dim'
      user:
        101: 'Keyfob'
        102: 'Auto'
        103: 'Remote'

    sensor:
      type:
        0: 'Disable'
        1: 'Normal Open'
        2: 'Normal Close'
        3: 'Potential'
      status:
        0: 'N/A'
        1: 'Open'
        2: 'Close'

    label:
      item:
        zn: 'Zone'
        dv: 'Device'
        li: 'Light'
        ss: 'Sensor'
        us: 'User'
