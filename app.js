"use strict";

var express = require("express");
var bodyParser = require("body-parser");

var repo = require("./src/repository.js");

var port = process.env.QI_DASHBOARD_BACKEND_TCP_PORT || 3000;
var app = express();

app.use(bodyParser.json());

app.get("/a/:owner/:repo/contributors", repo.httpHandler(repo.getContributors));

app.get("/a/:owner/:repo/commits", repo.httpHandler(repo.getCommits));

// TODO: Remove after P4A March 2017 F2F. Only used for https://github.com/p4a-test/nuts-and-bolts
// demo repository.
app.get("/a/:owner/:repo/ci", repo.httpHandler(repo.getCIResults));

app.listen(port, function () {
    console.log("Listening on port " + port);
});
