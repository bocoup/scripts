// First, we'll create an input to ask the user to choose a table that contains the email address field requiring validation
// We'll assign the response to a variable called table so we can reference later. We'll also use await so the script knows
// to wait for the user's input before continuing on.
let table = await input.tableAsync("Please select the table with the field you want to validate.");

// Next, we need to do the same thing but ask for the field requiring validation. We'll supply the table the user selected
// in the previous step so the script knows where to find the field.
let field = await input.fieldAsync("Please select the field that you'd like to validate.", table);

// To validate a string of text we need to use a regular expression.
// Regular expressions are complex — read more about them here: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
// This regular expression checks to see if an email address is in the correct format.
// It will make sure the email address is formatted correctly and uses a 2-3 letter TLD (e.g. .com, .net. org).
// It'll also check for some of the newer, longer TLDs (e.g. .aero, .coop, .info) which you can see specified toward the end of the regular expression below.
// If you want to add additional TLDs to validate with, you just add a pipe and the TLD (after the last one) like this: |space
// You can swap out this regular expression for another that works better for you if you like.
// It doesn't even have to validate an email address. You can simply change it to something else and use this script
// to validate any kind of field that contains a text string (or number, technically).
let regexp = /[_a-zA-Z0-9-]+(\.[_a-zA-Z0-9-]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.(([0-9]{1,3})|([a-zA-Z]{2,3})|(aero|coop|info|museum|name))/g;

// Now let's grab all of the records from the table the user selected by calling the selectRecordsAsync method.
// We only need the cell values in the selected field, so we'll specify that with the fields argument.
let queryResult = await table.selectRecordsAsync({
    fields: [field]
});

// Before we move on, let's create an empty array that can hold onto the validation results that we'll need to display later.
let results = [];

// With the records ready to check and our regular expression defined, we can use a for loop to loop through every
// record and check if the email address is valid.
for (let record of queryResult.records) {
    // Let's first grab the primary field for identification purposes and store it in a variable.
    let name = record.name;
    // Now we'll do the same for the contents of the field we want to validate. If the cell is empty, getCellValue returns null.
    let cellValue = record.getCellValue(field);

    let validation;
    if (cellValue) {
        // If the cell value exists, we'll use the match method to validate it against our regular expression.
        validation = cellValue.match(regexp);
    } else {
        // If the cell value does not exist, we'll treat it as invalid.
        validation = null;
    }

    // Once the validation is complete, it will either contain the matched email address or null to indicate that it did not.
    // That's not going to be 100% clear to the user so we should check this result and display it in a readable format (emojis).
    let resultText;
    if (validation === null) {
        resultText = "❌";
    } else {
        resultText = "✅";
    }

    // Let's store all of that information in an object so we can use it to make a nice table for the user.
    let result = {
        Record: name,
        "Cell value": cellValue,
        "Valid?": resultText
    };
    // Now we'll push the result object into the array we created earlier while the loop continues to look at other records.
    results.push(result);
}

// Now we get to do the fun and easy part: output a table containing the results!
// All you need to do is use the output.table method and pass the results array we created as its sole parameter.
// Because that array contains a series of objects with consistent titles, it can generate a nice table with headers
// with just just a single line of code. :)
output.table(results);
