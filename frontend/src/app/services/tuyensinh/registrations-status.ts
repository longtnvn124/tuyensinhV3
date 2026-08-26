
import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { TuyensinhStatus } from '@app/models/tuyensinh/tuyensinh-status';


@Injectable({
    providedIn: 'any',
})
export class RegistrationsStatusService extends IctuBaseServiceClass<TuyensinhStatus> {
	
    constructor() {
        super('registration-status');
    }

    
}
