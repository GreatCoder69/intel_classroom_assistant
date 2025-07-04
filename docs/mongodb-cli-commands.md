# MongoDB CLI Commands

## Basic MongoDB Shell Commands

### Connect to MongoDB
```bash
# Connect to local MongoDB
mongosh

# Connect to remote/Atlas MongoDB
mongosh "mongodb+srv://<username>:<password>@<cluster>/<dbname>"
```

### View Databases and Collections
```bash
# Show all databases
show dbs

# Switch to a database
use classroom_assistant

# Show collections in current database
show collections
```

### Query and View Data
```bash
# View all documents in a collection (limit 20)
db.users.find().limit(20)

# Pretty print results
db.chats.find().pretty()

# Find specific documents
db.users.find({ "role": "student" })

# Count documents
db.chats.countDocuments()
```

### Remove Data
```bash
# Remove a single document by criteria
db.users.deleteOne({ "email": "example@example.com" })

# Remove multiple documents
db.chats.deleteMany({ "timestamp": { $lt: ISODate("2023-01-01") } })

# Remove all documents in a collection
db.chats.deleteMany({})

# Drop an entire collection
db.chats.drop()
```
