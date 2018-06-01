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

var uuid = require('uuid/v4');

var chai = require('chai');
var assert = chai.assert;

var oispSdk = require("@open-iot-service-platform/oisp-sdk-js");
var api = oispSdk.api.rest;

function addUser(userToken, email, password, cb) {
    if (!cb) {
        throw "Callback required";
    }

    var data = {
        userToken: userToken,
        body: {
            email: email,
            password: password
        }            
    };

    api.users.addUser(data, function(err, response) {
        if (!err) {
            assert.equal(response.type, 'user', 'response with wrong type')
            assert.notEqual(response.id, null, 'response with null id')
            cb(null,response);
        }
        else {
            cb(err);
        }
    });
}

module.exports={
    addUser: addUser
}