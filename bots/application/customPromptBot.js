// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

require('dotenv').config();
const TaskFactory = require('../domain/factories/taskFactory');
const { ActivityHandler, MessageFactory } = require('botbuilder');

// The accessor names for the conversation flow and user profile state property accessors.
const CONVERSATION_FLOW_PROPERTY = 'CONVERSATION_FLOW_PROPERTY';
const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';

const TASKS = {
    retrieveIssue: {
        id: 1,
        name: 'Retrieve Jira issue informations',
        class: 'retrieveIssue',
    },
    sendIssue: {
        id: 2,
        name: 'Post an issue',
        class: 'sendIssue',
    }
};

const RESET_KEYWORD = 'reset';

// Defines a bot for filling a user profile.
class CustomPromptBot extends ActivityHandler {
    constructor(conversationState, userState) {
        super();
        // The state property accessors for conversation flow and user profile.
        this.conversationFlow = conversationState.createProperty(CONVERSATION_FLOW_PROPERTY);
        this.userProfile = userState.createProperty(USER_PROFILE_PROPERTY);

        // The state management objects for the conversation and user.
        this.conversationState = conversationState;
        this.userState = userState;

        this.onMessage(async (turnContext, next) => {
            let flow = await this.conversationFlow.get(turnContext, { step: 0 });
            const profile = await this.userProfile.get(turnContext, {});
            
            if (turnContext.activity.text.trim().toLocaleLowerCase() === RESET_KEYWORD) {
                flow.task = null;
                flow.step = 0;
                await turnContext.sendActivity(CustomPromptBot.getInitialMessage());
            } else {
                if (!flow.task) {
                    await CustomPromptBot.selectTask(flow, profile, turnContext);
                } else {
                    await CustomPromptBot.process(flow, profile, turnContext);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcome = 'Hello ! I\'m the support bot. I\'m here to help you to get answers.';
            const selectTask = CustomPromptBot.getInitialMessage();
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.text(welcome, welcome));
                    await context.sendActivity(MessageFactory.text(selectTask, selectTask));
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);
        await this.conversationState.saveChanges(context, false);
        await this.userState.saveChanges(context, false);
    }

    /**
     * 
     * @param {*} flow 
     * @param {*} profile 
     * @param {*} turnContext 
     * @returns 
     */
    static async selectTask(flow, profile, turnContext) {
        const input = turnContext.activity.text;
        let task = Object.values(TASKS).find(taskConf => taskConf.id == input);
        if (!task) {
            await turnContext.sendActivity(`Please select a valid proposition "${input}"`);
            return;
        }

        flow.task = task.class;
        try {
            task = new TaskFactory(flow.task);
        } catch (e) {
            await turnContext.sendActivity('This functionnality is not ready yet');
            return;
        }
        
        const messages = task.getFirstStepMessages();
        for (let i = 0; i < messages.length; i++) {
            await turnContext.sendActivity(messages[i]);
        }
    }

    /**
     * Process dialog
     *
     * @param {*} Context
     * @param {*} profile Result data
     * @param {*} turnContext Object of dialog that contains input and send text
     * 
     */
    static async process(flow, profile, turnContext) {
        const input = turnContext.activity.text;

        let task;
        try {
            task = new TaskFactory(flow.task);
        } catch (e) {
            await turnContext.sendActivity(`I have no functionnality named "${input}"`);
        }

        const result = task.processStep(flow.step, input);
        for (let i = 0; i < result.messages.length; i++) {
            await turnContext.sendActivity(result.messages[i]);
        }

        if (result.success) {
            Object.assign(profile, result.data);
        }

        if (task.isFinalStep(flow.step)) {
            let finalStepData;
            try {
                finalStepData = await task.finalize(profile);
            } catch (e) {
                finalStepData = e;
            }

            await turnContext.sendActivity(`${ finalStepData.message }`);
            await turnContext.sendActivity(CustomPromptBot.getInitialMessage());
            flow.task = flow.step = null;
        } else {
            flow.step = result.step;
        }
    }

    /**
     * Get initial conversation message
     *
     * @returns {string}
     */
    static getInitialMessage() {
        const tasks = TASKS;
        tasks['reset'] = {id: 'reset', name: 'Reset the conversation'};

        return 'You can select one of the following option \n '
            .concat(Object.values(tasks)
                .filter(task => !task.hidden)
                .map(task => ` - (${ task.id }) ${ task.name }`)
                .join('\n'));
    }
}

module.exports.CustomPromptBot = CustomPromptBot;
