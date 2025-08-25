const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const file = path.join(__dirname, 'data.json');
const adapter = new JSONFile(file);
const db = new Low(adapter, { entries: [] });

async function init() {
    await db.read();
    db.data ||= { entries: [] };
    await db.write();
}

function parseRow(row) {
    if (!row) return null;
    return {
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
    };
}

module.exports = { db, init, parseRow };


