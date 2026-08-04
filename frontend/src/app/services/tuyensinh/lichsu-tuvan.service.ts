import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { LichsuTuvan } from '@app/models/tuyensinh/lichsu-tuvan';

@Injectable({ providedIn: 'any' })
export class LichsuTuvanService extends IctuBaseServiceClass<LichsuTuvan> {
    constructor() {
        super('lichsu-tuvan');
    }
}
