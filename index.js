"use strict";
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");

require("./src/");

fluid.module.register("qi-api", __dirname, require);

fluid.registerNamespace("gpii.qi.api");

module.exports = gpii.qi.api;
