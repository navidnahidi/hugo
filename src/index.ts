import dotenv from 'dotenv';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from '@koa/bodyparser';
import applicationsRouter from './router/applications';

dotenv.config();

const app = new Koa();
const router = new Router();

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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
