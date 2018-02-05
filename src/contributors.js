"use strict";
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.contributors");

fluid.defaults("gpii.qi.api.contributors", {
    gradeNames: ["gpii.qi.api.common", "gpii.express.middleware"],
    path: "/:repoOwner/:repoName/contributors",
    invokers: {
        middleware: {
            funcName: "gpii.qi.api.contributors.handleRequest",
            args: ["{that}", "{arguments}.0", "{arguments}.1"] // request, response
        }
    }
});

gpii.qi.api.contributors.handleRequest = function (that, request, response) {
    var owner = request.params.repoOwner;
    var repo = request.params.repoName;

    gpii.qi.api.contributors.getContributors(that, owner, repo).then(function (result) {
        var statusCode = that.options.responses.github.success.statusCode;
        return that.events.onResult.fire(statusCode, result, request, response);
    }).catch(function (error) {
        that.events.onError.fire(error.message);
        return that.events.onResult.fire(error.statusCode, error, request, response);
    });
}

gpii.qi.api.contributors.getContributors = function (that, owner, repo) {
    return gpii.qi.api.common.makeStatsApiRequest(that, owner, repo).then(function (result) {
        var contributorsPerWeek = {};

        result.forEach(function (contributor) {
            contributor.weeks.forEach(function (week) {
                contributorsPerWeek[week.w] = contributorsPerWeek[week.w] || 0;
                if (week.c) {
                    ++contributorsPerWeek[week.w];
                }
            });
        });

        return {
            summary: {
                numberOfContributors: result.length
            },
            events: gpii.qi.api.common.processEvents(contributorsPerWeek)
        };
    });
}
