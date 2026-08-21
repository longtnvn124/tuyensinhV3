import { HttpContext, HttpContextToken } from '@angular/common/http';

export const PUBLIC_HTTP_REQUEST = new HttpContextToken<boolean>(() => false);

export const publicHttpContext = (): HttpContext =>
    new HttpContext().set(PUBLIC_HTTP_REQUEST, true);
