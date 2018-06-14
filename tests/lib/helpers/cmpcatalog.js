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

var config = require("../../test-config.json");
var oispSdk = require("@open-iot-service-platform/oisp-sdk-js");
var api = oispSdk(config).api.rest;


function getCatalog(deviceToken, accountId, cb){
    if (!cb) {
        throw "Callback required";
    }

    var data = {
        deviceToken: deviceToken,
        accountId: accountId,
        body: {
            full: true
        }
    };

    api.cmpcatalog.getCatalog(data, function(err, response) {
        assert.notEqual(response, null, 'response is null')
        if (err) {
            cb(err)
        } else {
            cb(null, response)
        }
    });
}


function createCatalog(deviceToken, accountId, cb){
    if (!cb) {
        throw "Callback required";
    }

    var data = {
        deviceToken: deviceToken,
        accountId: accountId,
        body:
            {
                "dimension": "speed",
                "version": "1.0",
                "type": "sensor",
                "dataType": "Number",
                "format": "float",
                "min": 0,
                "max": 1000,
                "measureunit": "Degress Celsius",
                "display": "timeSeries"
            }
    };

    api.cmpcatalog.createCatalog(data, function(err, response) {
        assert.notEqual(response, null, 'response is null')
        if (err) {
            cb(err)
        } else {
            cb(null, response)
        }
    });
}

module.exports={
    getCatalog: getCatalog,
    createCatalog: createCatalog
}