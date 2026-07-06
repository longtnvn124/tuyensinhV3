import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { ClassSessionContent } from '../models/class-session-content';


@Injectable({
    providedIn: 'any',
})
export class ClassSessionContentService extends IctuBaseServiceClass<ClassSessionContent> {
    constructor() {
        super('class-session-content');
    }

    load(
        donvi_id:number,
        class_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<ClassSessionContent[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        return this.query(conditions, queryParams);
    }
    
}
