/**
 * Copyright (c) 2017 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

var oispSdk = require("@open-iot-service-platform/oisp-sdk-js");
var proxyConnector = oispSdk.lib.proxies.getControlConnector('ws');
var kafka = require('kafka-node');
var cfenvReader = require('./lib/cfenv/reader');
var helpers = require("./lib/helpers");
var colors = require('colors');

var exec = require('child_process').exec;

var accountName = "oisp-tests";
var deviceName = "oisp-tests-device"

var componentName = "temperature-sensor"
var componentType = "temperature.v1.0"

var actuatorName = "powerswitch-actuator"
var actuatorType = "powerswitch.v1.0"

var switchOnCmdName = "switch-on"
var switchOffCmdName = "switch-off"

var rules = [];

rules[switchOnCmdName] = {
    name: "oisp-tests-rule-low-temp",
    conditionComponent: componentName,
    basicConditionOperator: "<=",
    basicConditionValue: "15",
    actuationCmd: switchOnCmdName
};

rules[switchOffCmdName] = {
    name: "oisp-tests-rule-high-temp",
    conditionComponent: componentName,
    basicConditionOperator: ">",
    basicConditionValue: "25",
    actuationCmd: switchOffCmdName
};

//-------------------------------------------------------------------------------------------------------
// Tests
//-------------------------------------------------------------------------------------------------------
var userToken;
var userId;
var accountInfo;
var accountId;
var deviceId;
var deviceToken;
var componentId;
var actuatorId;
var ruleId;
var alertId;
var componentParamName;
var firstObservationTime;

var temperatureValues = [{
        value: -15,
        expectedActuation: 1 // swich on
    },
    {
        value: -5,
        expectedActuation: 1 // swich on
    },
    {
        value: 5,
        expectedActuation: 1 // swich on
    },
    {
        value: 15,
        expectedActuation: 1 // swich on
    },
    {
        value: 25,
        expectedActuation: null // do nothing (no actuation)
    },
    {
        value: 30,
        expectedActuation: 0 // swich off
    },
    {
        value: 20,
        expectedActuation: null // do nothing (no actuation)
    },
    {
        value: 14,
        expectedActuation: 1 // swich on
    },
    {
        value: 20,
        expectedActuation: null // do nothing (no actuation)
    },
    {
        value: 28,
        expectedActuation: 0 // swich off
    }
];

process.stdout.write("_____________________________________________________________________\n".bold);
process.stdout.write("                                                                     \n");
process.stdout.write("                           OISP E2E TESTING                          \n".green.bold);
process.stdout.write("_____________________________________________________________________\n".bold);


describe("Waiting to OISP services to be ready ...\n".bold, function() {
    
    before(function(done) {
        userToken = null;
        accountId = null;
        deviceId = "00-11-22-33-44-55";
        deviceToken = null;
        componentId = null;
        actuatorId = null;
        ruleId = null;
        componentParamName = "on";
        firstObservationTime = null;

        done();
    });

    it('Shall wait for oisp services to start', function(done) {
        var kafkaConsumer;
        var kafka_credentials = cfenvReader.getServiceCredentials("kafka-ups");
        var topic = kafka_credentials.topics.heartbeat.name;
        var partition = 0;
        var kafkaClient = new kafka.KafkaClient({kafkaHost: "localhost:9092"});
        var kafkaOffset = new kafka.Offset(kafkaClient);

        var getKafkaOffset = function(topic_, partition_, cb) {
            kafkaOffset.fetchLatestOffsets([topic_], function (error, offsets) {
                if (!error) {
                    cb(offsets[topic_][partition_])
                }
                else {
                    setTimeout( function() {
                        getKafkaOffset(topic_, partition_, cb);
                    }, 1000)
                }
            })
        };

        getKafkaOffset(topic, partition, function(offset) {
            if ( offset >= 0 ) {
                var topics = [{ topic: topic, offset: offset+1, partition: partition}]
                var options = { autoCommit: true, fromOffset: true};

                kafkaConsumer = new kafka.Consumer(kafkaClient, topics, options)

                var oispServicesToMonitor = ['rules-engine'];
                process.stdout.write("    ");
                kafkaConsumer.on('message', function (message) {
                    process.stdout.write(".".green);
                    if ( kafkaConsumer ) {
                        var now = new Date().getTime();
                        var i=0;
                        for(i=0; i<oispServicesToMonitor.length; i++) {
                            if ( oispServicesToMonitor[i] != null && oispServicesToMonitor[i].trim() === message.value.trim() ) {
                                oispServicesToMonitor[i] = null;
                            }
                        }
                        for(i=0; i<oispServicesToMonitor.length; i++) {
                            if ( oispServicesToMonitor[i] != null ) {
                                break;
                            }
                        }
                        if ( i == oispServicesToMonitor.length ) {
                            kafkaConsumer.close(true);
                            kafkaConsumer = null;
                            process.stdout.write("\n");
                            done();
                        }
                    }
                });
            }
            else {
                done("Cannot get Kafka offset ")
            }
        });
       
    }).timeout(2*60*1000);
})

describe("Login and add user ...\n".bold, function() {
      
    it('Shall authenticate', function(done) {
        var username = process.env.USERNAME;
        var password = process.env.PASSWORD;
        assert.isNotEmpty(username, "no username provided");
        assert.isNotEmpty(password, "no password provided");

        helpers.auth.login(username, password, function(err, token) {
            if (err) {
                done(new Error("Cannot authenticate: " + err));
            } else {
                userToken = token;
                done();
            }   
        })
    })
    /*
    it('Shall get user info', function (done) {
        helpers.auth.userInfo(userToken, function (err, UserInfo) {
            if (err) {
                done(new Error("Cannot get usr info: " + err));
            } else {
                console.dir(UserInfo);
                done();
            }
        })
    })
    */
    it('Shall get token info', function (done) {
        helpers.auth.tokenInfo(userToken, function (err, tokenInfo) {
            if (err) {
                done(new Error("Cannot get token info: " + err));
            } else {
                assert.equal(tokenInfo.header.typ, 'JWT', 'response type error' );
                //console.dir(tokenInfo);
                done();
            }
        })
    })

    it('Shall create a new user', function(done) {
        assert.notEqual(userToken, null, "Invalid user token")
        var username = "newoisp@test.com"
        var password = "oisppass2"
        helpers.users.addUser(userToken, username, password ,function(err, response) {
            if (err) {
                done(new Error("Cannot create user: " + err));
            } else {
                userId = response.id;
                done();
            }
        })
    })

})

describe("Creating account and device ...\n".bold, function() {
  
    it('Shall create account', function(done) {
        assert.notEqual(userToken, null, "Invalid user token")
        helpers.accounts.createAccount(accountName, userToken, function(err, response) {
            if (err) {
                done(new Error("Cannot create account: " + err));
            } else {
                assert.equal(response.name, accountName, "accounts name is wrong");
                accountId = response.id;
                done();
            }
        }) 
    })

    it('Shall get account info', function (done) {
        helpers.accounts.getAccountInfo(accountId, userToken, function (err, response) {
            if (err) {
                done(new Error("Cannot get account info: " + err));
            } else {
                accountInfo = response;
                done();
            }
        })
    })

    it('Shall update an account', function (done) {

        accountInfo.attributes = {
            "phone":"123456789",
            "another_attribute":"another_value",
            "new":"next_string_value"
        }

        helpers.accounts.updateAccount(accountId, userToken, accountInfo, function (err, response) {
            if (err) {
                done(new Error("Cannot update account: " + err));
            } else {
                assert.deepEqual(response.attributes, accountInfo.attributes, 'new attributes not being updated');
                done();
            }
        })
    })

    it('Shall get account activation code', function (done) {

        helpers.accounts.getAccountActivationCode(accountId, userToken, function (err, response) {
            if (err) {
                done(new Error("Cannot get account activation code: " + err));
            } else {
                done();
            }
        })
    })

    it('Shall refresh account activation code', function (done) {

        helpers.accounts.refreshAccountActivationCode(accountId, userToken, function (err, response) {
            if (err) {
                done(new Error("Cannot refresh account activation code: " + err));
            } else {
                done();
            }
        })
    })

    it('Shall list all users for account', function (done) {
        
        helpers.accounts.getAccountUsers(accountId, userToken, function (err, response) {
            if (err) {
                done(new Error("Cannot list users for account: " + err));
            } else {
                for(var key in response.accounts){
                    assert.equal(key, accountId, 'wrong user account') //only one key in accounts
                }
                done();
            }
        })
    })


    it('Shall create device', function(done) {
        assert.notEqual(accountId, null, "Invalid account id")

        helpers.devices.createDevice(deviceName, deviceId, userToken, accountId, function(err, response) {
            if (err) {
                done(new Error("Cannot create device: " + err));
            } else {
                assert.equal(response.deviceId, deviceId, 'incorrect device id')
                assert.equal(response.name, deviceName, 'incorrect device name')
                done();
            }
        })
    })

    it('Shall get a list of all devices', function(done) {

        helpers.devices.getDevices(userToken, accountId, function(err, response) {
            if (err) {
                done(new Error("Cannot get list of devices: " + err));
            } else {
                assert.equal(response[0].deviceId, deviceId, 'incorrect device id')
                done();
            }
        })
    })

    it('Shall update info of a device', function(done) {
        var deviceInfo = {
            "gatewayId": deviceId,
            "name": deviceName,
            "loc": [ 45.12345, -130.654321, 121.1],
            "attributes": {
                "vendor": "intel",
                "platform": "x86",
                "os": "linux"
            }
        }
        helpers.devices.updateDeviceDetails(userToken, accountId, deviceId, deviceInfo, function(err, response) {
            if (err) {
                done(new Error("Cannot update device info: " + err));
            } else {
                assert.notEqual(response, null ,'device list is null')
                assert.deepEqual(response.attributes, deviceInfo.attributes, 'device info is not updated')
                done();
            }
        })
    })

    it('Shall get detail of one devices', function(done) {

        helpers.devices.getDeviceDetails(userToken, accountId, deviceId, function(err, response) {
            if (err) {
                done(new Error("Cannot get detail of device: " + err));
            } else {
                assert.equal(response.deviceId, deviceId, 'incorrect device id')
                assert.deepEqual(response.attributes,
                    {"vendor": "intel", "platform": "x86", "os": "linux"},
                    'incorrect device attributes' )
                done();
            }
        })
    })

    it('Shall activate device', function(done) {
        assert.notEqual(deviceId, null, "Invalid device id")

        helpers.devices.activateDevice(userToken, accountId, deviceId, function(err, response) {
            if (err) {
                done(new Error("Cannot activate device " + err));
            } else {
                assert.isString(response.deviceToken, 'device token is not string')
                deviceToken = response.deviceToken;
                done();
            }
        })
    })

})
/*
describe("Geting and manage alerts ... \n".bold, function(){

    it('Shall get list of alerts', function(done){
        assert.notEqual(accountId, null, "Invalid account id")
        
        helpers.alerts.getListOfAlerts(userToken, accountId, function(err, response) {
            if (err) {
                done(new Error("Cannot get list of alerts: " + err));
            } else {
                assert.notEqual(response, null ,'device list is null')
                console.dir(response)
                alertId = response.alertId
                done();
            }
        })
    })

    it('Shall get alert infomation', function(done){
        assert.notEqual(accountId, null, "Invalid account id")
        
        helpers.alerts.getAlertDetails(userToken, accountId, function(err, response) {
            if (err) {
                done(new Error("Cannot get list of alerts: " + err));
            } else {
                assert.notEqual(response, null ,'device list is null')
                console.dir(response.conditions)
                alertId = response.alertId
                done();
            }
        })
    })
})
*/
describe("Creating components and rules ... \n".bold, function() {

    it('Shall create component', function(done) {
        assert.notEqual(deviceToken, null, "Invalid device token")

        helpers.devices.addDeviceComponent(componentName, componentType, userToken, accountId, deviceId, false, function(err, id) {
            if (err) {
                done(new Error("Cannot create component: " + err));
            } else {
                componentId = id;
                done();
            }
        })
    }).timeout(10000);


    it('Shall create actuator', function(done) {
        assert.notEqual(deviceToken, null, "Invalid device token")

        helpers.devices.addDeviceComponent(actuatorName, actuatorType, userToken, accountId, deviceId, false, function(err, id) {
            if (err) {
                done(new Error("Cannot create actuator: " + err));
            } else {
                actuatorId = id;
                done();
            }
        })
    }).timeout(10000);

    it('Shall create switch-on actuation command', function(done) {
        assert.notEqual(actuatorId, null, "Invalid actuator id")


        helpers.control.saveComplexCommand(switchOnCmdName, componentParamName, 1, userToken, accountId, deviceId, actuatorId, function(err) {
            if (err) {
                done(new Error("Cannot create switch-on command: " + err));
            } else {
                done();
            }
        })

    }).timeout(10000);

    it('Shall create switch-off actuation command', function(done) {
        assert.notEqual(actuatorId, null, "Invalid actuator id")

        helpers.control.saveComplexCommand(switchOffCmdName, componentParamName, 0, userToken, accountId, deviceId, actuatorId, function(err) {
            if (err) {
                done(new Error("Cannot create switch-off command: " + err));
            } else {
                done();
            }
        })

    }).timeout(10000);

    it('Shall create switch-on rule', function(done) {
        assert.notEqual(deviceToken, null, "Invalid device token")

        rules[switchOnCmdName].cid = componentId;

        helpers.rules.createRule(rules[switchOnCmdName], userToken, accountId, deviceId, function(err, id) {
            if (err) {
                done(new Error("Cannot create switch-on rule: " + err));
            } else {
                rules[switchOnCmdName].id = id;
                done();
            }
        })

    }).timeout(20000);

    it('Shall create switch-off rule', function(done) {
        assert.notEqual(deviceToken, null, "Invalid device token")

        rules[switchOffCmdName].cid = componentId;

        helpers.rules.createRule(rules[switchOffCmdName], userToken, accountId, deviceId, function(err, id) {
            if (err) {
                done(new Error("Cannot create switch-off rule: " + err));
            } else {
                rules[switchOffCmdName].id = id;
                done();
            }
        })

    }).timeout(20000);
})

describe("Sending observations and cheking rules ...\n".bold, function() {

    it('Shall send observation and check rules', function(done) {
        assert.notEqual(componentId, null, "Invalid component id")
        assert.notEqual(rules[switchOnCmdName].id, null, "Invalid switch-on rule id")
        assert.notEqual(rules[switchOffCmdName].id, null, "Invalid switch-off rule id")
        assert.notEqual(proxyConnector, null, "Invalid websocket proxy connector")

        var index = 0;
        var nbActuations = 0;
        
        process.stdout.write("    ");

        for (var i = 0; i < temperatureValues.length; i++) {
            temperatureValues[i].ts = null;
            if (temperatureValues[i].expectedActuation != null) {
                nbActuations++;
            }
        }

        var step = function(){
            index++;

            if (index == temperatureValues.length) {
                process.stdout.write("\n");
                done();
            } else {
                sendObservationAndCheckRules(index);
            }
        };

        helpers.connector.wsConnect(proxyConnector, deviceToken, deviceId, function(message) {
            --nbActuations;

            var expectedValue = temperatureValues[index].expectedActuation.toString();
            var componentParam = message.content.params.filter(function(param){
                return param.name == componentParamName;
            });
            if(componentParam.length == 1)
            {
                var param = componentParam[0];
                var paramValue = param.value.toString();

                if(paramValue == expectedValue)
                {
                    step();
                }
                else
                {
                    done(new Error("Param value wrong. Expected: " + expectedValue + " Received: " + paramValue));
                }
            }
            else
            {
                done(new Error("Did not find component param: " + componentParamName))
            }
        });

        var sendObservationAndCheckRules = function(index) {
            
            process.stdout.write(".".green);

            helpers.devices.submitData(temperatureValues[index].value, deviceToken, accountId, deviceId, componentId, function(err, ts) {
                temperatureValues[index].ts = ts;

                if (index == 0) {
                    firstObservationTime = temperatureValues[index].ts;
                }

                if (err) {
                    done( "Cannot send observation: "+err)
                }

                if (temperatureValues[index].expectedActuation == null) {
                    step();
                }
            });
        }

        sendObservationAndCheckRules(index);

    }).timeout(120000)

    //---------------------------------------------------------------

    it('Shall check observation', function(done) {
        helpers.data.getData(firstObservationTime, userToken, accountId, deviceId, componentId, function(err, data) {
            if (err) {
                done(new Error("Cannot get data: " + err))
            }

            if (data && data.length >= temperatureValues.length) {
                for (var i = 0; i < data.length; i++) {
                    for (var j = 0; j < temperatureValues.length; j++) {
                        if (temperatureValues[j].ts == data[i].ts && temperatureValues[j].value == data[i].value) {
                            temperatureValues[j].ts = null;
                        }
                    }
                }

                var err = "";
                for (var i = 0; i < temperatureValues.length; i++) {
                    if (temperatureValues[i].ts != null) {
                        err += "[" + i + "]=" + temperatureValues[i].value + " ";
                    }
                }
                if (err.length == 0) {
                    done();
                } else {
                    done(new Error("Got wrong data for " + err))
                }
            } else {
                done(new Error("Cannot get data"))
            }

        })
    }).timeout(10000);

});
