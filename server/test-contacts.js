import { db } from './src/db/index.js';
import { listContacts } from './src/modules/contacts/contacts.service.js';
import { users } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function run() {
  const allUsers = await db.select().from(users).limit(1);
  if (!allUsers.length) {
    console.log("No users found");
    return;
  }
  const userId = allUsers[0].id;
  const contacts = await listContacts(userId);
  console.log(JSON.stringify(contacts, null, 2));
  process.exit(0);
}
run().catch(console.error);
