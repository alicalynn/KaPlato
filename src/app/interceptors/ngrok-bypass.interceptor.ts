import { HttpInterceptorFn } from '@angular/common/http';

/**
 * No longer needed - removed ngrok tunnel dependency
 * Now using localhost:8000 instead
 */
export const ngrokBypassInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
