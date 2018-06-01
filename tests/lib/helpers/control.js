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

//-------------------------------------------------------------------------------------------------------
// Helper Functions
//-------------------------------------------------------------------------------------------------------

var chai = require('chai');
var assert = chai.assert;

var oispSdk = require("@open-iot-service-platform/oisp-sdk-js");
var api = oispSdk.api.rest;


function pullActuations(from, maxItems, deviceToken, accountId, deviceId, cid, cb) {
    if (!cb) {
        throw "Callback required";
    }

    var data = {
        from: from,
        deviceToken: deviceToken,
        accountId: accountId,
        deviceId: deviceId
    };
    
    api.control.pullActuations(data, function(err, response) {
        if (err) {
            cb(err)
        } else {
            var actuations = [];

            for (var i = 0; i < response.length; i++) {
                if (response[i].componentId == cid) {
                    if (actuations.length < maxItems) {
                        actuations.push(response[i].parameters[0].value);
                    } else {
                        break;
                    }
                }
            }

            cb(null, actuations)
        }
    })

}

function saveComplexCommand(name, paramName, value, userToken, accountId, deviceId, actId, cb) {
    if (!cb) {
        throw "Callback required";
    }

    var data = {
        userToken: userToken,
        accountId: accountId,
        commandName: name,
        body: {
            commands: [{
                componentId: actId,
                transport: "ws",
                parameters: [{
                    name: paramName,
                    value: value.toString()
                }]
            }]
        },
        deviceId: deviceId
    };

    api.control.saveComplexCommand(data, function(err, response) {
        assert.notEqual(response, null, 'response is null')
        cb(err);
    });
}

module.exports={
    saveComplexCommand: saveComplexCommand,
    pullActuations: pullActuations
}