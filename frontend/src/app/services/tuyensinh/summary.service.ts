import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ENVIRONMENT } from '@env';
import { Observable } from 'rxjs';
import { ExternalApiResponse } from '@models/external-api';
import { DtoObject } from '@app/models/dto';

@Injectable({
    providedIn: 'root',
})
export class SummaryService {
    private readonly http = inject(HttpClient);

    private readonly api: string = `${ENVIRONMENT.deployment.api}summary/`;

    // getYear(year?: number): Observable<ExternalApiResponse<unknown[]>> {
    //     return this.http.get<ExternalApiResponse<unknown[]>>(
    //         `${this.api}get-year`,
    //         { params: this.buildParams(year) },
    //     );
    // }

    getDashboard(year?: number): Observable<ExternalApiResponse<any>> {

        let params = new HttpParams();
        if (year) {
            params = params.set('year', year);
        }
      

        return this.http.get<ExternalApiResponse<any>>(
            `${this.api}dashboard`,
            { params: params },
        );
    }
    public getYear(): Observable<any> {
        return this.http.get<DtoObject<any>>(''.concat(this.api, 'get-year'), {});
    }
}