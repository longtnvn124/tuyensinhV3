import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { Nganhhoc } from '@app/models/tuyensinh/nganhhoc';

export interface NganhhocSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class NganhhocService extends IctuBaseServiceClass<Nganhhoc> {
    constructor() {
        super('nganh-hoc');
    }

    /* ========== Danh sách + tìm kiếm ========== */

    load(
        info: NganhhocSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<Nganhhoc[]>> {
        const queryParams: IctuQueryParams = {
            limit: 20,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ..._queryParams,
        };

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                {
                    conditionName: 'code',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
            );
        }
        return this.query(conditions, queryParams);
    }

}
