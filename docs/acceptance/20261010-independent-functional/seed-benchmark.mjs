import fs from 'node:fs';
import init from 'sql.js';
const SQL=await init({locateFile:f=>'node_modules/sql.js/dist/'+f});
const db=new SQL.Database();db.run('CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), json TEXT NOT NULL); PRAGMA user_version=1;');
db.run('INSERT INTO state VALUES(1,?)',[fs.readFileSync('docs/acceptance/20261010-independent-functional/logs/state-before-native-backup.json','utf8')]);
fs.writeFileSync('docs/acceptance/20261010-independent-functional/data/benchmark/airjourney.sqlite',Buffer.from(db.export()));db.close();
