"use strict";
var fluid = require("infusion");
var gpii = fluid.registerNamespace("gpii");
var moment = require("moment");

fluid.registerNamespace("gpii.qi.api.commits");

fluid.defaults("gpii.qi.api.commits", {
    gradeNames: ["gpii.express.middleware.requestAware"],
    path: "/:repoOwner/:repoName/commits",
    handlerGrades: ["gpii.qi.api.commits.handler"]
});

fluid.defaults("gpii.qi.api.commits.handler", {
    gradeNames: ["gpii.qi.api.common", "gpii.express.middleware.requestAware"],
    invokers: {
        handleRequest: {
            funcName: "gpii.qi.api.commits.handleRequest",
            args: ["{that}"]
        }
    }
});

gpii.qi.api.commits.handleRequest = function (that) {
    var owner = that.options.request.params.repoOwner;
    var repo = that.options.request.params.repoName;

    gpii.qi.api.commits.getCommits(that, owner, repo).then(function (result) {
        var statusCode = that.options.responses.github.success.statusCode;
        return that.events.onResult.fire(statusCode, result);
    }).catch(function (error) {
        that.events.onError.fire(error.message);
        return that.events.onResult.fire(error.statusCode, error);
    });
}

gpii.qi.api.commits.getMostFrequentCommitter = function (contributors) {
    // The Statistics endpoint returns the most active contributor object last.
    return contributors[contributors.length - 1];
}

// Returns an object containing:
//  - totalCommits: the number of total commits made by all contributors
//  - commitsPerWeek: how many commits were made per week
gpii.qi.api.commits.processCommitCounts = function (contributors) {
    var totalCommits = 0;
    var commitsPerWeek = {};

    contributors.forEach(function (contributor) {
        totalCommits += contributor.total;
        contributor.weeks.forEach(function (currentWeek) {
            commitsPerWeek[currentWeek.w] = commitsPerWeek[currentWeek.w] || 0;
            commitsPerWeek[currentWeek.w] += currentWeek.c;
        });
    });

    return {
        totalCommits: totalCommits,
        commitsPerWeek: commitsPerWeek
    }
}

gpii.qi.api.commits.getCommits = function (that, owner, repo) {
    return gpii.qi.api.common.makeStatsApiRequest(that, owner, repo).then(function (result) {
        var mostFrequentCommitter = gpii.qi.api.commits.getMostFrequentCommitter(result);
        var commits = gpii.qi.api.commits.processCommitCounts(result);

        return {
            summary: {
                mostFrequentCommitter: mostFrequentCommitter.author.login,
                mostFrequentCommitterTotalCommits: mostFrequentCommitter.total,
                totalCommits: commits.totalCommits
            },
            events: gpii.qi.api.common.processEvents(commits.commitsPerWeek)
        };
    });
}
