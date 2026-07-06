import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';

import { LopHoc } from '../models/lop-hoc';

export interface LopHocBoTroSearchInfo {
    search: string;
    namhoc: number;
}

@Injectable({
    providedIn: 'any',
})
export class LopHocBoTroService extends IctuBaseServiceClass<LopHoc> {
    constructor() {
        super('lophoc-botro');
    }

    load(
        info:LopHocBoTroSearchInfo,
        donvi_id: number,
        parent_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<LopHoc[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
                order: 'ASC',
                orderby: 'name',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        if (info.namhoc) {
            conditions.push({
                conditionName: 'namhoc',
                value: `${info.namhoc}`,
                condition: IctuQueryCondition.equal,
                orWhere:'and'
            });
        }
        conditions.push({
            conditionName: 'parent_id',
            value: `${parent_id}`,
            condition: IctuQueryCondition.equal,
            orWhere:'and'
        });
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                }
            );
        }
        return this.query(conditions, queryParams);
    }
    
}
