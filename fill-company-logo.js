/**
 * Fill in company websites and logos script
 *
 * With a text field with names of companies, records that have an empty company
 * website field or an empty company logo field, this will request suggestions
 * from Clearbit's Autocomplete API to fill the website or logo fields.
 *
 * https://clearbit.com/docs#autocomplete-api
 *
 * How to use with your Airtable base
 *
 * 1. Set the tableName variable to the table you want it to check.
 * 2. Update the values in the fieldNameByClearbitProperty variable to names of
 *    fields in the table that are single line text or attachment fields. You do
 *    not need to change the keys. The keys are the properties in the responses
 *    this script gets from the Clearbit API. The name field is required, but
 *    the domain and logo fields are optional. If you don't need one of them,
 *    you can comment it out.
 */

let tableName = 'Clients';
// A map of Airtable field name keys to Clearbit Autocomplete API response
// properties.
let fieldNameByClearbitProperty = {
    // A single line text field
    'name': 'Name',
    // A single line text field
    'domain': 'Website',
    // An attachments field
    'logo': 'Attachments',
};

// After this line is the script logic. To use this script as-is, you do not need
// to edit anything after this point.

// True when given an attachment cell with at least one attachment.
function includesAttachment(cell) {
    return cell && cell.length > 0;
}

let progressHeader = `# Fill in company websites and logos

[Logos provided by Clearbit](https://clearbit.com)
`;

let nameFieldName = fieldNameByClearbitProperty.name;
let domainFieldName = fieldNameByClearbitProperty.domain;
let logoFieldName = fieldNameByClearbitProperty.logo;

let fieldNames = Object.values(fieldNameByClearbitProperty); 

let table = base.getTable(tableName);

let recordNames = null;
let totalSelected = 0;
let totalFiltered = 0;
let totalSuggested = 0;

await output.markdown(
    `${progressHeader}
Selecting records from "${tableName}" ...  
`,
);

// Pass in the fields parameter to only load data from the fields we need.
let allRecords = await table.selectRecordsAsync({
    fields: fieldNames,
});

totalSelected = allRecords.records.length;

// Filter out records that aren't eligible for autocomplete.
let records = allRecords.records.filter(record => (
    // A record must have its name field set.
    record.getCellValue(nameFieldName) &&
    (
        // If searching for domains, the domain field must be empty.
        (
            domainFieldName && !record.getCellValue(domainFieldName) ||
            !domainFieldName
        ) ||
        // If searching for logos, the logo field must be empty.
        (
            logoFieldName && !includesAttachment(record.getCellValue(logoFieldName)) ||
            !logoFieldName
        )
    )
));

totalFiltered = records.length;

recordNames = records.map(record => record.getCellValue(nameFieldName));

await output.markdown(
    `Filtered ${totalSelected} records down to ${totalFiltered} records.`
);

// Create a list of record updates. After all the updates are in the list we'll
// submit them in batches to the table.
let updates = [];

for (let i = 0; i < records.length; i++) {
    let record = records[i];

    await output.markdown(
        `Fetching suggestion for "${recordNames[i]}" (${i + 1} of ${totalFiltered}) from [Clearbit].`
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

    updates.push({
        id: record.id,
        fields,
    });
}

let updateLimit = 50;

for (let i = 0; i < updates.length; i += updateLimit) {
    await table.updateRecordsAsync(updates.slice(i, i + updateLimit));
}

await output.clear();
await output.markdown(
    `${progressHeader}
Filtered ${totalSelected} records down to ${totalFiltered} records.  
Fetched info for ${totalFiltered} records.  
Found suggestions for ${totalSuggested} out of ${totalFiltered} records.  
`,
);
