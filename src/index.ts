import dotenv from 'dotenv';
import path from 'path';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from '@koa/bodyparser';
import applicationsRouter from './router/applications';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
// Load .env.test if NODE_ENV is test, otherwise load .env
if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
} else {
  dotenv.config();
}

const app = new Koa();
const router = new Router();

// Add error handling middleware first (to catch errors from all routes)
app.use(errorHandler);

// Add body parser middleware
// Include DELETE in parsedMethods so DELETE requests with JSON bodies are parsed
app.use(
  bodyParser({
    parsedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// Basic health check route
router.get('/', async (ctx) => {
  ctx.body = { message: 'Hugo Backend API' };
});

// Use applications router
app.use(router.routes());
app.use(router.allowedMethods());
app.use(applicationsRouter.routes());
app.use(applicationsRouter.allowedMethods());

// Get PORT from .env file (loaded via dotenv.config() above), default to 3000
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
