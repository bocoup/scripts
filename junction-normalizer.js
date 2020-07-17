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
 * Normalize junction table script
 *
 * Given a table serving to join two "foreign" tables, ensure that the first
 * table has exactly one record for every combination of records in the foreign
 * tables (and zero additional records).
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
    firstTableName: 'Table 1',
    secondTableName: 'Table 2',
    junctionTableName: 'Table 3',
    firstJunctionFieldName: 'To 1',
    secondJunctionFieldName: 'To 2'
};

/**
 * Do not edit any code following this message.
 */

const existing = Object.create(null);
let toCreate = [];
let toDelete = [];
// Airtable limits batch operations to 50 records or fewer.
const maxRecordsPerCall = 50;

const table1 = hardCoded.firstTableName
    ? base.getTable(hardCoded.firstTableName)
    : await input.tableAsync('First table name');
const table2 = hardCoded.secondTableName
    ? base.getTable(hardCoded.secondTableName)
    : await input.tableAsync('Second table name');
const table3 = hardCoded.junctionTableName
    ? base.getTable(hardCoded.junctionTableName)
    : await input.tableAsync('Junction table name');
const firstJunctionField = hardCoded.firstJunctionFieldName
    ? table3.getField(hardCoded.firstJunctionFieldName)
    : await input.fieldAsync('First junction field name', table3);
const secondJunctionField = hardCoded.secondJunctionFieldName
    ? table3.getField(hardCoded.secondJunctionFieldName)
    : await input.fieldAsync('Second junction field name', table3);

// Part 1: determine the necessary operations.
//
// We don't modify the table contents in this Part in the interest of
// efficiency. This script may trigger a large number of database
// modifications, and it's much faster to request that they be done in batches.
// When we identify a record that should be created or deleted, we add it to
// the appropriate array so we can batch the operations in Part 2 of the
// script.

const query3 = await table3.selectRecordsAsync({
    fields: [firstJunctionField, secondJunctionField]
});

for (let record3 of query3.records) {
    let records1 = record3.getCellValue(firstJunctionField);
    let records2 = record3.getCellValue(secondJunctionField);

    // Either field in the junction table may have zero records. That's not
    // expected, so junction records like like that should be removed.
    if (!records1 || !records2) {
        toDelete.push(record3);
        continue;
    }

    // Either field in the junction table may reference multiple records.
    // That's not expected, either, so junction records like that should be
    // removed.
    if (records1.length > 1 || records2.length > 1) {
        toDelete.push(record3);
        continue;
    }

    let key = `${records1[0].id}${records2[0].id}`;

    // Keep track of each record in the junction table that describes a unique
    // pair of foreign records. We'll use this to determine whether new records
    // need to be created.
    if (!(key in existing)) {
        existing[key] = record3;

        // If we've already seen a record in the junction table for two foreign
        // records, then the current record is a duplicate, so we should plan
        // to remove it.
    } else {
        toDelete.push(record3);
    }
}

const query1 = await table1.selectRecordsAsync();
const query2 = await table2.selectRecordsAsync();

for (let recordId1 of query1.recordIds) {
    for (let recordId2 of query2.recordIds) {
        let key = `${recordId1}${recordId2}`;

        // If we didn't see this combination of foreign records when we
        // traversed the junction table, we should plan to create a new record.
        if (!(key in existing)) {
            toCreate.push({
                fields: {
                    [firstJunctionField.name]: [{id: recordId1}],
                    [secondJunctionField.name]: [{id: recordId2}]
                }
            });

            // If we *did* see this combination of foreign records, then we'll
            // remove the corresponding junction record from our data
            // structure. That way, once this loop is complete, the only
            // records that remain in the data structure will be the ones that
            // describe non-existent foreign records.
        } else {
            delete existing[key];
        }
    }
}

// If `existing` still has any entries, they are junction records which include
// non-existent foreign records. We should delete those, too.
toDelete.push(...Object.values(existing));

// Part 2: Verify
//
// Inform the script's user of the changes to be made and await their
// confirmation.
output.markdown(`Identified **${toCreate.length}** records in need of creation.`);
output.markdown(`Identified **${toDelete.length}** records in need of deletion.`);

const decision = await input.buttonsAsync('Proceed?', ['Yes', 'No']);

// Part 3: Execute the necessary operations

if (decision === 'No') {
    output.text('Operation cancelled.');
} else {
    output.text('Applying changes...');

    while (toDelete.length > 0) {
        await table3.deleteRecordsAsync(toDelete.slice(0, maxRecordsPerCall));
        toDelete = toDelete.slice(maxRecordsPerCall);
    }

    while (toCreate.length > 0) {
        await table3.createRecordsAsync(toCreate.slice(0, maxRecordsPerCall));
        toCreate = toCreate.slice(maxRecordsPerCall);
    }

    output.text('Done');
}
