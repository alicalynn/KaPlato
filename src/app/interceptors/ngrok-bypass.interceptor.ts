import { HttpInterceptorFn } from '@angular/common/http';

export const ngrokBypassInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('.ngrok-free.dev')) {
    req = req.clone({
      setHeaders: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
  }

  return next(req);
};
