/**
 * Fill in company websites and logos script
 *
 * With a text field with names of companies, for records that have an empty
 * company website field or an empty company logo field, this will request
 * suggestions from Clearbit's Autocomplete API to fill the website or logo
 * fields.
 *
 * https://clearbit.com/docs#autocomplete-api
 *
 * How to use with your Airtable base
 *
 * 1. Set the tableName variable to the table you want it to check.
 * 2. Update the keys in the fieldMap variable to names of fields in the table
 *    that are single line text or attachment fields. You do not need to
 *    change the values. The values are the properties in the responses this
 *    gets from the Clearbit API. The domain and logo properties are optional.
 *    You can use one by commenting out the other. Or you can use both. Name,
 *    though, is required and cannot be commented out.
 */

let tableName = 'Clients';
// A map of Airtable field name keys to Clearbit Autocomplete API response
// properties.
let fieldMap = {
    // A single line text field
    'Name': 'name',
    // A single line text field
    'Website': 'domain',
    // An attachments field
    'Attachments': 'logo',
};

// After this line is the script logic. To use this script as-is, you do not need
// to edit anything after this point.

function fieldForParam(fieldMap, param) {
    for (let fieldName in fieldMap) {
        let clearbitProperty = fieldMap[fieldName];
        if (clearbitProperty === param) {
            return fieldName;
        }
    }
    return null;
}

// True when given an attachment field with at least one attachement.
function includesAttachment(cell) {
    return cell && cell.length > 0;
}

let progressHeader = `# Fill in company websites and logos

[Logos provided by Clearbit](https://clearbit.com)

`;

let lastRender = 0;

async function renderProgress(stage, body) {
    // Throttle renders to 2 times a second or the last stage.
    if (stage !== 'done' && Date.now() - lastRender < 500) {
        return;
    }
    lastRender = Date.now();

    await output.clear();
    await output.markdown(progressHeader + body);
}

let nameFieldName = fieldForParam(fieldMap, 'name');
let domainFieldName = fieldForParam(fieldMap, 'domain');
let logoFieldName = fieldForParam(fieldMap, 'logo');

let fieldNames = Object.keys(fieldMap); 

let table = base.getTable(tableName);

let recordNames = null;
let totalSelected = 0;
let totalFiltered = 0;
let totalSuggested = 0;

await renderProgress(
    'selecting records',
    `Selecting records from "${tableName}" ...  
`,
);

let allRecords = await table.selectRecordsAsync({
    fields: fieldNames,
});

totalSelected = allRecords.records.length;

await renderProgress(
    'filtering records',
    `Filtering ${totalSelected} records from "${tableName}" ...  
`,
);

let records = allRecords.records.filter(record => (
    // A record must have its name field set.
    record.getCellValue(nameFieldName) &&
    (
        // If searching for domains, the domain field must be empty.
        (
            domainFieldName && !record.getCellValue(domainFieldName) ||
            !domainFieldName
        ) ||
        // If searching for logo domains, the logo field must be empty.
        (
            logoFieldName && !includesAttachment(record.getCellValue(logoFieldName)) ||
            !logoFieldName
        )
    )
));

totalFiltered = records.length;

recordNames = records.map(record => record.getCellValue(nameFieldName));

// Create a list of record updates. After all the updates are in the list we'll
// submit them in batches to the table.
let updates = [];

for (let i = 0; i < records.length; i++) {
    let record = records[i];

    await renderProgress(
        'suggesting',
        `Filtered ${totalSelected} records down to ${totalFiltered} records.  
Fetching suggestion for "${recordNames[i]}" (${i + 1} of ${totalFiltered}) from [Clearbit].  
`,
    );

    // Request info for records one at a time. Clearbit has a request limit.
    let response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${records[i].getCellValue(nameFieldName)}`);
    let clearbitSuggestions = await response.json();
    // Clearbit may have multiple likely matches for some names. 
    let clearbitSuggestion = clearbitSuggestions[0];

    // Clearbit may not have info matching a input name.
    if (!clearbitSuggestion) continue;

    totalSuggested += 1;

    let fields = {};
    // Update the domain field if it is empty in the table.
    if (domainFieldName && !record.getCellValue(domainFieldName)) {
        fields[domainFieldName] = clearbitSuggestion.domain;
    }
    // Update the logo field if it is empty in the table.
    if (logoFieldName && !includesAttachment(record.getCellValue(logoFieldName))) {
        fields[logoFieldName] = [{
            url: clearbitSuggestion.logo,
        }];
    }

    if (Object.keys(fields).length === 0) continue;

    updates.push({
        id: record.id,
        fields,
    });
}

let updateLimit = 50;

for (let i = 0; i < updates.length; i += updateLimit) {
    await table.updateRecordsAsync(updates.slice(i, i + updateLimit));
}

await renderProgress(
    'done',
    `Filtered ${totalSelected} records down to ${totalFiltered} records.  
Fetched info for ${totalFiltered} records.  
Found suggestions for ${totalSuggested} out of ${totalFiltered} records.  
`,
);
