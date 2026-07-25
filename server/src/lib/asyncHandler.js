// Express 5 natively catches async rejections, but this wrapper makes the intent
// explicit and works as a safety net if a route is accidentally mounted on an
// Express 4-style router.
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
