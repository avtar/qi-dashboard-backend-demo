"use strict";
var fs = require("fs");
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.common");

fluid.defaults("gpii.qi.api.common", {
    gradeNames: ["fluid.component"],
    members: {
        ghRequestAttempts: null
    },
    events: {
        onLogError: null,
        onReturnResult: null
    },
    listeners: {
        "onCreate.logRequest": {
            funcName: "gpii.qi.api.common.logRequest",
            priority: "first",
            args: "{that}.options.request.originalUrl"
        },
        "onLogError": {
            funcName: "gpii.qi.api.common.logError",
            args: "{arguments}.0"
        },
        "onReturnResult": {
            funcName: "gpii.qi.api.common.returnResult",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    },
    responses: {
        ci: {
            success: {
                statusCode: 200,
                isError: false
            },
            payloadUnavailable: {
                message: "CI data is not available for this project.",
                statusCode: 404,
                isError: true
            }
        }
    }
})

gpii.qi.api.common.logError = function (errorMessage) {
    fluid.log("Error: " + errorMessage);
};

gpii.qi.api.common.logRequest = function (url) {
    fluid.log("Request: " + url);
};

gpii.qi.api.common.returnResult = function (that, statusCode, result) {
    that.sendResponse(statusCode, result);
}
