import express from 'express';
import { ContextDatabase } from './db';
import { IngestionPipeline } from './ingest';

const app = express();
app.use(express.json());

const dbPath = process.env.DATABASE_PATH || ':memory:';
const db = new ContextDatabase(dbPath);
const ingestor = new IngestionPipeline(db);

app.post('/api/ingest', async (req, res) => {
  const { path: dirPath, harness } = req.body;
  if (!dirPath || !harness) {
    return res.status(400).json({ error: 'path and harness are required' });
  }

  try {
    await ingestor.ingestDirectory(dirPath, harness);
    res.json({ success: true, message: `Ingested ${harness} from ${dirPath}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/search', async (req, res) => {
  const { query, embedding, k = 60, limit = 10 } = req.body;
  
  if (!query || !embedding) {
    return res.status(400).json({ error: 'query and embedding (array of floats) are required' });
  }

  try {
    const float32Emb = new Float32Array(embedding);
    const results = await db.rrfFusionSearch(query, float32Emb, k, limit);
    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await db.init();
  console.log('Database initialized.');

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Local Context Backend running on port ${PORT}`);
  });
}

start().catch(console.error);
