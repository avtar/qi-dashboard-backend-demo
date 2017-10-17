"use strict";
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.registerNamespace("gpii.qi.api.commits");

gpii.qi.api.commits.results = function (that) {
    that.sendResponse(200, that.options.request.params);
}

fluid.defaults("gpii.qi.api.commits.handler", {
    gradeNames: ["gpii.express.handler"],
    invokers: {
        handleRequest: {
            funcName: "gpii.qi.api.commits.results",
            args: ["{that}"]
        }
    }
});

fluid.defaults("gpii.qi.api.commits", {
    gradeNames: ["gpii.express.middleware.requestAware"],
    path: "/:repoAccount/:repoName/commits",
    handlerGrades: ["gpii.qi.api.commits.handler"]
});
