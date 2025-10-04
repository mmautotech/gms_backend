import { body } from "express-validator";

// 🔹 Login validator
export const loginValidator = [
    body("username").trim().notEmpty().withMessage("Username is required").isLength({ min: 3 }),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }),
];

// 🔹 Register validator (admin creates user)
export const registerValidator = [
    body("username").trim().notEmpty().withMessage("Username is required").isLength({ min: 3 }),
    body("password").notEmpty().withMessage("Password is required").isLength({ min: 6 }),
    body("userType")
        .notEmpty()
        .withMessage("User type is required")
        .isIn(["admin", "sales", "customer_service", "parts", "accounts"])
        .withMessage("Invalid user type"),
];

// 🔹 Admin change password validator
export const adminChangePasswordValidator = [
    body("username").trim().notEmpty().withMessage("Username is required").isLength({ min: 3 }),
    body("newPassword").notEmpty().withMessage("New password is required").isLength({ min: 6 }),
];
