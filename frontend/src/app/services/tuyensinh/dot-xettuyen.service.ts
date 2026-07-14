import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';

export interface DotXettuyenSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class DotXettuyenService extends IctuBaseServiceClass<DotXettuyen> {
    constructor() {
        super('dot-xettuyen');
    }

    load(
        info: DotXettuyenSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<DotXettuyen[]>> {
        const queryParams: IctuQueryParams = {
            limit: 20,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ..._queryParams,
        };

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push({
                conditionName: 'name',
                value: `%${info.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
        }
        return this.query(conditions, queryParams);
    }
}
