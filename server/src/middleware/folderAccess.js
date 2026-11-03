import { AppError } from "../lib/AppError.js";
import { db } from "../db/index.js";
import { chatFolders } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

// Folders are owned outright by one user, so the chat middlewares don't apply.
export async function requireFolderOwner(req, _res, next) {
    const { folderId } = req.params;

    const [folder] = await db
        .select()
        .from(chatFolders)
        .where(eq(chatFolders.id, folderId))
        .limit(1);

    if (!folder || folder.userId !== req.user.id) {
        // Same response whether it is missing or someone else's, so this
        // cannot be used to probe for other users' folder ids.
        throw new AppError(403, "You do not own this folder", "NOT_OWNER");
    }

    req.folder = folder;
    next();
}
