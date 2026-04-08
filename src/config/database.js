import mongoose from "mongoose";

export const dbConnection = () => {
  // Suppress "new" option deprecation — use returnDocument instead
  mongoose.set("returnDocument", "after");

  // Connect to MongoDB and start server
  mongoose
    .connect(process.env.MONGO_URI)
    .then((conn) => {
      console.log(`Server connected to DB: ${conn.connection.host}`);
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB", err);
    });
};
