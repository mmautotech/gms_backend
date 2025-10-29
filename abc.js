import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

// ✅ Local MongoDB connection string
const uri = "mongodb://127.0.0.1:27017/gms";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to local MongoDB");

        const db = client.db("Gms"); // your local GMS database
        const users = db.collection("users");

        // Hash the password
        const password = "admin123";
        const hash = await bcrypt.hash(password, 10);

        // Check if admin already exists
        const existing = await users.findOne({ username: "admin" });
        if (existing) {
            console.log("⚠️ Admin user already exists!");
            return;
        }

        // Insert the admin user
        const result = await users.insertOne({
            username: "admin",
            passwordHash: hash,
            userType: "admin",
            createdAt: new Date(),
        });

        console.log("✅ Inserted admin user with ID:", result.insertedId);
    } catch (err) {
        console.error("❌ Error:", err);
    } finally {
        await client.close();
    }
}

run();
