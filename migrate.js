// migrate.js
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin with Service Account
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migratePlayers() {
  const rawData = fs.readFileSync(path.join(__dirname, 'players.json'), 'utf8');
  const playersData = JSON.parse(rawData);

  // Handle both Array or Object format in players.json
  const playersArray = Array.isArray(playersData) 
    ? playersData 
    : Object.entries(playersData).map(([key, val]) => ({ id: key, ...val }));

  console.log(`Found ${playersArray.length} records to import...`);

  const collectionRef = db.collection('players');
  const batchSize = 400; // Batch limit is 500 in Firestore
  let totalImported = 0;

  for (let i = 0; i < playersArray.length; i += batchSize) {
    const batch = db.batch();
    const chunk = playersArray.slice(i, i + batchSize);

    chunk.forEach((player) => {
      // Use existing player id if present, otherwise let Firestore generate an auto-ID
      const docId = player.id ? String(player.id) : undefined;
      const docRef = docId ? collectionRef.doc(docId) : collectionRef.doc();

      batch.set(docRef, player, { merge: true });
    });

    await batch.commit();
    totalImported += chunk.length;
    console.log(`Uploaded batch: ${totalImported}/${playersArray.length} players`);
  }

  console.log('Migration completed successfully!');
}

migratePlayers().catch(console.error);