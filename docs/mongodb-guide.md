# MongoDB Database Management Guide

## Using MongoDB Compass

1. **Download & Install**: Download MongoDB Compass from [https://www.mongodb.com/products/compass](https://www.mongodb.com/products/compass)

2. **Connect to your database**:
   - Launch Compass
   - Enter your connection string (e.g., `mongodb://localhost:27017` for local development)
   - For Atlas, use: `mongodb+srv://<username>:<password>@<cluster-url>/`

3. **Browse and Manage Data**:
   - Navigate through databases in the left sidebar
   - Click on collections to view documents
   - Use the query bar to filter documents with MongoDB syntax: `{ "field": "value" }`
   - Edit documents by clicking on them
   - Delete documents using the trash icon or by selecting multiple documents

4. **Remove Data**:
   - Single document: Click the trash icon next to any document
   - Multiple documents: Use checkboxes to select documents, then click "Delete"
   - Entire collection: Right-click a collection → "Drop Collection"
   - Clear collection: Navigate to collection → Click "..." menu → "Drop All Documents"

![MongoDB Compass Interface](https://docs.mongodb.com/compass/current/images/compass/collection-view.png)
