import Router from '@koa/router';
import { createApplication } from '../controllers/applications';

const applicationsRouter = new Router({
  prefix: '/applications',
});

// POST /applications - Initialize a new application
applicationsRouter.post('/', async (ctx) => {
  const result = await createApplication(ctx.request.body);

  if ('error' in result) {
    ctx.status = result.error === 'Validation error' ? 400 : 500;
    ctx.body = result;
  } else {
    ctx.status = 201;
    ctx.body = result;
  }
});

// GET /applications/:id - Get application by ID
applicationsRouter.get('/:id', async (ctx) => {
  ctx.status = 200;
  ctx.body = { message: `GET /applications/${ctx.params.id} - stub` };
});

// PATCH /applications/:id - Update application
applicationsRouter.patch('/:id', async (ctx) => {
  ctx.status = 200;
  ctx.body = { message: `PATCH /applications/${ctx.params.id} - stub` };
});

// DELETE /applications/:id/data - Remove data from application
applicationsRouter.delete('/:id/data', async (ctx) => {
  ctx.status = 200;
  ctx.body = { message: `DELETE /applications/${ctx.params.id}/data - stub` };
});

// POST /applications/:id/submit - Submit application
applicationsRouter.post('/:id/submit', async (ctx) => {
  ctx.status = 200;
  ctx.body = { message: `POST /applications/${ctx.params.id}/submit - stub` };
});

export default applicationsRouter;
