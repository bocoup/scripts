output.markdown("## 🎉☕️ It's virtual coffee meeting matchup time! ☕️🎉");

// Default table and field names
let peopleTableName = 'People';
let meetingsTableName = 'Meetings';
let peopleFieldName = 'People';
let dateFieldName = 'Date';

// Regular expression for YYYY-MM-DD HH:MM date format.
let dateRegExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/g;

// This function returns a random number in a specified range (between "min" and "max").
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

// This function returns a random element in an array.
function getRandomArrayElement(array) {
    return array[getRandomNumber(0, array.length - 1)];
}

// Greet the user.
let greetings = [
    'Oh, hey there ',
    'Hey ',
    'Hello ',
    'Hi ',
    'Greetings ',
    'Hey there ',
    'Oh, hello ',
    'Oh, hi '
];
let punctuation = ['.', '!', '. 😁', '. 😎', '! 😀', '. 🥰'];
let emoji = ['😄', '😉', '😁', '🙃', '🙂', '😄', '😊', '😎', '🥳', '🤟', '🤙', '👍', '👏'];
output.text(
    `${getRandomArrayElement(greetings)}${
        session.currentUser.name.split(' ')[0]
    }${getRandomArrayElement(punctuation)}`
);

// Check if the tables exist as expected, otherwise request user selection.
let peopleTable;
try {
    peopleTable = base.getTable(peopleTableName);
} catch {
    peopleTable = await input.tableAsync(
        `I can't find a table in your base called "${peopleTableName}" so what table would you like to use? I can work with any table that has names of people as the primary field.`
    );
}

let meetingsTable;
try {
    meetingsTable = base.getTable(meetingsTableName);
} catch {
    meetingsTable = await input.tableAsync(
        `Hmm... I'm not seeing a "${meetingsTableName}" table. Can you select the table you want to use to store the meetings? It needs to be linked to the "${peopleTable.name}" table.`
    );
}

// Check if the "Meetings" table (or whatever the user chose) contains the "People" linked record field and request a field choice from the user if it can't be found.
let peopleField;
try {
    peopleField = meetingsTable.getField(peopleFieldName);
} catch {
    peopleField = await input.fieldAsync(
        `I'm having some trouble locating the "${peopleFieldName}" field in the "${meetingsTable.name}" table. Which field should I use? It needs to link to records in the "${peopleTable.name}" table.`,
        meetingsTable
    );
}
// Now get the corresponding linked record field name in the "Meetings" table (via the "People" table link)
let meetingsField = peopleTable.getField(peopleField.options.inverseLinkFieldId);

// One more time for the "Date" field in the "Meetings" table.
let dateField;
try {
    dateField = meetingsTable.getField(dateFieldName);
} catch {
    dateField = await input.fieldAsync(
        `I'm not sure which field you want to use to store dates in the "${meetingsTable.name}" table. Can you choose the correct field for me?`,
        meetingsTable
    );
}
// Now let's make sure the user chose a date field and not another type.
if (dateField.type !== 'date' && dateField.type !== 'dateTime') {
    dateField = await input.fieldAsync(
        `The date field you provided doesn't appear to be a date field. Please choose an available date field in the "${meetingsTable.name}" table.`,
        meetingsTable
    );
}

// Check how many views the people table contains. If it has more than one view, ask the user to select which view they would like to use.
// If not, just select the only view for them.
let peopleView;
if (peopleTable.views.length > 1) {
    // Ask the user for a view in case they want to use a filtered view to remove some of the people from selection for whatever reason.
    peopleView = await input.viewAsync(
        `Would you like to limit people to a particular view in the ${peopleTable.name} table?`,
        peopleTable
    );
} else {
    peopleView = peopleTable.views[0];
}

// Ask the user if they want to enter a date, use today's date, or leave it blank...
let dateType = await input.buttonsAsync(
    `How do you want to handle the timing of these meetings? I can just set it to today's date for you if you like or I can just leave it blank. You can also enter a date (and time) yourself, if you prefer.`,
    [
        {label: `Today, please!`, value: 'today', variant: 'primary'},
        {label: `I'll enter it!`, value: 'custom'},
        {label: `Leave it blank!`, value: 'blank'}
    ]
);
// ...and respond based on the user's choice.
let meetingsDate;
if (dateType === 'today') {
    meetingsDate = new Date();
    output.text(`You got it! I'll set the dates to ${meetingsDate} for you.`);
} else if (dateType === 'custom') {
    meetingsDate = await input.textAsync(
        `Okay, what date should I use? You can include the time, too. Make sure to use this format: YYYY-MM-DD HH:MM (e.g. 2020-02-02 14:00)!`
    );
    while (!meetingsDate.match(dateRegExp)) {
        meetingsDate = await input.textAsync(
            `The date you entered doesn't seem to match the required format. Make sure to use this format: YYYY-MM-DD HH:MM (e.g. 2020-05-09 09:15)!`
        );
    }
} else {
    output.text(`I'll leave the dates blank then. 😊`);
}

// Setup and get the records.
output.text(`Okay, just give me a second to figure this out...`);
let peopleQuery = await peopleView.selectRecordsAsync();
let meetingsQuery = await meetingsTable.selectRecordsAsync();
let list = '';

// First, let's get everyone into a set to make matching easier.
let peopleIds = new Set(peopleQuery.records.map((record) => record.id));

// Now let's match everybody up! :)
let meetingsToCreate = [];
for (let person1 of peopleQuery.records) {
    // Remove the first person from the peopleIds set.
    if (peopleIds.has(person1.id)) {
        peopleIds.delete(person1.id);

        // Create a Map containing the number of previous meetings person1 had with each other person.
        let meetingCountByPersonId = new Map();
        for (let meeting of person1.getCellValue(meetingsField) || []) {
            // Get the other person in the meeting.
            let person = meetingsQuery
                .getRecord(meeting.id)
                .getCellValue(peopleField)
                .filter((meetingPerson) => meetingPerson.id !== person1.id)[0];

            // If meetingCountByPersonId already has this person, increase the count by 1, otherwise set the count to 1.
            if (meetingCountByPersonId.has(person.id)) {
                meetingCountByPersonId.set(person.id, meetingCountByPersonId.get(person.id) + 1);
            } else {
                meetingCountByPersonId.set(person.id, 1);
            }
        }

        let person2Id;
        if (peopleIds.size > 0) {
            // If there are leftover people that person1 has never met, use the first one.
            person2Id = Array.from(peopleIds)[0];
        } else {
            // Otherwise, person1 has met everyone, so find the person they've met with the least.
            // Convert meetingCountByPersonId to an array. Each element is a nested array of [personId, meetingCount].
            // We can sort the outer array by meetingCount (lowest to highest) and then get the first personId.
            let sortedPersonIdsAndMeetingCounts = Array.from(meetingCountByPersonId).sort(
                (a, b) => a[1] - b[1]
            );
            person2Id = sortedPersonIdsAndMeetingCounts[0][0];
        }
        let person2 = peopleQuery.getRecord(person2Id);

        // Remove the second person from the peopleIds set.
        peopleIds.delete(person2.id);

        // Create the new meeting record.
        meetingsToCreate.push({
            fields: {
                [peopleField.id]: [{id: person1.id}, {id: person2.id}],
                [dateField.id]: meetingsDate
            }
        });

        // Update the list of matches.
        list += `${getRandomArrayElement(emoji)} ${person1.name} & ${person2.name} \n\r`;
    }
}

// Output the list of matches for the user.
output.text(list);

// Add the matches as meetings in the designated table.
try {
    while (meetingsToCreate.length > 0) {
        await meetingsTable.createRecordsAsync(meetingsToCreate.slice(0, 50));
        meetingsToCreate = meetingsToCreate.slice(50);
    }
    await output.text(
        `Okay, all good to go! I've stored the matchups in the "${meetingsTable.name}" table.`
    );
} catch {
    let err = `Sorry, I'm having trouble adding new records to the "${meetingsTable.name}" table.`;
    if (dateType === 'custom') {
        err += ` Are you sure you entered the date in a compatible format? As a reminder, this is what you choose: ${meetingsDate}.`;
    } else {
        err += " I'm not really sure what the issue was, though.";
    }
    output.text(err);
}
