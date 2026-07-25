import { AppError } from "../lib/AppError.js";

// Factory: creates middleware that fetches a resource and verifies the
// authenticated user owns it. Attaches the resource to req.resource.
export function requireOwnership(getResource, getOwnerId = (r) => r.userId) {
    return async (req, _res, next) => {
        const resource = await getResource(req);

        if (!resource) {
            throw new AppError(404, "Resource not found", "NOT_FOUND");
        }

        if (getOwnerId(resource) !== req.user.id) {
            throw new AppError(403, "You do not own this resource", "FORBIDDEN");
        }

        req.resource = resource;
        next();
    };
}
