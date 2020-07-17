/**
 * Copyright 2020 Bocoup
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * Duplicate deletion script
 *
 * Remove duplicate records in a given table according to the value of two
 * input fields. For any two records that are considered duplicates, use a
 * third field to determine which of the two records should be deleted.
 *
 * **Notes on adapting this script.**
 *
 * The script prompts for input every time it is run. For some users, one or
 * more of these values may be the same with every execution. To streamline
 * their workflow, these users may modify this script by defining the constant
 * values in the first few lines. The values should be expressed as JavaScript
 * strings in the object named `hardCoded`.
 */
'use strict';

/**
 * Users may provide values for any of the properties in the following object
 * to streamline the script's startup.
 */
const hardCoded = {
    tableName: '',
    firstIdFieldName: '',
    secondIdFieldName: '',
    comparisonFieldName: ''
};

/**
 * Do not edit any code following this message.
 */

// Airtable limits batch operations to 50 records or fewer.
const maxRecordsPerCall = 50;

const table = hardCoded.tableName
    ? base.getTable(hardCoded.tableName)
    : await input.tableAsync('Table name');
const firstIdField = hardCoded.firstIdFieldName
    ? table.getField(hardCoded.firstIdFieldName)
    : await input.fieldAsync('First identifying field name', table);
const secondIdField = hardCoded.secondIdFieldName
    ? table.getField(hardCoded.secondIdFieldName)
    : await input.fieldAsync('Second identifying field name', table);
const comparisonField = hardCoded.comparisonFieldName
    ? table.getField(hardCoded.comparisonFieldName)
    : await input.fieldAsync('Comparison field name', table);

function choose(recordA, recordB) {
    let valueA = recordA.getCellValue(comparisonField);
    let valueB = recordB.getCellValue(comparisonField);
    return valueA > valueB ? {keep: recordA, discard: recordB} : {keep: recordB, discard: recordA};
}

const existing = Object.create(null);
let toDelete = [];

// Part 1: Identify duplicate records in need of deletion
//
// We don't modify the table contents in this Part in the interest of
// efficiency. This script may trigger a large number of deletions, and it's
// much faster to request that they be done in batches. When we identify a
// record that should be deleted, we add it to an array so we can batch the
// operations in Part 3 of the script.
const query = await table.selectRecordsAsync({
    fields: [firstIdField, secondIdField, comparisonField]
});

for (let record of query.records) {
    let key = JSON.stringify([
        record.getCellValue(firstIdField),
        record.getCellValue(secondIdField)
    ]);

    // If we've already encountered a record with identical field values,
    // either that record or the current record need to be removed.
    if (key in existing) {
        let {keep, discard} = choose(record, existing[key]);
        toDelete.push(discard);
        existing[key] = keep;

        // If this is the first time we've observed a record with these
        // particular field values, make a note of it so we can recognize
        // duplicates as we iterate through the rest.
    } else {
        existing[key] = record;
    }
}

// Part 2: Verify
//
// Inform the script's user of the changes to be made and await their
// confirmation.
output.markdown(`Identified **${toDelete.length}** records in need of deletion.`);

const decision = await input.buttonsAsync('Proceed?', ['Yes', 'No']);

// Part 3: Execute the necessary operations

if (decision === 'No') {
    output.text('Operation cancelled.');
} else {
    output.text('Applying changes...');

    while (toDelete.length > 0) {
        await table.deleteRecordsAsync(toDelete.slice(0, maxRecordsPerCall));
        toDelete = toDelete.slice(maxRecordsPerCall);
    }

    output.text('Done');
}
