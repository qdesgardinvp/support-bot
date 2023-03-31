// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const request = require('request');
// const url = 'https://voyageprive.atlassian.net/rest/api/2/issue/RED-8';
const { ActivityHandler } = require('botbuilder');
const url = 'https://voyageprive.atlassian.net/rest/api/2/issue';
const auth = {
    username: 'qdesgardin@voyageprive.com',
    pass: 'ATATT3xFfGF0LHIxMaaMpIyxWPcXPWu6SkygA9xdfdzktO7n5i5vMy85Red0frnNPDOvP_KxyJKaTMBhynIFcCrNg9Fo_1ATUXH8dhMe6oOu-owaI403kmfmxI1Cyswen6zepdordcw4xscPBV-a2scUxgO7wu-6dzV3sdu6J80Y7fXTHHoy73A=A0DC77FD'
};

// The accessor names for the conversation flow and user profile state property accessors.
const CONVERSATION_FLOW_PROPERTY = 'CONVERSATION_FLOW_PROPERTY';
const USER_PROFILE_PROPERTY = 'USER_PROFILE_PROPERTY';

// Identifies the last question asked.
const question = {
    application: 'application',
    issue: 'issue',
    businessImpact: 'businessImpact',
    bu: 'bu',
    refId: 'refId',
    often: 'often',
    description: 'description',
    example: 'example',
    reproduce: 'reproduce',
    askTeamMate: 'askTeamMate',
    setup: 'setup',
    none: 'none'
};

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
            const flow = await this.conversationFlow.get(turnContext, { lastQuestionAsked: question.none });
            const profile = await this.userProfile.get(turnContext, {});

            await CustomPromptBot.fillOutUserProfile(flow, profile, turnContext);

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

    static async fillOutUserProfile(flow, profile, turnContext) {
        const input = turnContext.activity.text;
        let result;
        switch (flow.lastQuestionAsked) {
        case question.none:
            await turnContext.sendActivity('With which application do you meet a problem ?');
            flow.lastQuestionAsked = question.application;
            break;

        case question.application:
            result = this.validateApplicationName(input);
            if (result.success) {
                profile.application = result.application;
                await turnContext.sendActivity(`I have your application name ${ profile.application }.`);
                await turnContext.sendActivity('Can you tel me the Subject of the issue ?');
                flow.lastQuestionAsked = question.issue;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.issue:
            result = this.validateStep(input, question.issue);
            if (result.success) {
                profile.issue = result.issue;
                await turnContext.sendActivity('I have your saved issue.');
                await turnContext.sendActivity('What is the impact for our business ?');
                flow.lastQuestionAsked = question.businessImpact;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.businessImpact:
            result = this.validateStep(input, question.businessImpact);
            if (result.success) {
                profile.businessImpact = result.businessImpact;
                await turnContext.sendActivity('I have saved your answer about impact business.');
                await turnContext.sendActivity('What BU are concerned about your problem ?');
                flow.lastQuestionAsked = question.bu;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }
        case question.bu:
            result = this.validateStep(input, question.bu);
            if (result.success) {
                profile.bu = result.bu;
                await turnContext.sendActivity('I have saved your answer about bu.');
                await turnContext.sendActivity('Can you give me a reference Id (Bong/PIM/TURBO/BONG...) ?');
                flow.lastQuestionAsked = question.refId;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.refId:
            result = this.validateStep(input, question.refId);
            if (result.success) {
                profile.refId = result.refId;
                await turnContext.sendActivity('Thanks for this Ref Id.');
                await turnContext.sendActivity('How often do you reproduce this issue? Is it an isolated case ?');
                flow.lastQuestionAsked = question.often;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.often:
            result = this.validateStep(input);
            if (result.success) {
                profile.often = result.often;
                await turnContext.sendActivity('Thanks for this reply.');
                await turnContext.sendActivity('Description of the issue (precise dates/offers or links)');
                flow.lastQuestionAsked = question.description;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.description:
            result = this.validateStep(input, question.description);
            if (result.success) {
                profile.description = result.description;
                await turnContext.sendActivity('Thanks for this reply.');
                await turnContext.sendActivity('How can we reproduce this issue? (Please explain all necessary steps to reproduce): ');
                flow.lastQuestionAsked = question.reproduce;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.reproduce:
            result = this.validateStep(input, question.reproduce);
            if (result.success) {
                profile.reproduce = result.reproduce;
                await turnContext.sendActivity('Thanks for this reply.');
                await turnContext.sendActivity('Have you asked your teammates first?');
                flow.lastQuestionAsked = question.askTeamMate;
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.askTeamMate:
            result = this.validateStep(input, question.askTeamMate);
            if (result.success) {
                profile.askTeamMate = result.askTeamMate;
                await turnContext.sendActivity('Thanks for this reply.');
                await turnContext.sendActivity('Which setup checks have been done or actions (indexation, check with APA in charge...) ?');
                flow.lastQuestionAsked = question.setup;
                profile = {};
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }

        case question.setup:
            result = this.validateStep(input, question.setup);
            if (result.success) {
                profile.setup = result.setup;
                await turnContext.sendActivity('Thanks for this reply.');
                flow.lastQuestionAsked = question.none;
                console.log(profile);
                // profile = {};
                const createIssue = {
                    fields: {
                        project: {
                            key: 'RED'
                        },
                        summary: profile.issue,
                        issuetype: {
                            name: 'Bug'
                        },
                        description: JSON.stringify(profile)
                    }
                };

                request.post({
                    url,
                    auth,
                    body: JSON.stringify(createIssue),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }, (error, response, body) => {
                    if (error) {
                        console.error(error);
                        return;
                    }
                    console.log(body);
                });
                break;
            } else {
                await turnContext.sendActivity(result.message || "I'm sorry, I didn't understand that.");
                break;
            }
        }

        // request.get({ url, auth, json: true }, (error, response, body) => {
        //     if (error) {
        //         console.error(error);
        //         return;
        //     }
        //     console.log(body);
        // });

        // {
        //     application: 'turbo',
        //     issue: 'test',
        //     businessImpact: 'test',
        //     bu: 'test',
        //     refId: 'test',
        //     description: 'test',
        //     reproduce: 'test',
        //     askTeamMate: 'test',
        //     setup: 'test'
        //   }

        // request.get({ url, auth, json: true }, (error, response, body) => {
        //     if (error) {
        //         console.error(error);
        //         return;
        //     }
        //     console.log(body);
        // });
    }

    // Validates name input. Returns whether validation succeeded and either the parsed and normalized
    // value or a message the bot can use to ask the user again.
    static validateApplicationName(input) {
        const applicationNameList = [
            'turbo',
            'bong',
            'turbo',
            'ozone',
            'lemon',
            'pomelo',
            'strawberry',
            'plum'
        ];
        let name = input;
        name = name.trim().toLowerCase();

        if (applicationNameList.includes(name)) {
            return { success: true, application: name };
        } else {
            return { success: false, message: 'Please enter a name that contains at least one character.' };
        }
    };

    static validateStep(input, step) {
        return { success: true, [step]: input };
    }
}

module.exports.CustomPromptBot = CustomPromptBot;
