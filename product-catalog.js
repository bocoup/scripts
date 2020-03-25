// For https://airtable.com/templates/local-business/expZvMLT9L6c4yeBX/product-catalog
let lineItemsTable = base.getTable('Order line items');
let clientOrdersTable = base.getTable('Client orders');
let furnitureTable = base.getTable('Furniture');

output.markdown('## Add a line item');

let clientOrdersRecord = await input.recordAsync('Pick a client order', clientOrdersTable);
if (clientOrdersRecord) {
    let furnitureRecord = await input.recordAsync('Pick a furniture item', furnitureTable);
    if (furnitureRecord) {
        let quantity = parseInt(await input.textAsync('Enter the quantity'), 10);
        let lineItemRecordId = await lineItemsTable.createRecordAsync({
            'Belongs to order': [{id: clientOrdersRecord.id}],
            'Furniture item': [{id: furnitureRecord.id}],
            Quantity: quantity
        });
        let lineItemsQuery = await lineItemsTable.selectRecordsAsync();
        let lineItemRecord = lineItemsQuery.records.find(
            (record) => record.id === lineItemRecordId
        );
        output.markdown(`Added new line item: **${lineItemRecord.getCellValueAsString('Name')}**`);
    } else {
        output.markdown('No item picked');
    }
} else {
    output.markdown('No client picked');
}
