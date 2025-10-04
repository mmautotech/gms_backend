import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";

// Replace with your Atlas connection string
const uri = "mongodb+srv://admin:Waqas123@cluster0.4zhfrre.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const db = client.db("gms_db"); // Updated DB name
        const users = db.collection("users");

        // Hash the password
        const password = "admin123";
        const hash = await bcrypt.hash(password, 10);

        // Insert the admin user
        const result = await users.insertOne({
            username: "admin",
            passwordHash: hash,
            userType: "admin",
        });

        console.log("Inserted user with ID:", result.insertedId);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.close();
    }
}

run();
