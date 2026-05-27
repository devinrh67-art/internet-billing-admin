import express from "express";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "tiva_db.json");
const CONFIG_FILE = path.join(process.cwd(), "firebase-applet-config.json");

app.use(express.json({ limit: "50mb" }));

interface DbState {
  initialized: boolean;
  users: any[];
  customers: any[];
  invoices: any[];
  transactions: any[];
  version: number;
}

// Global Firebase services variables
let firebaseApp: any = null;
let db: any = null;
let auth: any = null;
let isFirebaseConnected = false;

// Initialize Firebase SDK Client
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    firebaseApp = initializeApp(config);
    db = getFirestore(firebaseApp, config.firestoreDatabaseId);
    auth = getAuth(firebaseApp);
    
    // Auth anonymously to satisfy firestore.rules
    signInAnonymously(auth)
      .then(() => {
        console.log("Node server connected to Firestore anonymously successfully!");
        isFirebaseConnected = true;
      })
      .catch((err) => {
        console.error("Node server failed to authenticate anonymously to Firebase:", err);
      });
  } else {
    console.warn("Firebase config file not found. Running server in local mode.");
  }
} catch (err) {
  console.error("Error during Firebase initialization in node server:", err);
}

// ----------------------------------------
// Local File Fallback Handlers
// ----------------------------------------
function loadDbLocal(): DbState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error loading local DB file:", err);
  }
  return {
    initialized: false,
    users: [],
    customers: [],
    invoices: [],
    transactions: [],
    version: 0
  };
}

function saveDbLocal(dbState: DbState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving local DB file:", err);
  }
}

// ----------------------------------------
// Firestore Sync Handlers
// ----------------------------------------
async function fetchCollection(collectionName: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map(doc => doc.data());
  } catch (err) {
    console.error(`Error fetching collection ${collectionName} from Firestore:`, err);
    return [];
  }
}

async function syncCollection(collectionName: string, incomingItems: any[]) {
  try {
    const collRef = collection(db, collectionName);
    const snap = await getDocs(collRef);
    const existingIds = new Set(snap.docs.map(doc => doc.id));
    const incomingIds = new Set(incomingItems.map(item => item.id));

    // 1. Delete orphaned keys
    for (const docId of existingIds) {
      if (!incomingIds.has(docId)) {
        await deleteDoc(doc(db, collectionName, docId));
      }
    }

    // 2. Overwrite / insert new records
    for (const item of incomingItems) {
      if (item.id) {
        await setDoc(doc(db, collectionName, item.id), item);
      }
    }
  } catch (err) {
    console.error(`Error saving collection ${collectionName} to Firestore:`, err);
  }
}

async function loadDbCombined(): Promise<DbState> {
  if (isFirebaseConnected && db) {
    try {
      const metaSnap = await getDoc(doc(db, "system", "config"));
      if (metaSnap.exists()) {
        const meta = metaSnap.data();
        if (meta && meta.initialized) {
          const users = await fetchCollection("users");
          const customers = await fetchCollection("customers");
          const invoices = await fetchCollection("invoices");
          const transactions = await fetchCollection("transactions");
          
          return {
            initialized: true,
            users,
            customers,
            invoices,
            transactions,
            version: meta.version || 1
          };
        }
      }
    } catch (err) {
      console.error("Firestore sync fetch failed, falling back to local schema:", err);
    }
  }
  return loadDbLocal();
}

async function saveDbCombined(dbState: DbState) {
  // Always save to disk redundantly
  saveDbLocal(dbState);

  if (isFirebaseConnected && db) {
    try {
      await syncCollection("users", dbState.users);
      await syncCollection("customers", dbState.customers);
      await syncCollection("invoices", dbState.invoices);
      await syncCollection("transactions", dbState.transactions);

      await setDoc(doc(db, "system", "config"), {
        initialized: true,
        version: dbState.version
      });
      console.log(`Firestore and Local state synchronized successfully! Version: ${dbState.version}`);
    } catch (err) {
      console.error("Failed to sync database state to Firestore:", err);
    }
  }
}

// ----------------------------------------
// Express Routing APIs
// ----------------------------------------

// 1. API route to get current DB state (reads from Firestore/Local)
app.get("/api/db", async (req, res) => {
  const dbState = await loadDbCombined();
  res.json(dbState);
});

// 2. API route to initialize the DB if it hasn't been initialized yet
app.post("/api/db/init", async (req, res) => {
  const dbState = await loadDbCombined();
  if (!dbState.initialized) {
    const { users, customers, invoices, transactions } = req.body;
    dbState.users = users || [];
    dbState.customers = customers || [];
    dbState.invoices = invoices || [];
    dbState.transactions = transactions || [];
    dbState.initialized = true;
    dbState.version = 1;
    await saveDbCombined(dbState);
    return res.json({ success: true, db: dbState });
  }
  res.json({ success: false, message: "Database already initialized", db: dbState });
});

// 3. API route to write/update database sequences
app.post("/api/db/update", async (req, res) => {
  const dbState = await loadDbCombined();
  const { users, customers, invoices, transactions } = req.body;
  
  if (users) dbState.users = users;
  if (customers) dbState.customers = customers;
  if (invoices) dbState.invoices = invoices;
  if (transactions) dbState.transactions = transactions;
  
  dbState.initialized = true;
  dbState.version = (dbState.version || 0) + 1;
  await saveDbCombined(dbState);
  
  res.json({ success: true, version: dbState.version });
});

// 4. API route to download all project files as a ZIP file
app.get("/api/download-zip", (req, res) => {
  try {
    const zip = new AdmZip();
    const workingDir = process.cwd();
    
    const items = fs.readdirSync(workingDir);
    const excludeDirs = ["node_modules", "dist", ".git", ".next", ".cache"];
    
    for (const item of items) {
      const fullPath = path.join(workingDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(item)) {
          zip.addLocalFolder(fullPath, item);
        }
      } else {
        zip.addLocalFile(fullPath);
      }
    }
    
    const zipBuffer = zip.toBuffer();
    
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="tiva-network-project.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("Error creating project ZIP:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to generate ZIP file" });
  }
});

// Vite middleware development / production asset hosting
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA catch-all (Express v4 format)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
