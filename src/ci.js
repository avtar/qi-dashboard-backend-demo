"use strict";
var fs = require("fs");
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.ci");

fluid.defaults("gpii.qi.api.ci", {
    gradeNames: ["gpii.express.middleware.requestAware"],
    path: "/:repoOwner/:repoName/ci",
    handlerGrades: ["gpii.qi.api.ci.handler"],
});

fluid.defaults("gpii.qi.api.ci.handler", {
    gradeNames: ["gpii.qi.api.common", "gpii.express.middleware.requestAware"],
    invokers: {
        handleRequest: {
            funcName: "gpii.qi.api.ci.handleRequest",
            args: ["{that}"]
        }
    }
});

gpii.qi.api.ci.handleRequest = function (that) {
    var unauthorized = gpii.qi.api.ci.isUnauthorizedProject(that);
    var payload = gpii.qi.api.ci.loadPayload(that.options.ci.payload);

    if (!payload) {
        var error = that.options.responses.ci.inaccessibleFile;

        that.events.onError.fire(error.message);
        return that.events.onResult.fire(error.statusCode, error);
    }

    if (unauthorized) {
        var error = that.options.responses.ci.payloadUnavailable;

        that.events.onError.fire(error.message);
        return that.events.onResult.fire(error.statusCode, error);
    }

    that.events.onResult.fire(that.options.responses.ci.success.statusCode, payload);
}

gpii.qi.api.ci.isUnauthorizedProject = function (that) {
    var owner = that.options.request.params.repoOwner;
    var repo = that.options.request.params.repoName;
    var ownerSlashRepo = gpii.qi.api.common.concatWithSlash(owner, repo);
    var authorizedProjects = that.options.ci.authorizedProjects;

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
