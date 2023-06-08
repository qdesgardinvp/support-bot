const { SendIssue, TASK_NAME: SEND_ISSUE } = require('./sendIssue');
const { RetrieveIssue, TASK_NAME: RETRIEVE_ISSUE } = require('./retrieveIssue');

class TaskFactory {
    constructor(taskName) {
        switch (taskName) {
            case SEND_ISSUE:
                return new SendIssue();
            case RETRIEVE_ISSUE:
                return new RetrieveIssue();
            default:
                throw new Error('No task found');
        }
    }
}

module.exports = TaskFactory;