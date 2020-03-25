// For https://airtable.com/templates/sales-and-customers/expvjTzYAZareV1pt/sales-crm
function formatList(items) {
    if (items.length === 1) {
        return items[0];
    }
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

async function validateFields(tableName, fieldNames) {
    let table = base.getTable(tableName);
    let result = await table.selectRecordsAsync();
    let missingFieldsByRecord = new Map();
    for (let record of result.records) {
        let missingFields = [];
        for (let fieldName of fieldNames) {
            if (!record.getCellValue(fieldName)) {
                missingFields.push(fieldName);
            }
        }
        if (missingFields.length > 0) {
            missingFieldsByRecord.set(record, missingFields);
        }
    }

    if (missingFieldsByRecord.size) {
        output.markdown(
            `### ｘ \`${missingFieldsByRecord.size}\` records in **${tableName}** are incomplete:`
        );
        missingFieldsByRecord.forEach((missingFields, record) => {
            let missingFieldsList = formatList(missingFields.map((name) => `\`${name}\``));
            output.markdown(`- **${record.name}** is missing ${missingFieldsList}`);
        });
    } else {
        output.markdown(`### ✓ All records in **${tableName}** are complete`);
    }
    output.markdown('---');
}

await validateFields('Opportunities', ['Status']);
await validateFields('Interactions', ['Type']);
await validateFields('Accounts', ['HQ address']);
await validateFields('Contacts', ['Title', 'LinkedIn']);
