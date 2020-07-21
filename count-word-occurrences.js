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
 * Count word occurrences script
 *
 * Determine the number of fields that contain a given search term, and store
 * that number (also known as its "score") in a separate field.
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
    firstSearchFieldName: '',
    secondSearchFieldName: '',
    thirdSearchFieldName: '',
    scoreFieldName: '',
    searchTerm: ''
};

/**
 * Do not edit any code following this message.
 */

// Airtable limits batch operations to 50 records or fewer.
const maxRecordsPerCall = 50;

const table = hardCoded.tableName
    ? base.getTable(hardCoded.tableName)
    : await input.tableAsync('Table to search within');
const firstSearchField = hardCoded.firstSearchFieldName
    ? table.getField(hardCoded.firstSearchFieldName)
    : await input.fieldAsync('First field to seach within', table);
const secondSearchField = hardCoded.secondSearchFieldName
    ? table.getField(hardCoded.secondSearchFieldName)
    : await input.fieldAsync('Second field to seach within', table);
const thirdSearchField = hardCoded.thirdSearchFieldName
    ? table.getField(hardCoded.thirdSearchFieldName)
    : await input.fieldAsync('Third field to seach within', table);
const scoreField = hardCoded.scoreFieldName
    ? table.getField(hardCoded.scoreFieldName)
    : await input.fieldAsync("Field to store records's scores", table);
const searchTerm = hardCoded.searchTerm
    ? hardCoded.searchTerm
    : await input.textAsync('Search term');

const queryResult = await table.selectRecordsAsync();
let operations = [];

// Part 1: Prepare the operations

for (let record of queryResult.records) {
    let score = 0;

    if (record.getCellValueAsString(firstSearchField).includes(searchTerm)) {
        score += 1;
    }

    if (record.getCellValueAsString(secondSearchField).includes(searchTerm)) {
        score += 1;
    }

    if (record.getCellValueAsString(thirdSearchField).includes(searchTerm)) {
        score += 1;
    }

    operations.push({
        id: record.id,
        fields: {
            [scoreField.id]: score
        }
    });
}

// Part 2: Perform the operations in batches

while (operations.length > 0) {
    await table.updateRecordsAsync(operations.slice(0, maxRecordsPerCall));
    operations = operations.slice(maxRecordsPerCall);
}

output.text('Done');
