import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { TuyensinhStatus } from '@app/models/tuyensinh/tuyensinh-status';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'any',
})
export class TuyensinhStatusService extends IctuBaseServiceClass<TuyensinhStatus> {
    constructor() {
        super('hoso-tuyensinh-status');
    }

    addTuyensinh(data: Partial<TuyensinhStatus>): Observable<number> {
        return this.create(data);
    }
}
