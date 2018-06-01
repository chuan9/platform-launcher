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


function getRuleDetails(userToken, accountId, ruleId, cb) {
    if (!cb) {
        throw "Callback required";
    }
    var data = {
        userToken: userToken,
        accountId: accountId,
        ruleId: ruleId
    };

    api.rules.getRuleDetails(data, function(err, response) {
        if (err) {
            cb(err)
        } else {
            if ( response.id == ruleId ) {
                {
                    cb(null, response.synchronizationStatus == "Sync" ? true : false)
                }
            }
            else {
                cb("rule "+ruleId + " not found ");
            }
        }
    });
} 


function createRule(ruleConfig, userToken, accountId, deviceId, cb) {
    if (!cb) {
        throw "Callback required";
    }

    var data = {
        userToken: userToken,
        accountId: accountId,

        body: {
            name: ruleConfig.name,
            description: "OISP testing rule",
            priority: "Medium",
            type: "Regular",
            status: "Active",
            resetType: "Automatic",

            actions: [{
                type: "actuation",
                target: [
                    ruleConfig.actuationCmd
                ]
            }],


            population: {
                ids: [deviceId],
                attributes: null,
                tags: null
            },

            conditions: {
                operator: "OR",
                values: [{
                    component: {
                        dataType: "Number",
                        name: ruleConfig.conditionComponent,
                        cid: ruleConfig.cid
                    },
                    type: "basic",
                    values: [ruleConfig.basicConditionValue.toString()],
                    operator: ruleConfig.basicConditionOperator
                }]
            }
        }
    };


    api.rules.createRule(data, function(err, response) {
        if (err) {
            cb(err)
        } else {
            var ruleId = response.id;
            var syncInterval = setInterval( function(id) {
                getRuleDetails(userToken, accountId, ruleId, function(err, status) {
                    if (err) {
                        clearInterval(syncInterval);
                        cb(err)
                    }
                    else {
                        if ( status == true ) {
                            clearInterval(syncInterval);
                            cb(null, ruleId)
                        }
                    }
                })
            }, 500)
        }
    });

}

module.exports={
    createRule:createRule
}