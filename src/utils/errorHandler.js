// src/utils/errorHandler.js

/**
 * Standardized error sender for controllers
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code (default: 500)
 * @param {string|Object} message - Error message or object
 */
export const sendError = (res, status = 500, message = "Server Error") => {
    // If message is an Error object, extract the text
    const errorMsg = message?.message || message;

    return res.status(status).json({
        success: false,
        error: errorMsg,
    });
};

/**
 * Express global error-handling middleware
 * Place this after all routes in app.js
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
    console.error("Unhandled Error:", err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Server Error";

    res.status(statusCode).json({
        success: false,
        error: message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};
