/* eslint-env node */
"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

fluid.require("%qi-api");
fluid.require("%gpii-express");

fluid.registerNamespace("gpii.qi.api.harness");

fluid.defaults("gpii.qi.api.harness", {
    gradeNames: ["fluid.component"],
    port: 3000,
    timeout: 10000,
    ci: {
        authorizedProjects: ["p4a-test/nuts-and-bolts", "fluid-project/infusion"],
        payload: "./payloads/ci.json"
    },
    github: {
        accessToken: "{gpii.launcher.resolver}.env.GITHUB_PERSONAL_ACCESS_TOKEN",
        apiHost: "api.github.com",
        apiVersion: "v3",
        retryAttemptsLimit: 10,
        retryAttemptsTimeout: 1000,
        userAgent: "Node.js"
    },
    distributeOptions: [
        {
            record: "{that}.options.timeout",
            target: "{that gpii.express.middleware}.options.timeout"
        },
        {
            source: "{that}.options.github",
            target: "{that gpii.express.middleware}.options.github"
        },
        {
            source: "{that}.options.ci",
            target: "{that gpii.express.middleware}.options.ci"
        }
    ],
    components: {
        express: {
            type: "gpii.express",
            options: {
                port : "{harness}.options.port",
                components: {
                    api: {
                        type: "gpii.qi.api"
                    }
                }
            }
        }
    }
});
