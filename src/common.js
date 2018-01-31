"use strict";
var fs = require("fs");
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");
var express = require("express");
var moment = require("moment");
var request = require("request");

fluid.registerNamespace("gpii.qi.api.common");

fluid.defaults("gpii.qi.api.common", {
    gradeNames: ["fluid.component"],
    timeout: 10000,
    github: {
        accessToken: "{gpii.launcher.resolver}.env.GITHUB_ACCESS_TOKEN",
        apiHost: "api.github.com",
        apiVersion: "v3",
        userAgent: "Node.js",
        retryAttemptsLimit: 10,
        retryAttemptsTimeout: 1000
    },
    events: {
        onError: null,
        onResult: null
    },
    listeners: {
        "onCreate.logRequest": {
            funcName: "gpii.qi.api.common.logRequest",
            priority: "first",
            args: "{that}.options.request.originalUrl"
        },
        "onError.logError": {
            funcName: "gpii.qi.api.common.logError",
            args: "{arguments}.0"
        },
        "onResult.returnResult": {
            funcName: "gpii.qi.api.common.returnResult",
            args: ["{that}", "{arguments}.0", "{arguments}.1"]
        }
    },
    distributeOptions: [
        {
            source: "{that}.options.timeout",
            target: "{that gpii.express.handler}.options.timeout"
        }
    ],
    responses: {
        github: {
            success: {
                statusCode: 200,
                isError: false
            },
            dataNotFound: {
                message: "GitHub project or repository could not be found",
                statusCode: 404,
                isError: true
            },
            resultUnavailable: {
                message: "Unable to obtain result from GitHub",
                statusCode: 400,
                isError: true
            },
            retryRequest: {
                message: "Received a 202 response from GitHub, retrying request...",
                statusCode: 202,
                isError: false
            },
        },
        ci: {
            success: {
                statusCode: 200,
                isError: false
            },
            payloadUnavailable: {
                message: "CI data is not available for this project.",
                statusCode: 404,
                isError: true
            },
            inaccessibleFile: {
                message: "Could not access payload file.",
                statusCode: 400,
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

gpii.qi.api.common.wrapInCallback = function (callback, data) {
    return "/**/ typeof " + callback + " === \"function\" && " + callback + "(" + JSON.stringify(data) + ");";
}

gpii.qi.api.common.returnResult = function (that, statusCode, result) {
    var body;
    var callback = that.options.request.query.callback;

    if (callback) {
        body = gpii.qi.api.common.wrapInCallback(callback, result);
    } else {
        body = result;
    }

    that.sendResponse(statusCode, body);
}

gpii.qi.api.common.concatWithSlash = function (owner, repo) {
    return [owner, repo].join("/").toLowerCase();
}

// Creates the events array (in both functions: commits and contributors)
gpii.qi.api.common.processEvents = function (activity) {

    // Order dates DESC (the most recent will be the first one in the array)
    var sortDates = function (firstDate, secondDate) {
        return firstDate < secondDate ? 1 : -1;
    }

    // Convert the week timestamp into an object containing:
    //  - timestamp (String): Fromatted as YYYY-MM-DD
    //  - value (Number): The number of commits made that week
    var normalizeDates = function (weekTimestamp) {
        return {
            timestamp: moment(weekTimestamp * 1000).format("YYYY-MM-DD"),
            value: activity[weekTimestamp]
        };
    }

    var hasCommits = function (weeklyActivity) {
        // GitHub returns 0 values for weeks that don't have any commits, removing those from our
        // results here.
        return weeklyActivity.value;
    }

    // Get the dates
    return Object.keys(activity)
        // Sort
        .sort(sortDates)
        // Create the { timestamp, value } pairs
        .map(normalizeDates)
        // Remove the ones having value: 0
        // (keep the dates with commits)
        .filter(hasCommits);
}

gpii.qi.api.common.makeStatsApiRequest = function (that, owner, repo) {
    var ownerSlashRepo = gpii.qi.api.common.concatWithSlash(owner, repo);
    var endpoint = "/repos/" + ownerSlashRepo + "/stats/contributors";
    var retryAttemptsLimit = that.options.github.retryAttemptsLimit;

    return new Promise(function (resolve, reject) {
        gpii.qi.api.common.makeRequest(that, endpoint, retryAttemptsLimit, function (error, body, response) {
            // Checking for body here in the perhaps unlikely case that someone issues a request for an
            // empty repository with no commits and contributors
            if (error || !body) {
                var obj;
                var statusCode = response && response.statusCode || 400;
        
                if (statusCode === 404) {
                    obj = that.options.responses.github.dataNotFound;
                } else {
                    obj = that.options.responses.github.resultUnavailable;
                }
        
                return reject(obj);
            }
            resolve(body)
        })
    })
}

gpii.qi.api.common.makeRequest = function (that, url, retryAttemptsLimit, callback) {
    var apiVersion = that.options.github.apiVersion;
    var requestAttempts = that.options.github.requestAttempts || 5;
    var githubApiHost = that.options.github.apiHost;
    var userAgent = that.options.github.userAgent;
    var retryAttemptsTimeout = that.options.github.retryAttemptsTimeout;
    var query = query || {};
    
    query.access_token = that.options.github.accessToken;
    retryAttemptsLimit = retryAttemptsLimit || 5;
    
    request({
        url: githubApiHost + url,
        qs: query,
        json: true,
        headers: {
            "User-agent": userAgent,
            "Accept": "application/vnd.github." + apiVersion + "+json"
        }
    }, function (error, response, body) {
        // The GitHub Statistics API documentation states that if the required data hasn't been
        // been computed and cached then a 202 reponse is returned. Additional requests need to be
        // made once their background jobs have completed, yielding a successful 200 response.
        if (response && response.statusCode === 202) {
            // Ran out of request attempts and none of them were successful
            if (--retryAttemptsLimit === 0) {
                return response.statusCode = 400;
            }

            // Wait and try again until GitHub can provide the cached result
            fluid.log(that.options.responses.github.retryRequest.message);
            return setTimeout(function () {
                gpii.qi.api.common.makeRequest(that, url, retryAttemptsLimit, callback);
            }, retryAttemptsTimeout);
        }

        if (!error && response.statusCode >= 400) {
            error = new Error(that.options.responses.github.resultUnavailable.message);
        }

        if (error) return callback(error, null, response);

        fluid.log(response.headers["x-ratelimit-remaining"] + " GitHub API hourly requests remaining");
        callback(null, body, response);
    });
}