import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 8080;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files from /assets
app.use(express.static(path.join(__dirname, 'assets')));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});