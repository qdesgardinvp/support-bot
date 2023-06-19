class Task {

    constructor() {
        this.description = 'Task description';
        this.steps = [];
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
     * Get the next message to print
     *
     * @param {number} stepId
     * @returns {string[]}
     */
    getNextMessages(stepId) {
        if (this.isFinalStep(stepId)) {
            return ['Thank you for your answers.'];
        }

        return [this.steps.find(step => step.id == stepId + 1).text]
    }
}

module.exports = Task;
