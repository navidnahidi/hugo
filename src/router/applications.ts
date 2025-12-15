import Router from '@koa/router';
import {
  createApplication,
  getApplication,
  updateApplication,
  deleteApplicationData,
  submitApplication,
} from '../controllers/applications';
import { handleResult } from '../middleware/errorHandler';
import { ValidationError } from '../errors/application';

const applicationsRouter = new Router({
  prefix: '/applications',
});

// POST /applications - Initialize a new application
applicationsRouter.post('/', async (ctx) => {
  const result = await createApplication(ctx.request.body);
  handleResult(ctx, result);
});

// GET /applications/:id - Get application by ID
applicationsRouter.get('/:id', async (ctx) => {
  const result = await getApplication(ctx.params.id);
  handleResult(ctx, result);
});

// PATCH /applications/:id - Update application
applicationsRouter.patch('/:id', async (ctx) => {
  const result = await updateApplication(ctx.params.id, ctx.request.body);
  handleResult(ctx, result);
});

// DELETE /applications/:id/data - Remove data from application
applicationsRouter.delete('/:id/data', async (ctx) => {
  const path = (ctx.request.body as { path?: string })?.path;

  if (!path) {
    throw new ValidationError('Path is required in request body', [
      {
        code: 'custom',
        path: ['path'],
        message: 'Path is required in request body',
      },
    ]);
  }

  const result = await deleteApplicationData(ctx.params.id, path);
  handleResult(ctx, result);
});

// POST /applications/:id/submit - Submit application
applicationsRouter.post('/:id/submit', async (ctx) => {
  const result = await submitApplication(ctx.params.id);
  handleResult(ctx, result);
});

export default applicationsRouter;
