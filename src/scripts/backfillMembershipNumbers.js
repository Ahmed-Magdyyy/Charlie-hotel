// src/scripts/backfillMembershipNumbers.js
// One-time migration script to generate membershipNumber for existing users.
// Usage: node src/scripts/backfillMembershipNumbers.js

import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";

const MONGO_URI = process.env.DB_URI || process.env.MONGO_URI;

function generateMembershipNumber() {
  const num = crypto.randomInt(1_000_000_000, 10_000_000_000);
  return String(num);
}

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");

  // Find all users without a membershipNumber
  const usersWithout = await usersCollection
    .find({ $or: [{ membershipNumber: null }, { membershipNumber: { $exists: false } }] })
    .project({ _id: 1 })
    .toArray();

  console.log(`Found ${usersWithout.length} users without a membership number.`);

  if (usersWithout.length === 0) {
    console.log("Nothing to do. Exiting.");
    await mongoose.disconnect();
    return;
  }

  // Collect all existing membership numbers to avoid collisions
  const existingNumbers = new Set();
  const cursor = usersCollection.find(
    { membershipNumber: { $exists: true, $ne: null } },
    { projection: { membershipNumber: 1 } },
  );
  for await (const doc of cursor) {
    existingNumbers.add(doc.membershipNumber);
  }

  let updated = 0;

  for (const user of usersWithout) {
    let candidate;
    do {
      candidate = generateMembershipNumber();
    } while (existingNumbers.has(candidate));

    existingNumbers.add(candidate);

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { membershipNumber: candidate } },
    );
    updated++;
  }

  console.log(`✅ Successfully assigned membership numbers to ${updated} users.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
