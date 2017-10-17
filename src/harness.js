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
    ci: {
        payload: "./payloads/ci.json",
        validProjects: ["p4a-test/nuts-and-bolts", "fluid-project/infusion"]
    },
    github: {
        apiHost: "https://api.github.com",
        requestAttempts: 5,
        requestTimeout: 3000,
        requestUserAgent: "Node.js",
        requestGitHubStatusCode: 202
    },
    distributeOptions: [
        {
            record: 5000,
            target: "{that gpii.express.handler}.options.timeout"
        },
        {
            source: "{that}.options.github",
            target: "{that gpii.express.handler}.options.github"
        },
        {
            source: "{that}.options.ci",
            target: "{that gpii.qi.api.ci.handler}.options.ci"
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
