'use strict';
//READING OF SYSTEM
var ostb = require('os-toolbox');
//REQUEST TO MASTER SERVER
var request = require('request');
//CONFIG INI
var fs = require('fs');
var ini = require('ini');
var config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
//AzureConnectionString
var Protocol = require('azure-iot-device-amqp').Amqp;
//var Protocol = require('azure-iot-device-mqtt').Mqtt;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;
//Azure PARAMS
var azureURL = 'HostName=agirIotHub.azure-devices.net';
var deviceIdURL = 'DeviceId=';
var deviceKeyUrl = 'SharedAccessKey=';
var AzureConnectionString = '';

var intervalSending = null;


if (config.deviceId == null || config.deviceKey == null) {
    getDeviceFromMaster();
} else {
    getAzureConnectionString();
}
if (config.interval == null) {
    //Setting default interval to 60sec
    config.interval = 60;
    fs.writeFileSync('./config.ini', ini.stringify(config));
}
sendSysMonitoring();


function getAzureConnectionString() {
    AzureConnectionString = azureURL + ';' + deviceIdURL + config.deviceId + ';' + deviceKeyUrl + config.deviceKey;
}
function getDeviceFromMaster() {
    var options = {
        url: config.masterUrl + '?name=' + ostb.platform(),
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };
    var saveDeviceInfos = function (error, response, body) {
        if (!error && response.statusCode == 200) {
            body = JSON.parse(body);
            config.deviceId = body.deviceId;
            config.deviceKey = body.authentication.SymmetricKey.primaryKey;
            fs.writeFileSync('./config.ini', ini.stringify(config));
            getAzureConnectionString();
        } else {
            console.log(error);
        }
    };
    request.get(options, saveDeviceInfos);
}

function sendSysMonitoring() {
    // Create IoT Hub client
    var client = Client.fromConnectionString(AzureConnectionString, Protocol);
    client.open(function (err, result) {
        if (err) {
            printErrorFor('open')(err);
        } else {
            //READING MESSAGES FROM MASTER
            client.on('message', function (msg) {
                console.log('receive data: ' + msg.getData());
                var message = ""+msg.getData()+""
                if (message.indexOf('changeInterval' != -1)) {
                    var interval = message.split(';')[1];
                    console.log('Changing Interval!');
                    clearInterval(intervalSending);
                    config.interval = interval;
                    fs.writeFileSync('./config.ini', ini.stringify(config));
                    intervalSending = setInterval(function () {
                        sendToAzure();
                    }, config.interval * 1000);
                }
                client.complete(msg, printResultFor('completed'));
            });
            client.on('event', function (msg) {
                console.log(msg);
            });
            //ERRORS
            client.on('error', function (err) {
                printErrorFor('client')(err);
                client.close();
            });
        }
    });
    // start event data send routing
    var sendToAzure = function () {
        ostb.cpuLoad().then(function (cpuusage) {
            ostb.memoryUsage().then(function (memusage) {
                var data = JSON.stringify({
                    'DeviceID': config.deviceId,
                    'OS': ostb.platform(),
                    'UPTIME': ostb.uptime(),
                    'CPULOAD': cpuusage,
                    'MEMORYLOAD': memusage
                });
                console.log('Sending device monitoring data:\n' + data);
                client.sendEvent(new Message(data), printErrorFor('send event'));
            }, function (error) {
                console.log(error);
            });
        });

    };
    // Create a message and send it to the IoT Hub every X seconds (defined in config.ini);
    intervalSending = setInterval(function () {
        sendToAzure();
    }, config.interval * 1000);
    console.log(AzureConnectionString);
}
// Helper function to print results for an operation
function printErrorFor(op) {
    return function printError(err) {
        if (err) console.log(op + ' error: ' + err.toString());
    };
}
// Helper function to print results in the console
function printResultFor(op) {
  return function printResult(err, res) {
    if (err) console.log(op + ' error: ' + err.toString());
    if (res) console.log(op + ' status: ' + res.constructor.name);
  };
}