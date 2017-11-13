"use strict";
var fs = require("fs");
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.ci");

fluid.defaults("gpii.qi.api.ci", {
    gradeNames: ["gpii.express.middleware.requestAware"],
    path: "/:repoAccount/:repoName/ci",
    handlerGrades: ["gpii.qi.api.ci.handler"],
});

fluid.defaults("gpii.qi.api.ci.handler", {
    gradeNames: ["gpii.qi.api.common", "gpii.express.middleware.requestAware"],
    invokers: {
        handleRequest: {
            funcName: "gpii.qi.api.ci.results",
            args: ["{that}"]
        }
    }
});

gpii.qi.api.ci.results = function (that) {
    var unauthorized = gpii.qi.api.ci.isUnauthorizedProject(that);
    var payload = gpii.qi.api.ci.loadPayload(that.options.ci.payload);

    if (unauthorized || !payload) {
        var error = that.options.responses.ci.payloadUnavailable;

        that.events.onLogError.fire(error.message);
        return that.events.onReturnResult.fire(error.statusCode, error);
    }

    that.events.onReturnResult.fire(that.options.responses.ci.success.statusCode, payload);    
}

gpii.qi.api.ci.isUnauthorizedProject = function (that) {
    var account = that.options.request.params.repoAccount;
    var repo = that.options.request.params.repoName;
    var string = [account, repo].join("/").toLowerCase();
    var authorizedProjects = that.options.ci.authorizedProjects;

    return (authorizedProjects.indexOf(string) === -1) ? true : false;
}

gpii.qi.api.ci.loadPayload = function (file) {
    var payload = undefined;

    try {
        payload = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (e) {
        gpii.qi.api.common.logError("Could not read payload file.");
    }

    return payload;    
}
