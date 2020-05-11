/**
 * Airtable field split script
 *
 * For each record in a given Airtable base, read the value of one cell,
 * interpret that value as a space-separated list (e.g. the value "a b c"
 * becomes "a", "b", and "c"), and store each value in a corresponding
 * destination cell.
 *
 * How to adapt this script
 *
 * 1. Replace the value assigned to the `tableName` variable with the name of
 *    the table in your base
 * 2. Replace the value of the `sourceFieldName` variable with the field which
 *    contains the source value (that is: the value to be split).
 * 3. Replace the value of the `destinationFieldNames` variable with a JavaScript
 *    array of string values, each describing the name of a field to store one
 *    of the split values.
 */
let tableName = 'Split Demo';
let sourceFieldName = 'My Things';
let destinationFieldNames = ['Thing 1', 'Thing 2', 'Thing 3'];

// You shouldn't need to modify the code following this line to use this
// script.

if (typeof tableName !== 'string') {
    throw new Error('The `tableName` variable must be a string.');
}
if (typeof sourceFieldName !== 'string') {
    throw new Error('The `sourceFieldName` variable must be a string.');
}
if (!Array.isArray(destinationFieldNames)) {
    throw new Error('The `destinationFieldNames` variable must be an array.');
}
if (!destinationFieldNames.length) {
    throw new Error('The `destinationFieldNames` array must have at least one element.');
}
if (!destinationFieldNames.every((name) => typeof name === 'string')) {
    throw new Error('Every element in the `destinationFieldNames` array must be a string.');
}

let table = base.getTable(tableName);
let query = await table.selectRecordsAsync();
let updates = [];

for (let record of query.records) {
    let values = (record.getCellValueAsString(sourceFieldName) || '').split(/\s+/);

    if (values.length > destinationFieldNames.length) {
        output.markdown(
            `**WARNING**: encountered ${values.length} values, but only ` +
                `${destinationFieldNames.length} destination fields are available. ` +
                `(values: ${values})`
        );

        // Remove the extraneous values from the array
        values.length = destinationFieldNames.length;
    }

    // Create an object suitable for use in `updateRecordAsync`. Its keys
    // are the names of the "destination" fields as specified at the
    // beginning of this scripts, and its values are the corresponding
    // values from the "source" field.
    //
    // For example, given a "source" field with the text "foo bar" and a
    // set of "destination" fields named "first", "second", and "third",
    // `fields` will be the following JavaScript object:
    //
    //     {
    //       "first": "foo",
    //       "second": "bar",
    //       "third": ""
    //     }
    let fields = {};
    for (let i = 0; i < destinationFieldNames.length; i++) {
        let fieldName = destinationFieldNames[i];
        fields[fieldName] = values[i];
    }

    updates.push({id: record.id, fields});
}

// Updating records in batches is more efficient than updating one record at a
// time.
let maxRecordsPerCall = 50;
while (updates.length > 0) {
    await table.updateRecordsAsync(updates.slice(0, maxRecordsPerCall));
    updates = updates.slice(maxRecordsPerCall);
}
