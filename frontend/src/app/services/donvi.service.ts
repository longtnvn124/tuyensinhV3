import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { Grammar } from '@app/models/grammar';

export interface DonVi {
    id: number;
    title: string;
    parent_id: number; //Đơn vị cấp trên ID
    description: string;
    status: number; //1 Active; 0: inactive
    code?: string;
}


@Injectable({
    providedIn: 'any',
})
export class DonviService extends IctuBaseServiceClass<DonVi> {
    constructor() {
        super('donvi');
    }

   
}
