const { SendTicket, TASK_NAME: SEND_TICKET } = require('./sendTicket');

class TaskFactory {
    constructor(taskName) {
        switch (taskName) {
            case SEND_TICKET:
                return new SendTicket();
            default:
                throw new Error('No task found');
        }
    }
}

module.exports = TaskFactory;