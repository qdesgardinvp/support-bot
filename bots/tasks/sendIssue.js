require('dotenv').config();
const request = require('request');
const fs = require('fs');
const Task = require('./task');
const { IncomingWebhook } = require('ms-teams-webhook');

const TASK_NAME = 'sendIssue';
const APP_NAME_LIST = [
    'turbo',
    'bong',
    'turbo',
    'ozone',
    'lemon',
    'pomelo',
    'strawberry',
    'plum',
    'other',
];

class SendIssue extends Task {

    constructor() {
        super();

        this.steps = JSON.parse(fs.readFileSync('bots/resources/sendIssueSteps.json', 'utf8'))
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
        // Used to test webhook without JIRA
        if (!+process.env.ENABLE_JIRA && +process.env.ENABLE_TEAMS_WEBHOOK) {
            this.sendWebhookTeams(data);
        }

        if (!+process.env.ENABLE_JIRA) {
            return {
                success: true,
                message: 'JIRA issue ID: TEST'
            };
        }

        const createIssue = {
            fields: {
                project: {
                    key: 'RED'
                },
                summary: data.issue,
                issuetype: {
                    name: 'Bug'
                },
                description: this.formatIssueDescription(data)
            }
        };

        return new Promise((resolve, reject) => {
            request.post({
                url: process.env.JIRA_ISSUE_URL,
                auth: {
                    username: process.env.JIRA_USER,
                    pass: process.env.JIRA_PASSWORD,
                },
                body: JSON.stringify(createIssue),
                headers: {
                    'Content-Type': 'application/json'
                }
            }, (error, response, body) => {
                if (error) {
                    reject({
                        success: false,
                        error: error,
                        message: `Unable to create JIRA issue: ${ error }`
                    });
                }

                if (+process.env.ENABLE_TEAMS_WEBHOOK) {
                    this.sendWebhookTeams(data);
                }

                body = JSON.parse(body);
                resolve({
                    success: true,
                    message: 'JIRA issue ID: ' + body.key
                });
            });
        });
    }

    /**
     * Create a Teams conversation => result of jira issue 
     *
     * @param {object} data Result of conversation
     * @param {number} jiraId
     */
    sendWebhookTeams(data, jiraId) {
        const webhook = new IncomingWebhook(process.env.TEAMS_WEBHOOK_URL);

        (async () => {
            await webhook.send({
              "@type": "MessageCard",
              "@context": "https://schema.org/extensions",
              summary: jiraId || "RED-XXX",
              themeColor: "0078D7",
              title: `Issue opened: "${ data['issue'] }"`,
              sections: [
                {
                  activityTitle: "RED squad",
                  activitySubtitle: (new Date()).toLocaleString('fr-FR'),
                  activityImage:
                    "https://connectorsdemo.azurewebsites.net/images/MSC12_Oscar_002.jpg",
                  text: "test1",
                },
              ],
            });
          })();
    }

    /**
     * Get the next message to print
     *
     * @param {number} stepId
     * @returns {string[]}
     */
    getNextMessages(stepId) {
        if (this.isFinalStep(stepId)) {
            return ['Thank you for your help. The issue is created in JIRA'];
        }

        return [this.steps.find(step => step.id == stepId + 1).text]
    }

    /**
     * Format input for the final result
     *
     * @param {string} input
     * @param {object} step
     *
     * @returns {string}
     */
    formatResultData(input, step) {
        return `${ step.title }: ${ input }`;
    }

    /**
     * Format data from bot conversation for the final issue description
     *
     * @param {object} data
     *
     * @returns {string}
     */
    formatIssueDescription(data) {
        return Object.keys(data).map(dataKey => 
            this.formatResultData(data[dataKey], this.steps.find(step => step.key == dataKey))
        ).reduce((final, stepResult) => `${ final } \n ${ stepResult }`);
    }

    /**
     * Validate input which has to be in the application list
     *
     * @param {string} input
     * @param {number} stepId
     *
     * @returns {object}
     */
    validateApplicationName(input, stepId) {
        let name = input.trim().toLowerCase();

        if (APP_NAME_LIST.includes(name)) {
            return { success: true, messages: this.getNextMessages(stepId) };
        }
        
        return {
            success: false,
            messages: ['Please provide a valid app : '.concat(APP_NAME_LIST.join(', '))],
        };
    }
}

module.exports = {
    TASK_NAME,
    SendIssue,
};