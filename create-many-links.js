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
 * Create many links script
 *
 * Given a record in a "parent" table, create some number of "child" records in
 * another table, where each "child" references the "parent" through a Linked
 * Record field.
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
    parentTableName: '',
    childTableName: '',
    linkFieldName: '',
    newRecordCount: ''
};

/**
 * Do not edit any code following this message.
 */

// Airtable limits batch operations to 50 records or fewer.
const maxRecordsPerCall = 50;

const parentTable = hardCoded.parentTableName
    ? base.getTable(hardCoded.parentTableName)
    : await input.tableAsync('Parent table name (holds the existing record)');
const parentRecord = await input.recordAsync('Parent record', parentTable);
const childTable = hardCoded.childTableName
    ? base.getTable(hardCoded.childTableName)
    : await input.tableAsync('Child table name (holds the new records)');
const linkField = hardCoded.linkFieldName
    ? childTable.getField(hardCoded.linkFieldName)
    : await input.fieldAsync('Link field', childTable);
const newRecordCount = hardCoded.newRecordCount
    ? parseInt(hardCoded.newRecordCount, 10)
    : parseInt(await input.textAsync('Number of records to create'), 10);

let newRecords = [];

// Part 1: Prepare the new records

for (let index = 0; index < newRecordCount; index += 1) {
    newRecords.push({
        fields: {
            [linkField.id]: [{id: parentRecord.id}]
        }
    });
}

// Part 2: Perform the record creation operations in batches

while (newRecords.length > 0) {
    await childTable.createRecordsAsync(newRecords.slice(0, maxRecordsPerCall));
    newRecords = newRecords.slice(maxRecordsPerCall);
}

output.text('Done');
