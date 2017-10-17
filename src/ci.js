"use strict";
var fs = require("fs");
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.ci");

gpii.qi.api.ci.loadPayload = function (file) {
    var payload = fs.readFileSync(file, "utf8");
    return payload;    
}

gpii.qi.api.ci.generateError = function (message) {
    return {
        isError: true,
        message: message
    }
}

gpii.qi.api.ci.verifyProject = function (that) {
    var account = that.options.request.params.repoAccount;
    var repo = that.options.request.params.repoName;
    var string = [account, repo].join("/").toLowerCase();
    var validProjects = that.options.ci.validProjects;

    return (validProjects.indexOf(string) === -1) ? false : true;
}

gpii.qi.api.ci.results = function (that) {
    var verified = gpii.qi.api.ci.verifyProject(that);

    if (!verified) {
        var message = that.options.responses.error.message;
        var body = gpii.qi.api.ci.generateError(message);

        return that.sendResponse(that.options.responses.error.statusCode, body);
    }

    var file = that.options.ci.payload;
    var payload = gpii.qi.api.ci.loadPayload(file);
    var body = JSON.parse(payload);

    that.sendResponse(that.options.responses.success.statusCode, body);
}

fluid.defaults("gpii.qi.api.ci.handler", {
    gradeNames: ["gpii.express.handler"],
    invokers: {
        handleRequest: {
            funcName: "gpii.qi.api.ci.results",
            args: ["{that}"]
        }
    },
    responses: {
        success: {
            statusCode: 200
        },
        error: {
            message: "CI data is not available for this project.",
            statusCode: 404
        }
    }
});

fluid.defaults("gpii.qi.api.ci", {
    gradeNames: ["gpii.express.middleware.requestAware"],
    path: "/:repoAccount/:repoName/ci",
    handlerGrades: ["gpii.qi.api.ci.handler"],
});
