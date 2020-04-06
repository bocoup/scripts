/**
 * Airtable Field Split Script
 *
 * For each record in a given Airtable Base, read the value of one cell,
 * interpret that value as a space-separated list (e.g. the value "a b c"
 * becomes "a", "b", and "c"), and store each value in a corresponding
 * destination cell.
 *
 * How to adapt this script
 *
 * 1. Replace the value assigned to the `tableName` constant with the name of
 *    the table in your Base
 * 2. Replace the value of the `sourceName` constant with the field which
 *    contains the source value (that is: the value to be split).
 * 3. Replace the value of the `destinationNames` constant with a JavaScript
 *    array of string values, each describing the name of a field to store one
 *    of the split values.
 */
const tableName = 'Split Demo';
const sourceName = 'My Things';
const destinationNames = ['Thing 1', 'Thing 2', 'Thing 3'];

// You shouldn't need to modify the code following this line to use this
// script.

async function main() {
    if (typeof tableName !== 'string') {
        throw new Error('The `tableName` constant must be a JavaScript string value.');
    }
    if (typeof sourceName !== 'string') {
        throw new Error('The `sourceName` constant must be a JavaScript string value.');
    }
    if (!Array.isArray(destinationNames)) {
        throw new Error('The `destinationNames` constant must be a JavaScript array value.');
    }
    if (!destinationNames.length) {
        throw new Error('The `destinationNames` array must have at least one element.');
    }
    if (!destinationNames.every((name) => typeof name === 'string')) {
        throw new Error(
            'Every element of the `destinationNames` array must be a JavaScript string value'
        );
    }

    let table = base.getTable(tableName);
    let result = await table.selectRecordsAsync();

    for (let record of result.records) {
        let values = (record.getCellValueAsString(sourceName) || '').split(/\s+/);

        if (values.length > destinationNames.length) {
            output.markdown(
                `**WARNING**: encountered ${values.length} values, but only ` +
                    `${destinationNames.length} destination fields are available. ` +
                    `(values: ${values})`
            );

            values.length = destinationNames.length;
        }

        // Create an object suitable for use in `updateRecordAsync`. It keys
        // are the names of the "destination" fields as specified at the
        // beginning of this scripts, and its values are the corresponding
        // values from the "source" field.
        //
        // For example, given a "source" field with the text "foo bar" and a
        // set of "destination" fields named "first", "second", and "third",
        // `toUpdate` will be the following JavaScript object:
        //
        //     {
        //       "first": "foo",
        //       "second": "bar",
        //       "third": ""
        //     }
        let toUpdate = destinationNames.reduce((memo, name) => {
            memo[name] = values.shift();
            return memo;
        }, {});

        await table.updateRecordAsync(record, toUpdate);
    }
}

try {
    await main();
} catch (error) {
    output.markdown(`**ERROR**: ${error}`);
}

/**
 * Quality assurance testing plan:
 *
 * 1. Create a table named "Split QA" with the following text fields: "source",
 *    "d1", "d2", and "d3"
 * 2. Populate the table with the following records:
 *
 *    source    | d1 | d2 | d3
 *    ----------|----|----|---
 *              | x  | x  | x
 *    abcde     | x  | x  | x
 *    a bcde    | x  | x  | x
 *    a b cde   | x  | x  | x
 *    a b c de  | x  | x  | x
 *    a b c d e | x  | x  | x
 *
 * 3. Install the Scripting block
 * 4. Insert this source code into the scripting block
 * 5. Modify the `tableName` constant to be `"Split QA"`
 * 6. Update the `sourceName` constant to be `"source"`
 * 7. Update the `destinationNames` constant to be `["d1", "d2", "d3"]`
 * 8. Run the script
 *
 * Expected: every record should be updated, and a message should be printed to
 * the scripting block's output container.
 *
 * Table:
 *
 *    source    | d1    | d2   | d3
 *    ----------|-------|------|---
 *              |       |      |
 *    abcde     | abcde |      |
 *    a bcde    | a     | bcde |
 *    a b cde   | a     | b    | cde
 *    a b c de  | a     | b    | c
 *    a b c d e | a     | b    | c
 *
 * Message:
 *
 *     WARNING: encountered 4 values, but only 3 destination fields are available. (values: a,b,c,de)
 *     WARNING: encountered 5 values, but only 3 destination fields are available. (values: a,b,c,d,e)
 */
