// controllers/userController.js
import User from "../models/User.js";

/**
 * GET /api/users/options
 * Query:
 *   - format=list|map (default: list)
 * Returns:
 *   - format=list: { success, data: [{ id, username, userType }], meta }
 *   - format=map:  { success, data: { [id]: username }, meta }
 */
export const getUserOptions = async (req, res) => {
    try {
        const { format = "list" } = req.query;

        const users = await User.find()
            .select("_id username")
            .sort({ username: 1 })
            .lean();

        let data;
        if (format === "map") {
            data = Object.fromEntries(users.map((u) => [u._id.toString(), u.username]));
        } else {
            data = users.map((u) => ({
                id: u._id.toString(),
                username: u.username,
            }));
        }

        return res.json({
            success: true,
            data,
            meta: { count: users.length, format },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: "Error fetching user options",
            details: error.message,
        });
    }
};
