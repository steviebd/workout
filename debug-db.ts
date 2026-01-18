import { schema } from './src/lib/db/index';

async function checkDatabase() {
  console.log('Schema tables:', Object.keys(schema));
}

checkDatabase().catch(console.error);


