/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

fluid.require("%qi-api");
fluid.require("%gpii-launcher");

fluid.defaults("gpii.qi.api.launcher", {
    gradeNames: ["gpii.launcher"],
    yargsOptions: {
        describe: {
            "port": "Use this port to accept requests."
        },
        help: true,
        defaults: {
            "optionsFile": "%qi-api/configs/prod.json"
        }
    }
});

gpii.qi.api.launcher();
