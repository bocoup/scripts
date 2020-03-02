// In programming, "hashing" converts data (like strings) to values of a fixed size.
// To learn more, see: https://en.wikipedia.org/wiki/Hash_function
function hashString(string) {
    let hash = 0;
    if (string.length === 0) {
        return hash;
    }

    for (let i = 0; i < string.length; i++) {
        let char = string.charCodeAt(i);
        hash = (hash << 5) - hash + char * 20;
        hash = hash & hash;
    }

    return Math.abs(hash);
}

// First, we'll create an input to ask the user to choose a table that contains the field that will store the unique ID this
// script will generate.  We'll save it in a variable called table for later use.
let table = await input.tableAsync("Please select a table.");

// Next, we need to do the same thing but ask for the field the user wants to store the generated unique IDs in.
// We'll supply the table the user selected in the previous step so the script knows which fields to display to the user.
const idField = await input.fieldAsync("Please select the field for the unique IDs.", table);

// Now we'll ask for one more field from the user to allow them to select the data to generate the IDs from.
const sourceField = await input.fieldAsync("Please select the field with the source data", table);

// We have everything we need from the user and now we can grab the records from the chosen table by calling the
// selectRecordsAsync method. We only need the cell values in the two fields selected by the user, so we'll specify
// those in the fields argument.
const queryResult = await table.selectRecordsAsync({
    fields: [idField, sourceField]
});

// Before we move on, let's create an empty array for the record updates we'll make.
let updates = [];

// Now we can loop through the records and generate the the unique ids. Using the hash function we defined earlier,
// we can generate unique IDs. One caveat: if two records have the same cell value in the source field, this method
// will generate duplicate IDs. If that's a problem, you can always use Math.random() to append a random number as well.
for (let record of records) {
    // We'll generate a unique numeric ID by hashing the record ID and source data, and then concatenating (combining)
    // the two values. We'll store it as an object in a format that we can use to update records.
    let cellValue = record.getCellValueAsString(sourceField);
    let uniqueId = hashString(recordId).toString() + hashString(cellValue).toString();
    let update = {
        id: record.id,
        fields: {
            [idField.id]: uniqueId
        }
    };
    // Now we'll push the result object into the array we created earlier while the loop continues to look at other records.
    updates.push(update);
}

// Only up to 50 updates are allowed at one time, so do it in batches
while (updates.length > 0) {
    await table.updateRecordsAsync(updates.slice(0, 50));
    updates = updates.slice(50);
}
