// Let's take some user input before duplicating the records to make it easy to duplicate different ranges of records easily.
// First, let's ask the user to choose from the available tables in the base.  We'll store that in a variable called table
// so that we can reference it later. We'll add the await keyword in front of input.tableAsync so the script knows to wait
// until a table has been selected.
let table = await input.tableAsync('Choose the table with the records you want to duplicate.');

// Now let's do the same to ask the user for a (filtered) view that contains the records they want to duplicate.
// They can filter the view to only show records with a "Duplicate" checkbox field checked, by date range, or whatever else.
// This way the script will know which subset of records to duplicate.
let view = await input.viewAsync('Choose the view with the records you wish to duplicate.', table);

// Now we have to ask the user for a date field and status field so we're not just duplicating the records, but creating new
// ones with updated dates and statuses. We'll use the same selection process as before, but this time we'll use input.fieldAsync
// and also pass in the previously selected table so the script knows which fields the user can choose from.
let dateField = await input.fieldAsync('Choose the field with the date you want to update.', table);
let statusField = await input.fieldAsync(
    'Choose the field with the status that needs to be reset',
    table
);

// Finally, let's use text input get the number of days to add to the existing dates each time the records are duplicated
// as well as how many copies will be made.
let daysToAdd = await input.text('Enter how many days to add when duplicating records.');
let numCopies = await input.text(
    'Enter the number of duplicates you want to make. Any duplicate after the first will be offset by twice the number of days, then three times, and so on.'
);

// Once the user input has been gathered, we can use these variables to create updates copies of the desired records.
// First, we'll query the records in the selected view.
let queryResult = await view.selectRecordsAsync();

// Now let's create a button that the user has to press before the new records get created, so they aren't surprised.
let confirmButton = await input.buttonsAsync('Ready?', [
    {label: 'Create new records!', value: true, variant: 'primary'}
]);

// If the button is clicked, the script will create the new records.
if (confirmButton) {
    let recordsToCreate = [];
    // We'll use a for loop to create the records. The i variable counts how many times the loop has run. We'll use this to add the correct
    // number of days for each duplicated record.
    for (let i = 0; i < numCopies; i++) {
        for (let record of queryResult.records) {
            // First let's grab the old date from each record and convert it to milliseconds.
            let oldDate = Date.parse(record.getCellValue(dateField));

            // Next we can add one day worth of milliseconds (multiplied by current copy being made) to the old date to get the new date.
            let newDate = new Date(oldDate + daysToAdd * (i + 1) * 86400000);

            // To duplicate the original record, we'll get the cell value for each field and put it into a new record object.
            // We'll change the date and status fields to reflect the new date and status.
            let newFields = {};
            for (let field of table.fields) {
                newFields[field.id] = record.getCellValue(field);
            }
            newFields[dateField.id] = newDate;
            newFields[statusField.id] = 'Incomplete';

            // Now let's define the new record object and add it to the array of records to create.
            let newRecord = {fields: newFields};
            recordsToCreate.push(newRecord);
        }
    }

    // Only up to 50 updates are allowed at one time, so do it in batches.
    while (recordsToCreate.length > 0) {
        await table.createRecordsAsync(recordsToCreate.slice(0, 50));
        recordsToCreate = recordsToCreate.slice(50);
    }
    output.text('Record creation successful!');
}
