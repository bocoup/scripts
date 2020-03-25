// For https://airtable.com/templates/product-design-and-ux/expOzMycWirMsUOTL/bug-tracker
function formatUnique(assignees) {
    return Array.from(new Set(assignees))
        .map((assignee) => assignee.name)
        .join(', ');
}

function formatList(bugNames) {
    return bugNames.map((bugName) => `- ${bugName}`).join('\n');
}

function formatSection(label, bugNames, assignees, features) {
    let output = `\n#### ${label}: \`${bugNames.length}\`\n`;
    if (features) {
        output += `\n**Features**: ${formatUnique(features)}\n`;
    }
    if (assignees) {
        output += `\n**Assignees**: ${formatUnique(assignees)}\n`;
    }
    if (bugNames) {
        output += `\n${formatList(bugNames)}`;
    }
    return output;
}

function printReport(records) {
    let openBugs = 0;
    let criticalBugNames = [];
    let criticalAssignees = [];
    let criticalFeatures = [];

    let blockedBugNames = [];
    let blockedAssignees = [];

    let untriagedBugNames = [];

    for (let record of records) {
        let status = record.getCellValue('Status');
        let assignees = record.getCellValue('Assigned to');
        let features = record.getCellValue('Associated features');
        let daysOld = record.getCellValue('Days old');

        if (status) {
            switch (status.name) {
                case 'Blocked':
                    blockedBugNames.push(record.name);
                    openBugs++;
                    if (assignees) {
                        blockedAssignees.push(...assignees);
                    }
                    break;
                case 'In progress':
                    openBugs++;
                    break;
                default:
                    break;
            }
        } else {
            openBugs++;
            untriagedBugNames.push(`${record.name} (**${daysOld}** days)`);
        }

        let priority = record.getCellValue('Priority');
        switch (priority.name) {
            case 'Critical':
                criticalBugNames.push(record.name);
                if (assignees) {
                    criticalAssignees.push(...assignees);
                }
                if (features) {
                    criticalFeatures.push(...features);
                }
                break;
            default:
                break;
        }
    }

    output.markdown(
        `## Total \`${openBugs}\` open bugs
${formatSection('🚨 Critical', criticalBugNames, criticalAssignees, criticalFeatures)}
${formatSection('⏱ Blocked', blockedBugNames, blockedAssignees)}
${formatSection('🧹 Untriaged', untriagedBugNames)}
`
    );
}

let table = base.getTable('Bugs and issues');
let result = await table.selectRecordsAsync();
printReport(result.records);
