const request = require('request');
const fs = require('fs');
const Task = require('./task');
const { IncomingWebhook } = require('ms-teams-webhook');
require('dotenv').config();

const TASK_NAME = 'sendTicket';
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

class SendTicket extends Task {

    constructor() {
        super();

        this.steps = JSON.parse(fs.readFileSync('bots/resources/sendTicketSteps.json', 'utf8'))
            .sort((a, b) => a.id - b.id);
        this.description = 'Answer a few questions to create a JIRA ticket';
    }

    /**
     * Process current step. Refers to step conf
     *
     * @param {number} stepId
     * @param {string} input
     *
     * @returns {object}
     */
    processStep(stepId, input) {
        const step = this.steps.find(step => step.id == stepId);
        if (!step) {
            return { success: false, step, messages: ['Step not found'] };
        }

        const result = this[step.validationFunc](input, stepId);

        return {
            ...result,
            data: {[step.key]: input},
            step: (result.success ? step.id+1 : step.id),
        };
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
                message: 'JIRA ticket ID: TEST'
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
                description: this.formatTicketDescription(data)
            }
        };

        return new Promise((resolve, reject) => {
            request.post({
                url: process.env.JIRA_URL,
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
                        message: `Unable to create JIRA ticket: ${ error }`
                    });
                }

                if (+process.env.ENABLE_TEAMS_WEBHOOK) {
                    this.sendWebhookTeams(data);
                }

                body = JSON.parse(body);
                resolve({
                    success: true,
                    message: 'JIRA ticket ID: ' + body.key
                });
            });
        });
    }

    /**
     * Create a Teams conversation => result of jira ticket 
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
     * Format data from bot conversation for the final ticket description
     *
     * @param {object} data
     *
     * @returns {string}
     */
    formatTicketDescription(data) {
        return Object.keys(data).map(dataKey => 
            this.formatResultData(data[dataKey], this.steps.find(step => step.key == dataKey))
        ).reduce((final, stepResult) => `${ final } \n ${ stepResult }`);
    }

    /**
     * Get if step id is the final step
     *
     * @param {number} stepId
     *
     * @returns {bool}
     */
    isFinalStep(stepId) {
        return stepId == this.steps.slice(-1).shift().id;
    }

    /**
     * Get the first messages to print
     *
     * @returns {string[]}
     */
    getFirstStepMessages() {
        return [this.steps.slice(0, 1).shift().text];
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

    /**
     * Validate string answer
     *
     * @param {string} input
     * @param {number} stepId
     *
     * @returns {object}
     */
    validateString(input, stepId) {
        if (!input.trim().replace(' ', '')) {
            return { success: false, messages: ['Please provide a valid answer.'] };
        }

        return { success: true, messages: this.getNextMessages(stepId) };
    }

    /**
     * Get the next message to print
     *
     * @param {number} stepId
     * @returns {string[]}
     */
    getNextMessages(stepId) {
        if (this.isFinalStep(stepId)) {
            return ['Thank you for your help. The ticket is created in JIRA'];
        }

        return [this.steps.find(step => step.id == stepId + 1).text]
    }
}

module.exports = {
    TASK_NAME: TASK_NAME,
    SendTicket: SendTicket,
};