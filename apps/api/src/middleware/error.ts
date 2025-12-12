import { Context } from 'hono';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class InsufficientBalanceError extends ApiError {
  constructor(available: number, required: number) {
    super(`Insufficient balance: available ${available}, required ${required}`, 400, {
      available,
      required,
    });
    this.name = 'InsufficientBalanceError';
  }
}

export class LimitExceededError extends ApiError {
  constructor(
    limitType: string,
    limit: number,
    requested: number,
    current?: number
  ) {
    super(`${limitType} limit exceeded`, 403, {
      limitType,
      limit,
      requested,
      current,
    });
    this.name = 'LimitExceededError';
  }
}

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    return c.json(
      {
        error: err.message,
        details: err.details,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 500
    );
  }

  // Supabase errors
  if ('code' in err && typeof (err as any).code === 'string') {
    const supabaseErr = err as any;
    if (supabaseErr.code === 'PGRST116') {
      return c.json({ error: 'Resource not found' }, 404);
    }
    if (supabaseErr.code === '23505') {
      return c.json({ error: 'Duplicate entry', details: supabaseErr.message }, 409);
    }
    if (supabaseErr.code === '23503') {
      return c.json({ error: 'Referenced resource not found', details: supabaseErr.message }, 400);
    }
  }

  // Generic error
  return c.json(
    {
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
    500
  );
}

