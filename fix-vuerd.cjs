const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const filePath = path.join(__dirname, 'schema.vuerd.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

const tableEntities = data.collections.tableEntities;
const columnEntities = data.collections.tableColumnEntities;
const relEntities = data.collections.relationshipEntities;

let brandsTableId = null;
let productsTableId = null;

for (const id in tableEntities) {
    if (tableEntities[id].name === 'brands') brandsTableId = id;
    if (tableEntities[id].name === 'products') productsTableId = id;
}

let brandsIdColId = null;
let productsBrandIdColId = null;

for (const id in columnEntities) {
    const col = columnEntities[id];
    if (col.tableId === brandsTableId && col.name === 'id') brandsIdColId = id;
    if (col.tableId === productsTableId && (col.name === 'brand' || col.name === 'brand_id')) {
        productsBrandIdColId = id;
    }
}

// Rename column to brand_id if needed
if (columnEntities[productsBrandIdColId].name === 'brand') {
    columnEntities[productsBrandIdColId].name = 'brand_id';
}

if (!columnEntities[productsBrandIdColId].ui) {
    columnEntities[productsBrandIdColId].ui = {};
}
columnEntities[productsBrandIdColId].ui.foreignKey = true;

let relExists = false;
let relResult = null;
for (const id in relEntities) {
    const r = relEntities[id];
    if (r.start.tableId === brandsTableId && r.end.tableId === productsTableId && 
        r.start.columnIds.includes(brandsIdColId) && r.end.columnIds.includes(productsBrandIdColId)) {
        relExists = true;
        relResult = r;
        break;
    }
}

if (!relExists) {
    const relId = crypto.randomUUID();
    const newRel = {
        id: relId,
        identification: false,
        relationshipType: 'ZeroOneN',
        startRelationshipType: 'Dash',
        start: {
            tableId: brandsTableId,
            columnIds: [brandsIdColId],
            x: 0,
            y: 0,
            direction: 'bottom'
        },
        end: {
            tableId: productsTableId,
            columnIds: [productsBrandIdColId],
            x: 0,
            y: 0,
            direction: 'top'
        },
        meta: { updateAt: Date.now(), createAt: Date.now() }
    };
    relEntities[relId] = newRel;
    relResult = newRel;
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

const output = {
    "brandsTableId": brandsTableId,
    "productsTableId": productsTableId,
    "brandsIdColId": brandsIdColId,
    "productsBrandIdColId": productsBrandIdColId,
    "relationship": relResult,
    "updatedColumnUI": columnEntities[productsBrandIdColId].ui
};

console.log(JSON.stringify(output, null, 2));
