import Router from '@koa/router';
import {
  createApplication,
  getApplication,
  updateApplication,
  deleteApplicationData,
  submitApplication,
} from '../controllers/applications';

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
    ctx.status = 200;
    ctx.body = result;
  }
});

// GET /applications/:id - Get application by ID
applicationsRouter.get('/:id', async (ctx) => {
  const result = await getApplication(ctx.params.id);

  if ('error' in result) {
    ctx.status = result.error === 'Not found' ? 404 : 500;
    ctx.body = result;
  } else {
    ctx.status = 200;
    ctx.body = result;
  }
});

// PATCH /applications/:id - Update application
applicationsRouter.patch('/:id', async (ctx) => {
  const result = await updateApplication(ctx.params.id, ctx.request.body);

  if ('error' in result) {
    if (result.error === 'Not found') {
      ctx.status = 404;
    } else if (result.error === 'Forbidden') {
      ctx.status = 403;
    } else if (result.error === 'Validation error') {
      ctx.status = 400;
    } else {
      ctx.status = 500;
    }
    ctx.body = result;
  } else {
    ctx.status = 200;
    ctx.body = result;
  }
});

// DELETE /applications/:id/data - Remove data from application
applicationsRouter.delete('/:id/data', async (ctx) => {
  const path = (ctx.request.body as { path?: string })?.path;

  if (!path) {
    ctx.status = 400;
    ctx.body = {
      error: 'Validation error',
      details: [
        {
          code: 'custom',
          path: ['path'],
          message: 'Path is required in request body',
        },
      ],
    };
    return;
  }

  const result = await deleteApplicationData(ctx.params.id, path);

  if ('error' in result) {
    if (result.error === 'Not found') {
      ctx.status = 404;
    } else if (result.error === 'Forbidden') {
      ctx.status = 403;
    } else if (result.error === 'Validation error') {
      ctx.status = 400;
    } else {
      ctx.status = 500;
    }
    ctx.body = result;
  } else {
    ctx.status = 200;
    ctx.body = result;
  }
});

// POST /applications/:id/submit - Submit application
applicationsRouter.post('/:id/submit', async (ctx) => {
  const result = await submitApplication(ctx.params.id);

  if ('error' in result) {
    if (result.error === 'Not found') {
      ctx.status = 404;
    } else if (result.error === 'Forbidden') {
      ctx.status = 403;
    } else if (result.error === 'Validation error') {
      ctx.status = 400;
    } else {
      ctx.status = 500;
    }
    ctx.body = result;
  } else {
    ctx.status = 200;
    ctx.body = result;
  }
});

export default applicationsRouter;
