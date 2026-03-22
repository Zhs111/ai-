import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import gamesRoutes from './routes/games';
import profilesRoutes from './routes/profiles';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/profiles', profilesRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'AI Game Platform API is running'
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`
🚀 AI Game Platform Backend Server
   Local:   http://localhost:${PORT}
   Health:  http://localhost:${PORT}/api/health
  `);
});

export default app;
