import bcrypt from "bcrypt";

const password = "admin123";
const hash = await bcrypt.hash(password, 10);

console.log(hash);


db.users.insertOne({
    username: "admin",
    passwordHash: "$2b$10$tfPi3ilflUQ6AyVUPH7.oeq0/YNaXJjhM6sVb7S7jmkdwyDM2FdXW", // your generated hash
    userType: "admin"
});
