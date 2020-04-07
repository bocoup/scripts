// Configuration

const tableName = 'Clients';
const fieldMap = {
    'Name': {
        clearbitParam: 'name',
        overwrite: false,
    },
    'Website': {
        clearbitParam: 'domain',
        overwrite: false,
    },
    'Attachments': {
        clearbitParam: 'logo',
        overwrite: false,
    },
};

// End of configuration

await main({tableName, fieldMap});

function fieldForParam(fieldMap, param) {
    for (const key in fieldMap) {
        const value = fieldMap[key];
        if (value.clearbitParam === param) {
            return key;
        }
    }
    return null;
}

function basename(path) {
    const index = path.lastIndexOf('/');
    return path.substring(index + 1);
}

function renderer(state) {
    const header = `# Suggesting company logos and websites

`;
    const footer = `

[Clearbit]: (clearbit.com)
`;
    let lastRender = 0;

    return async function render(stage) {
        if (stage !== 'done' && Date.now() - lastRender < 500) {
            return;
        }
        lastRender = Date.now();

        let body;
        if (stage === 'selecting records') {
            body = `${header}Selecting records from "${state.tableName}" ...${footer}`;
        } else if (stage === 'filtering records') {
            body = `${header}Filtering ${state.totalSelected} records from "${state.tableName}" ...${footer}`;
        } else if (stage === 'suggesting') {
            body = `${header}Getting suggestion for "${state.recordNames[state.recordIndex]}" (${state.recordIndex + 1} of ${state.recordNames.length}) from [Clearbit] ...${footer}`;
        } else if (stage === 'done') {
            body = `${header}Found suggestions for ${state.totalSuggested} out of ${state.recordNames.length} records.${footer}`;
        }

        await output.clear();
        await output.markdown(body);
    };
}

async function main({tableName, fieldMap}) {
    const nameField = fieldForParam(fieldMap, 'name');
    const fields = Object.keys(fieldMap); 

    const targetTable = base.getTable(tableName);

    const progressState = {
        tableName,
        recordNames: null,
        recordIndex: -1,
        totalSelected: 0,
        totalSuggested: 0,
    };
    const render = renderer(progressState);
    await render('selecting records');

    const currentRecords = await targetTable.selectRecordsAsync({
        fields,
    });

    progressState.totalSelected = currentRecords.records.length;

    let targetRecords;

    if (Object.values(fieldMap).some(field => field.overwrite)) {
        targetRecords = currentRecords.records;
    } else {
        await render('filtering records');

        targetRecords = currentRecords.records.filter(record => {
            for (const key in fieldMap) {
                const cell = record.getCellValue(key);
                const tableField = targetTable.getField(key);

                let value;
                if (tableField.type === 'singleLineText') {
                    value = cell;
                } else if (tableField.type === 'multipleAttachments') {
                    value = (cell && cell.length > 0) ? cell[0].url : null;
                }

                if (!value) return true;
            }
        });
    }

    progressState.recordNames = targetRecords.map(record => record.getCellValue(nameField));

    for (let i = 0; i < targetRecords.length; i++) {
        const record = targetRecords[i];

        progressState.recordIndex = i;
        await render('suggesting');

        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${targetRecords[i].getCellValue(nameField)}`);
        const clearbitSuggestions = await response.json(); 
        const clearbitSuggestion = clearbitSuggestions[0];

        if (!clearbitSuggestion) continue;

        progressState.totalSuggested += 1;

        const value = Object.entries(fieldMap).reduce((acc, [key, field]) => {
            if (!acc) return acc;
            const cell = record.getCellValue(key);
            const tableField = targetTable.getField(key);

            if (tableField.type === 'singleLineText') {
                if (!cell || field.overwrite) {
                    acc[key] = clearbitSuggestion[field.clearbitParam];
                }
            } else if (tableField.type === 'multipleAttachments') {
                const clearbitUrl = clearbitSuggestion[field.clearbitParam];
                const clearbitFilename = `clearbit-${basename(clearbitUrl)}.png`;
                if (!cell || cell.length === 0 || !cell.some(attachment => attachment.filename === clearbitFilename)) {
                    acc[key] = [...(cell || []), {
                        url: clearbitUrl,
                        filename: clearbitFilename
                    }];
                }
            }

            return acc;
        }, {});

        if (!value || Object.keys(value).length === 0) continue;

        await targetTable.updateRecordAsync(record.id, value);
    }

    await render('done');
}
