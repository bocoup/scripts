/**
 * Company and Logo with Clearbit Script
 *
 * With a text field with names of companies, for records that have an empty
 * company website field or an empty company logo field, this will request
 * suggestions from Clearbit's Autocomplete API to fill the website or logo
 * fields.
 *
 * How to use with your Airtable Base
 *
 * 1. Set the tableName variable to the table you want it to check.
 * 2. Update the keys in the fieldMap variable to names of fields in the table
 *    that are a single line of text or attachment field. You do not need to
 *    change the values. The values are the properties in the responses this
 *    gets from the Clearbit API. The domain and logo properties are optional.
 *    You can use one by commenting out the other. Or you can use both. Name,
 *    though, is required and cannot be commented out.
 */

const tableName = 'Companies';
// A map of Airtable field name keys to Clearbit Autocomplete API response
// properties.
const fieldMap = {
    // The name 
    'Company Name': 'name',
    'Company Website': 'domain',
    'Company Image Attachments': 'logo',
};

// After this line is the script logic. To use this script as is you do not need
// to edit anything behind this point.

await main({tableName, fieldMap});

function fieldForParam(fieldMap, param) {
    for (const key in fieldMap) {
        const value = fieldMap[key];
        if (value === param) {
            return key;
        }
    }
    return null;
}

function basename(path) {
    const index = path.lastIndexOf('/');
    return path.substring(index + 1);
}

function renderer(state) {
    const header = `# Fill in Company Websites and Logos

[Logos provided by Clearbit](https://clearbit.com)

`;
    const footer = ``;
    let lastRender = 0;

    return async function render(stage) {
        if (stage !== 'done' && Date.now() - lastRender < 500) {
            return;
        }
        lastRender = Date.now();

        let includeStageSummary = false;
        let body = '';
        if (stage === 'done') {
            body = `Found suggestions for ${state.totalSuggested} out of ${state.recordNames.length} records.  
${body}`;
            includeStageSummary = true;
        }
        if (includeStageSummary) {
            body = `Fetched info for ${state.recordNames.length} records.  
${body}`;
        }
        if (stage === 'suggesting') {
            body = `Fetching suggestion for "${state.recordNames[state.recordIndex]}" (${state.recordIndex + 1} of ${state.recordNames.length}) from [Clearbit].  
${body}`;
            includeStageSummary = true;
        }
        if (includeStageSummary) {
            body = `Filtered ${state.totalSelected} records down to ${state.recordNames.length} records.  
${body}`;
        }
        if (stage === 'filtering records') {
            body = `Filtering ${state.totalSelected} records from "${state.tableName}" ...  
${body}`;
        }
        if (stage === 'selecting records') {
            body = `Selecting records from "${state.tableName}" ...  
${body}`;
        }

        body = header + body + footer;

        await output.clear();
        await output.markdown(body);
    };
}

function includesClearbitLogo(cell, clearbitUrl) {
    if (!cell) {
        return false;
    }
    const filename = basename(clearbitUrl);
    for (let i = 0; i < cell.length; i++) {
        if (cell[i].filename === filename) {
            return true;
        }
    }
    return false;
}

async function main({tableName, fieldMap}) {
    const nameField = fieldForParam(fieldMap, 'name');
    const fields = Object.keys(fieldMap); 

    const targetTable = base.getTable(tableName);

    const progressState = {
        tableName,
        recordNames: null,
        recordIndex: -1,
        totalSelected: 0,
        totalSuggested: 0,
    };
    const render = renderer(progressState);
    await render('selecting records');

    const currentRecords = await targetTable.selectRecordsAsync({
        fields,
    });

    progressState.totalSelected = currentRecords.records.length;

    let targetRecords;

    await render('filtering records');

    targetRecords = currentRecords.records.filter(record => {
        for (const key in fieldMap) {
            const cell = record.getCellValue(key);
            const tableField = targetTable.getField(key);

            let value;
            if (tableField.type === 'singleLineText') {
                value = cell;
            } else if (tableField.type === 'multipleAttachments') {
                value = (cell && cell.length > 0) ? cell[0].url : null;
            }

            if (!value) return true;
        }
    });

    progressState.recordNames = targetRecords.map(record => record.getCellValue(nameField));

    for (let i = 0; i < targetRecords.length; i++) {
        const record = targetRecords[i];

        progressState.recordIndex = i;
        await render('suggesting');

        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${targetRecords[i].getCellValue(nameField)}`);
        const clearbitSuggestions = await response.json(); 
        const clearbitSuggestion = clearbitSuggestions[0];

        if (!clearbitSuggestion) continue;

        progressState.totalSuggested += 1;

        const value = {};
        for (const key in fieldMap) {
            const field = fieldMap[key];
            const suggestion = clearbitSuggestion[field];
            const cell = record.getCellValue(key);
            const tableField = targetTable.getField(key);

            if (tableField.type === 'singleLineText' && !cell) {
                value[key] = suggestion;
            } else if (
                tableField.type === 'multipleAttachments' &&
                !includesClearbitLogo(cell, suggestion)
            ) {
                value[key] = [...(cell || []), {
                    url: suggestion,
                    filename: basename(suggestion),
                }];
            }
        }

        if (Object.keys(value).length === 0) continue;

        await targetTable.updateRecordAsync(record.id, value);
    }

    await render('done');
}

/**
 * Quality assurance testing plan
 *
 * 1. Create a table named "Logo QA" and set to have 2 single line text fields
 *    named "Name" and "Website", and 1 attachments field named "Attachments".
 * 2. Set 3 records with the "Name" field set to "github", "nodejs", and "airtable".
 * 3. Install a Script block.
 * 4. Copy the script into the block's code editor editor.
 * 5. Set the variable "tableName" to `"Logo QA"`.
 * 6. Set the variable "fieldMap" to look like:
 *
 *    const fieldMap = {
 *        'Name': 'name',
 *        'Website': 'domain',
 *        'Attachments': 'logo',
 *    };
 *
 * 7. Run the script.
 *
 * Expected: Each record has a url in the "Website" field and a logo in the "Attachments" field.
 *
 * 8. Delete the urls in the Website field.
 * 9. Run the script.
 *
 * Expected: Each record has a url in the "Website" field again and still one logo in the "Attachments" field.
 */
