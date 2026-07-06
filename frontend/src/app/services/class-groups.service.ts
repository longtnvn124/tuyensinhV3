import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { ClassGroup } from '@app/models/class-group';
export interface ClassGroupSearchInfo {
    class_id: number;
    assistant_id: number;
}

@Injectable({
    providedIn: 'any',
})
export class ClassGroupService extends IctuBaseServiceClass<ClassGroup> {
    constructor() {
        super('class-groups');
    }

    load(
        info: ClassGroupSearchInfo,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<ClassGroup[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
                order: 'DESC',
                orderby: 'created_at',
                with: 'assistants',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'class_id',
            value: info.class_id.toString(),
            condition: IctuQueryCondition.equal,
        });
        if (info.assistant_id != 0) {
            queryParams['assistant_ids'] = info.assistant_id;
        }

        return this.query(conditions, queryParams);
    }
}
