/**
 * Centralised error handling.
 *
 * Clients receive a stable shape ({ msg }) with a safe message; the full error
 * (stack, Mongo details, driver internals) is kept in the server log only.
 */

/** Wraps an async route handler so rejected promises reach the error handler. */
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

function notFound(req, res) {
    res.status(404).json({ msg: 'Endpoint not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || mapErrorToStatus(err);

    // Full detail server-side only.
    console.error(`[error] ${req.method} ${req.originalUrl} →`, err && err.stack ? err.stack : err);

    if (res.headersSent) return;

    res.status(status).json({ msg: publicMessage(err, status) });
}

function mapErrorToStatus(err) {
    if (!err) return 500;
    if (err.name === 'ValidationError') return 422;
    if (err.name === 'CastError') return 400;
    if (err.code === 11000) return 409;
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return 401;
    return 500;
}

function publicMessage(err, status) {
    if (err && err.expose && err.message) return err.message;

    switch (status) {
        case 400: return 'Invalid request';
        case 401: return 'Authentication required';
        case 403: return 'Access denied';
        case 404: return 'Not found';
        case 409: return 'This record already exists';
        case 422: return 'The submitted data failed validation';
        case 429: return 'Too many requests. Please try again shortly.';
        default: return 'Something went wrong. Please try again.';
    }
}

/** Builds an error whose message is safe to show the client. */
function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    err.expose = true;
    return err;
}

module.exports = { asyncHandler, errorHandler, notFound, httpError };
