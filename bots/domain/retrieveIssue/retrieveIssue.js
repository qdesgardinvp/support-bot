require('dotenv').config();
const request = require('request');
const fs = require('fs');
const Task = require("../task");
const IssueDetails = require('./issueDetails');

const TASK_NAME = 'retrieveIssue';

class RetrieveIssue extends Task {
    constructor() {
        super();

        this.steps = JSON.parse(fs.readFileSync('bots/domain/retrieveIssue/retrieveIssueSteps.json', 'utf8'))
            .sort((a, b) => a.id - b.id);
        this.description = 'Answer a few questions to create a JIRA issue';
    }

    /**
     * Finalize task by sending data to JIRA
     *
     * @param {object} data 
     *
     * @returns {Promise}
     */
    finalize(data) {
        const issueId = data.issueId || 'RED-XXX';
        return new Promise((resolve, reject) => {
            request.get(process.env.JIRA_SEARCH_URL.replace('{jiraKey}', issueId), {
                auth: {
                    username: process.env.JIRA_USER,
                    pass: process.env.JIRA_PASSWORD,
                }
            }, (error, response, body) => {
                if (error) {
                    reject({
                        success: false,
                        error: error,
                        message: `Unable to create JIRA issue: ${ error }`
                    });
                }

                body = JSON.parse(body);
                if (body.errorMessages) {
                    reject({
                        success: false,
                        error: null,
                        message: body.errorMessages.join(', ')
                    });

                    return;
                }

                let issueDetails = '';
                try {
                    issueDetails = this.formatIssueDetailResponse(body, issueId);
                } catch(e) {
                    reject({
                        success: false,
                        error: null,
                        message: `Unable to parse Jira issue data: ${ e.message }`
                    });

                    return;
                }

                resolve({
                    success: true,
                    message: `Jira issue  details: \n `
                        .concat(issueDetails)
                });
            });
        });
    }

    /**
     * Format response from Jira
     *
     * @param {object} response Response from Jira API
     * @param {string} searchedIssue Jira Id
     *
     * @returns {string}
     */
    formatIssueDetailResponse(response, searchedIssue) {
        const issueDetails = response.issues.find(issue => issue.key == searchedIssue);
        if (!issueDetails) {
            throw new Error('Issue not found in response');
        }

        const finalIssueDetails = new IssueDetails(issueDetails);

        return finalIssueDetails.toString();
    }

    /**
     * Check if the input seems to be a valid jira id
     *
     * @returns {object}
     */
    validateJiraIssue(input) {
        if (!input.trim().replace(' ', '')) {
            return { success: false, messages: ['Please provide a valid answer.'] };
        }

        return {
            success: true,
            messages: ['Loading...'],
        };
    }
}

module.exports = {
    TASK_NAME,
    RetrieveIssue,
};