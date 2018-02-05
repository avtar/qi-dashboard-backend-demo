"use strict";
var fs = require("fs");
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.ci");

fluid.defaults("gpii.qi.api.ci", {
    gradeNames: ["gpii.qi.api.common", "gpii.express.middleware"],
    path: "/:repoOwner/:repoName/ci",
    invokers: {
        middleware: {
            funcName: "gpii.qi.api.ci.handleRequest",
            args: ["{that}", "{arguments}.0", "{arguments}.1"] // request, response
        }
    }
});

gpii.qi.api.ci.handleRequest = function (that, request, response) {
    var owner = request.params.repoOwner;
    var repo = request.params.repoName;
    var authorizedProjects = that.options.ci.authorizedProjects;
    var payload = gpii.qi.api.ci.loadPayload(that.options.ci.payload);

    if (!payload) {
        var error = that.options.responses.ci.inaccessibleFile;

        that.events.onError.fire(error.message);
        return that.events.onResult.fire(error.statusCode, error, request, response);
    }

    var unauthorized = gpii.qi.api.ci.isUnauthorizedProject(owner, repo, authorizedProjects);

    if (unauthorized) {
        var error = that.options.responses.ci.payloadUnavailable;

        that.events.onError.fire(error.message);
        return that.events.onResult.fire(error.statusCode, error, request, response);
    }

    that.events.onResult.fire(that.options.responses.ci.success.statusCode, payload, request, response);
}

gpii.qi.api.ci.isUnauthorizedProject = function (owner, repo, authorizedProjects) {
    var ownerSlashRepo = gpii.qi.api.common.concatWithSlash(owner, repo);

    return (authorizedProjects.indexOf(ownerSlashRepo) === -1) ? true : false;
}

gpii.qi.api.ci.loadPayload = function (file) {
    var payload = undefined;

    try {
        payload = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
    }

    return payload;    
}
