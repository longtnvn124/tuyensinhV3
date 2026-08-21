import { HttpClient, HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import {
    deleteToken,
    refreshTokenSetter,
    tokenGetter,
    tokenSetter,
} from '@app/app.config';
import { httpInterceptor } from '@app/interceptor/interceptor';
import { publicHttpContext } from '@app/interceptor/public-http-request';
import {
    APP_SIGNING_DATE,
    httpSignatureGenerator,
    ICTU_HTTP_HEADER_PARAM_HANDLER,
    ICTU_HTTP_SIGNATURE_GENERATOR,
    IctuHttpHeaderParamHandler,
} from '@app/providers/httpSignatureGenerator.provider';
import { ENVIRONMENT } from '@env';
import { NotificationService } from '@services/notification.service';
import { RefreshTokenService } from '@services/refresh-token.service';

const FORBIDDEN_ERROR = {
    code: 'forbidden',
    message: 'forbidden',
};

describe('public HTTP requests', () => {
    let http: HttpClient;
    let httpTesting: HttpTestingController;
    let router: jasmine.SpyObj<Router>;
    let refreshTokenService: jasmine.SpyObj<RefreshTokenService>;

    beforeEach(() => {
        router = jasmine.createSpyObj<Router>('Router', ['isActive', 'navigate']);
        router.isActive.and.returnValue(false);
        refreshTokenService = jasmine.createSpyObj<RefreshTokenService>('RefreshTokenService', [
            'refreshToken',
        ]);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([httpInterceptor])),
                provideHttpClientTesting(),
                {
                    provide: NotificationService,
                    useValue: jasmine.createSpyObj<NotificationService>('NotificationService', [
                        'toastError',
                        'toastInfo',
                    ]),
                },
                { provide: RefreshTokenService, useValue: refreshTokenService },
                { provide: Router, useValue: router },
                {
                    provide: ICTU_HTTP_SIGNATURE_GENERATOR,
                    useValue: (request: HttpRequest<unknown>): HttpRequest<unknown> => request,
                },
                { provide: ICTU_HTTP_HEADER_PARAM_HANDLER, useValue: IctuHttpHeaderParamHandler },
                { provide: APP_SIGNING_DATE, useValue: 'YYYY-MM-DD HH:mm:00' },
            ],
        });

        http = TestBed.inject(HttpClient);
        httpTesting = TestBed.inject(HttpTestingController);
        deleteToken();
    });

    afterEach(() => {
        httpTesting.verify();
        deleteToken();
        localStorage.removeItem('remember_me');
    });

    it('does not refresh, clear the session, or navigate when a public request returns 401', () => {
        tokenSetter('stale-token');
        refreshTokenSetter('stale-refresh-token');
        localStorage.setItem('remember_me', 'true');

        http.get('/public-data', { context: publicHttpContext() }).subscribe({ error: () => undefined });
        httpTesting.expectOne('/public-data').flush(
            { code: 'unauthorized', message: 'jwt expired' },
            { status: 401, statusText: 'Unauthorized' }
        );

        expect(refreshTokenService.refreshToken).not.toHaveBeenCalled();
        expect(tokenGetter()).toBe('stale-token');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('does not clear the session or navigate when a public request returns 403', () => {
        tokenSetter('stale-token');

        http.get('/public-data', { context: publicHttpContext() }).subscribe({ error: () => undefined });
        httpTesting.expectOne('/public-data').flush(FORBIDDEN_ERROR, {
            status: 403,
            statusText: 'Forbidden',
        });

        expect(tokenGetter()).toBe('stale-token');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('preserves the existing redirect behavior for protected requests', () => {
        tokenSetter('stale-token');

        http.get('/protected-data').subscribe({ error: () => undefined });
        httpTesting.expectOne('/protected-data').flush(FORBIDDEN_ERROR, {
            status: 403,
            statusText: 'Forbidden',
        });

        expect(tokenGetter()).toBeNull();
        expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('omits the bearer token while retaining signed app headers for public requests', () => {
        tokenSetter('stale-token');
        const request = new HttpRequest(
            'GET',
            `${ENVIRONMENT.deployment.api}regions`,
            { context: publicHttpContext() }
        ).clone({ setHeaders: { Authorization: 'Bearer manually-supplied-token' } });

        const signedRequest = TestBed.runInInjectionContext(() => httpSignatureGenerator(request));

        expect(signedRequest.headers.has('Authorization')).toBeFalse();
        expect(signedRequest.headers.get('X-APP-ID')).toBe(ENVIRONMENT.deployment.X_APP_ID);
        expect(signedRequest.headers.has('x-request-signature')).toBeTrue();
    });
});
