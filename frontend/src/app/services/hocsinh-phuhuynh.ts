import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';

import { PhuHuynh } from '../models/phu-huynh';
import { HocSinhPhuHuynh } from '../models/hoc-sinh-phu-huynh';

export interface HocSinhPhuHuynhSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class HocSinhPhuHuynhService extends IctuBaseServiceClass<HocSinhPhuHuynh> {
    constructor() {
        super('phuhuynh');
    }
    load(
        info: HocSinhPhuHuynhSearchInfo,
        user_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<HocSinhPhuHuynh[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                order: 'ASC',
                orderby: 'hoten',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
         conditions.push(
                {
                    conditionName: 'parent_id',
                    value: user_id.toString(),
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                },
            );
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'hoten',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                {
                    conditionName: 'maso',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                }
            );
        }
        return this.query(conditions, queryParams);
    }
}
