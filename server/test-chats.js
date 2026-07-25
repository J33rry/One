import { db } from './src/db/index.js';
import { listChats } from './src/modules/chats/chats.service.js';
import { users } from './src/db/schema/index.js';

async function run() {
  const allUsers = await db.select().from(users).limit(1);
  if (!allUsers.length) {
    console.log("No users found");
    return;
  }
  const userId = allUsers[0].id;
  const chats = await listChats(userId);
  console.log(JSON.stringify(chats, null, 2));
  process.exit(0);
}
run().catch(console.error);
