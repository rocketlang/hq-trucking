module.exports = {
  id: () => Math.random().toString(36).substring(2, 9),
  insert: (name, row) => {
    const rows = require(name);
    rows.push(row);
    return rows;
  },
  upsert: (name, row, key = 'id') => {
    const rows = require(name);
    const idx = rows.findIndex(r => r[key] === row[key]);
    if (idx >= 0) rows[idx] = row; else rows.push(row);
    return rows;
  },
  find: (name, predicate = () => true) => {
    const rows = require(name);
    return rows.filter(predicate);
  },
  all: (name) => require(name),
  replaceAll: (name, rows) => rows,
  tablesDir: "$ROOT/data/tables",
};
