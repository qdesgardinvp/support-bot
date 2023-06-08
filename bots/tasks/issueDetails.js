class IssueDetails {

    constructor(issueDetailsResponse) {
        const fields = issueDetailsResponse.fields;

        this.key = issueDetailsResponse?.key;
        this.priority = fields?.priority?.name;
        this.assignee = fields?.assignee?.displayName;
        this.status = fields?.status?.name;
        this.progress = fields?.progress?.percent;
        this.creatorName = fields?.creator?.displayName;
        this.reporterName = fields?.reporter?.displayName;
        this.issueType = fields?.name;
        this.project = fields?.project?.name;
        this.resolutionDate = fields?.resolutiondate;
        this.createdAt = fields?.created;
        this.sprint = fields?.customfield_10020?.name;
        this.summary = fields?.summary;
    }

    toString() {
        return `- ID: ${ this.key } \n` +
            `- Status: ${ this.status } \n` +
            `${ this.resolutionDate ? `- Resolution date: ${ this.resolutionDate }` : '' } \n` +
            `- Summary: ${ this.summary } \n` +
            `- Project: ${ this.project || '' } \n` +
            `${ this.resolutionDate ? this.resolutionDate : '' } \n` +
            `- Progress: ${ this.progress || '' } \n` +
            `- Priority: ${ this.priority } \n` +
            `- Type: ${ this.issueType || '' } \n` +
            `- Assignee: ${ this.assignee } \n` +
            `- Creator: ${ this.creatorName } \n` +
            `- Reporter: ${ this.reporterName } \n` +
            `- Sprint: ${ this.sprint || '' } \n` +
            `- Created at: ${ this.createdAt } \n`
    }
}

module.exports = IssueDetails