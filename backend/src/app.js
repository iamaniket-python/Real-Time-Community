import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

app.set('trust proxy', 1);          
app.disable('x-powered-by');
app.use(helmet());                 
app.use(cors({ origin: env.CLIENT_URL, credentials: true })); 
app.use(compression());
app.use(express.json({ limit: '100kb' })); 
app.use(cookieParser());

app.use('/api', routes);

app.use(notFoundHandler);           
app.use(errorHandler);             

export default app;