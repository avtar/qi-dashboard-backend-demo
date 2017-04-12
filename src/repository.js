"use strict";

var fs = require("fs");
var request = require("request");
var moment = require("moment");

var token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
var GITHUB_API_HOST = "https://api.github.com";

// A config file was being used to whitelist GitHub accounts. Whitelisting is no longer required
// so leaving this commented out for now.
// var config;

// fs.readFile("./config.json", "utf8", function (err, data) {
//     if (err) throw err;
//     config = JSON.parse(data);
// });

function makeGithubRequest (url, query, callback) {
    if (typeof query === "function") {
        callback = query;
        query = undefined;
    }

    query = query || {};
    query.access_token = token;

    var requestAttempts = query.__requestAttempts || 5;
    delete query.__requestAttempts;

    request({
        url: GITHUB_API_HOST + url,
        qs: query,
        json: true,
        headers: {
            "User-agent": "Node.js"
        }
    }, function (err, res, data) {
        if (err) return callback(err, null, res);
         // The GitHub Statistics API documentation states that if the required data hasn't been
         // been computed and cached then a 202 reponse is returned. Additional requests need to be
         // made once their background jobs have completed, yielding a successful 200 response.
        if (res.statusCode === 202) {
            query.__requestAttempts = requestAttempts - 1;
            if (query.__requestAttempts === 0) {
                return callback(new Error("Unable to retrieve result from " + GITHUB_API_HOST), null, res);
            }
            console.log("Received a 202 response, retrying request...");
            return setTimeout(function () {
                makeGithubRequest(url, query, callback);
            }, 3000);
        }

        console.log(res.headers["x-ratelimit-remaining"] + " GitHub API hourly requests remaining");
        callback(null, data, res);
    });
}

function processEvents (activity) {
    return Object.keys(activity).sort(function(firstDate, secondDate) {
        return firstDate < secondDate ? 1 : -1;
    }).map(function(weekTimestamp) {
        return {
            timestamp: moment(weekTimestamp * 1000).format("YYYY-MM-DD"),
            value: activity[weekTimestamp]
        };
    }).filter(function (weeklyActivity) {
        // GitHub returns 0 values for weeks that don't have any commits, removing those from our
        // results here.
        return weeklyActivity.value;
    });
}

function getRepoContributors (owner, repo, callback) {
    makeGithubRequest("/repos/" + owner + "/" + repo + "/stats/contributors", callback);
}

function getContributors (owner, repo, callback) {
    getRepoContributors(owner, repo, function (err, contributors) {
        if (err) return callback(err);

        var contributorsPerWeek = {};

        contributors.forEach(function (currentContributor) {
            currentContributor.weeks.forEach(function (currentWeek) {
                contributorsPerWeek[currentWeek.w] = contributorsPerWeek[currentWeek.w] || 0;
                if (currentWeek.c) {
                    ++contributorsPerWeek[currentWeek.w];
                }
            });
        });

        var output = {
            summary: {
                numberOfContributors: contributors.length
            },
            events: processEvents(contributorsPerWeek)
        };

        callback(null, output);
    });
}

function getCommits (owner, repo, callback) {
    var numOfInvocations = 0;
    var contributors = null;
    var lastCommit = null;
    var err = null;

    function processResult (_res) {
        if (++numOfInvocations !== 2) return;
        if (err) return callback(err, null, _res);
        if (!contributors.length) return callback(new Error("No contributors found."), null, _res);
        if (!lastCommit) return callback(new Error("Could not get the last commit."), null, _res);

        // The Statistics endpoint returns the most active contributor object last.
        var mostFrequentCommitterData = contributors[contributors.length - 1];
        var totalCommits = 0;
        var commitsPerWeek = {};

        contributors.forEach(function (currentContributor) {
            totalCommits += currentContributor.total;
            currentContributor.weeks.forEach(function (currentWeek) {
                commitsPerWeek[currentWeek.w] = commitsPerWeek[currentWeek.w] || 0;
                commitsPerWeek[currentWeek.w] += currentWeek.c;
            });
        });

        var dateOfLastCommit = moment(lastCommit.commit.committer.date).format("YYYY-MM-DD");

        var output = {
            summary: {
                timeOfLastCommit: dateOfLastCommit,
                mostFrequentCommitter: mostFrequentCommitterData.author.login,
                mostFrequentCommitterTotalCommits: mostFrequentCommitterData.total,
                totalCommits: totalCommits
            },
            events: processEvents(commitsPerWeek)
        };

        callback(null, output, _res);
    }

    getRepoContributors(owner, repo, function (_err, _contributors, _res) {
        err = _err;
        contributors = _contributors;
        processResult(_res);
    });

    // This second endpoint and extra request is required so that the timeOfLastCommit value can
    // be determined. Only one page is required since the first object in the result represents
    // the first commit.
    makeGithubRequest("/repos/" + owner + "/" + repo + "/commits", {
        per_page: 1
    }, function (_err, _commits, _res) {
        err = _err;
        lastCommit = _commits[0];
        processResult(_res);
    });
};

function getCIResults(owner, repo, callback) {
    // Fake data is only returned for the p4a-test/nuts-and-bolts and fluid-project/infusion GitHub projects.
    var whiteList = [
        "p4a-test/nuts-and-bolts",
        "fluid-project/infusion"
    ];
    var fullName = [owner, repo].join("/").toLowerCase();

    // Returning an unused HTTP status code for this mock result.
    if (whiteList.indexOf(fullName) === -1) return callback(new Error("CI results not found."), null, {
        statusCode: 9000
    });

    var output = fs.readFileSync("./nuts-and-bolts-ci.json", "utf8");

    callback(null, JSON.parse(output));
}

function generateErrorMessage(message) {
    return {
        isError: true,
        message: message
    }
}

function httpHandler (fn) {
   return function (req, res) {
       var owner = req.params.owner;
       var repo = req.params.repo;

       fn(owner, repo, function (err, data, githubResponse) {
           if (err) {
               console.log(err);
               var githubStatusCode = githubResponse && githubResponse.statusCode;
               var statusCode = githubStatusCode || 400;
               if (statusCode === 404) {
                   err.message = "Data not found.";
               } else if (statusCode === 9000) {
                   err.message = "CI data is not available for this project."
                   // Reporting a real HTTP status code to clients instead of the mock one.
                   statusCode = 404;
               } else if (githubStatusCode >= 500) {
                   err.message = "Upstream API is not available."
               }
               return res.status(statusCode).json(generateErrorMessage(err.message));
           } else {
               return req.query.callback ? res.jsonp(data) : res.json(data);
           }
       });
   };
};

exports.getContributors = getContributors;
exports.getCommits = getCommits;
exports.getCIResults = getCIResults;
exports.httpHandler = httpHandler;
