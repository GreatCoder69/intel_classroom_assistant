/**
 * Database management utility for Intel Classroom Assistant
 * 
 * Run with: node db-manager.js [command] [options]
 * Example: node db-manager.js list users
 */

const { MongoClient, ObjectId } = require('mongodb');
const readline = require('readline');

// Configuration - replace with your actual connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'classroom_assistant';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to MongoDB
async function connectToMongo() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  console.log('Connected to MongoDB');
  return client.db(DB_NAME);
}

// List collections or documents in a collection
async function listData(collectionName) {
  const db = await connectToMongo();
  
  if (!collectionName) {
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(collection => console.log(`- ${collection.name}`));
    return;
  }
  
  // List documents in the specified collection
  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();
  console.log(`Found ${count} documents in ${collectionName}`);
  
  const limit = 10; // Limit results to avoid overwhelming the console
  const documents = await collection.find({}).limit(limit).toArray();
  
  console.log(`Showing first ${Math.min(limit, count)} documents:`);
  documents.forEach(doc => console.log(JSON.stringify(doc, null, 2)));
  
  if (count > limit) {
    console.log(`...and ${count - limit} more documents`);
  }
}

// Remove data from a collection
async function removeData(collectionName, query) {
  const db = await connectToMongo();
  const collection = db.collection(collectionName);
  
  if (!query) {
    // Confirm before deleting all documents
    rl.question(`Are you sure you want to delete ALL documents in ${collectionName}? (yes/no): `, async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        const result = await collection.deleteMany({});
        console.log(`Deleted ${result.deletedCount} documents from ${collectionName}`);
      } else {
        console.log('Operation cancelled');
      }
      rl.close();
    });
    return;
  }
  
  try {
    // Parse the query string to a JSON object
    const queryObj = JSON.parse(query);
    const count = await collection.countDocuments(queryObj);
    
    rl.question(`This will delete ${count} documents. Proceed? (yes/no): `, async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        const result = await collection.deleteMany(queryObj);
        console.log(`Deleted ${result.deletedCount} documents from ${collectionName}`);
      } else {
        console.log('Operation cancelled');
      }
      rl.close();
    });
  } catch (error) {
    console.error('Error parsing query:', error.message);
    console.log('Query should be a valid JSON string, e.g. \'{"completed": true}\'');
    rl.close();
  }
}

// Main function to handle commands
async function main() {
  const command = process.argv[2];
  const collectionName = process.argv[3];
  const query = process.argv[4];
  
  try {
    switch (command) {
      case 'list':
        await listData(collectionName);
        if (!collectionName) rl.close();
        break;
      case 'remove':
        if (!collectionName) {
          console.error('Collection name is required for remove command');
          rl.close();
          return;
        }
        await removeData(collectionName, query);
        break;
      default:
        console.log(`
Database Manager for Intel Classroom Assistant

Usage:
  node db-manager.js list                     - List all collections
  node db-manager.js list [collection]        - List documents in collection
  node db-manager.js remove [collection]      - Remove ALL documents in collection
  node db-manager.js remove [collection] '{"field":"value"}' - Remove documents matching query
        `);
        rl.close();
    }
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { connectToMongo, listData, removeData };
