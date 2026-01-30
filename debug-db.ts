import { schema } from './src/lib/db/index';

function checkDatabase() {
  console.log('Schema tables:', Object.keys(schema));
}

checkDatabase();
console.error('Error checking database');


