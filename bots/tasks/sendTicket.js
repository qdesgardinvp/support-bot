const request = require('request');
const fs = require('fs');
const Task = require('./task');

const url = 'https://voyageprive.atlassian.net/rest/api/2/issue';
const auth = {
    username: 'qdesgardin@voyageprive.com',
    pass: 'ATATT3xFfGF0LHIxMaaMpIyxWPcXPWu6SkygA9xdfdzktO7n5i5vMy85Red0frnNPDOvP_KxyJKaTMBhynIFcCrNg9Fo_1ATUXH8dhMe6oOu-owaI403kmfmxI1Cyswen6zepdordcw4xscPBV-a2scUxgO7wu-6dzV3sdu6J80Y7fXTHHoy73A=A0DC77FD'
};

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
            data: {[step.key]: this.formatResultData(input, step)},
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
        // uncomment to get the real jira ticket
        return {
            success: true,
            message: 'JIRA ticket ID: TEST'
        };
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
                url,
                auth,
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

                body = JSON.parse(body);
                resolve({
                    success: true,
                    message: 'JIRA ticket ID: ' + body.key
                });
            });
        });
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
        return Object.values(data).reduce((final, stepResult) => `${ final } \n ${ stepResult }`);
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