// src/middleware/zodMiddleware.js
import { ZodError } from "zod";

export const validateWithZod = (schema, target = "body") => {
    return (req, res, next) => {
        try {
            const data = req[target];
            const result = schema.safeParse(data);

            if (!result.success) {
                console.error("❌ Zod Validation Failed:", result.error?.issues);

                return res.status(400).json({
                    success: false,
                    error: "Validation Error",
                    // show everything Zod gives back
                    details: result.error?.issues || [],
                });
            }

            if (target === "query" || target === "params") {
                Object.assign(req[target], result.data);
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
