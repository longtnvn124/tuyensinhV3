import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';

import { HocSinhLopHoc } from '../models/hoc-sinh-lop-hoc';
@Injectable({
    providedIn: 'any',
})
export class HocSinhLopHocBoTroService extends IctuBaseServiceClass<HocSinhLopHoc> {
    constructor() {
        super('hocsinh-lophocbotro');
    }

    load(
        class_id: number,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<HocSinhLopHoc[]>> {
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
                with: 'hocsinh',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'class_id',
            value: `${class_id}`,
            condition: IctuQueryCondition.equal,
        });

        return this.query(conditions, queryParams);
    }
}
