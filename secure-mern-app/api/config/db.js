const dns = require("node:dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is missing");
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000
        });

        console.log("MongoDB Atlas connected successfully");

    } catch (error) {
        console.error("MongoDB connection failed.");

       
        console.error(
            "Error category:",
            typeof error.name === "string"
                ? error.name
                : "UnclassifiedError"
        );

        console.error(
            "Error code:",
            typeof error.code === "string"
                ? error.code
                : "N/A"
        );

        throw new Error("Database connection unavailable");
    }
};

module.exports = connectDB;