import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';


export interface Parents{
    id? :number,
    parent_id:number,
    user_id:number
} 

@Injectable({
    providedIn: 'any',
})
export class ParentsService extends IctuBaseServiceClass<Parents> {
    constructor() {
        super('parents');
    }


}
