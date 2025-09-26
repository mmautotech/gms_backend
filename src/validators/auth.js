import { body } from "express-validator";

// 🔹 Login validator
export const loginValidator = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// 🔹 Register validator (admin creates user)
export const registerValidator = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),

    body("password")
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),

    body("userType")
        .notEmpty().withMessage("User type is required")
        .isIn(["admin", "sales", "customer_service", "parts", "accounts"])
        .withMessage("Invalid user type"),
];

// 🔹 Forgot password validator
export const forgotPasswordValidator = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required")
];


export const adminChangePasswordValidator = [
    body("username")
        .trim()
        .notEmpty().withMessage("Username is required")
        .isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),

    body("newPassword")
        .notEmpty().withMessage("New password is required")
        .isLength({ min: 6 }).withMessage("New password must be at least 6 characters"),
];