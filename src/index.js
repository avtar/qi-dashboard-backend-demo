"use strict";
var fluid = require("infusion");
var gpii  = fluid.registerNamespace("gpii");

require("./commits");
require("./ci")

fluid.defaults("gpii.qi.api", {
    gradeNames: ["gpii.express.router"],
    path: "/a",
    components: {
        json: {
            type: "gpii.express.middleware.bodyparser.json",
            options: {
                priority: "first"
            }
        },
        commits: {
            type: "gpii.qi.api.commits"
        },
        ci: {
            type: "gpii.qi.api.ci"
        }
    }
});
