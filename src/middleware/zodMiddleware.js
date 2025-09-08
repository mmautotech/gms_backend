// src/middleware/zodMiddleware.js
import { ZodError } from "zod";

/**
 * Zod validation middleware
 * @param {ZodSchema} schema - The Zod schema to validate against
 * @param {'body'|'query'|'params'} [target='body'] - Target to validate (default = body)
 */
export const validateWithZod = (schema, target = "body") => {
    return (req, res, next) => {
        try {
            const data = req[target];
            const result = schema.safeParse(data);

            if (!result.success) {
                // ✅ Log Zod error details in the console for debugging
                console.error("❌ Zod Validation Failed:", result.error?.errors);

                // ✅ Safe fallback to empty array if result.error.errors is undefined
                const errors = Array.isArray(result.error?.errors)
                    ? result.error.errors.map((err) => ({
                        field: err.path.join("."),
                        message: err.message,
                    }))
                    : [];

                return res.status(400).json({
                    success: false,
                    error: "Validation Error",
                    details: errors,
                });
            }

            // ✅ Apply parsed data safely
            if (target === "query" || target === "params") {
                Object.assign(req[target], result.data); // mutate, don't overwrite
            } else {
                req[target] = result.data;
            }

            next();
        } catch (err) {
            console.error("🚨 Zod Middleware Internal Error:", err);
            res.status(500).json({
                success: false,
                error: "Internal Zod validation error",
                details: err.message || "Unknown error",
            });
        }
    };
};
