import { ZodError } from "zod";

export const validateWithZod = (schema, target = "body") => {
    return async (req, res, next) => {
        try {
            const data = req[target];
            const result = await schema.safeParseAsync(data);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: "Validation Error",
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
            res.status(500).json({
                success: false,
                error: "Internal Zod validation error",
                details: err.message || "Unknown error",
            });
        }
    };
};
