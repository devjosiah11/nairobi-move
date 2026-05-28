import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const distPath = path.join(__dirname, '../dist');

app.use(express.static(distPath));

// SPA fallback — all routes serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT ?? 3005;
app.listen(PORT, () => {
  console.log(`🌍 NairobiMove landing page serving on :${PORT}`);
});
