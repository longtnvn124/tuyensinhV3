import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { ChuongtrinhDaotao } from '@app/models/tuyensinh/chuongtrinh-daotao';

export interface ChuongtrinhDaotaoSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class ChuongtrinhDaotaoService extends IctuBaseServiceClass<ChuongtrinhDaotao> {
    constructor() {
        super('chuongtrinh-daotao');
    }

    load(
        info: ChuongtrinhDaotaoSearchInfo,
        major_id?: number,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<ChuongtrinhDaotao[]>> {
        const queryParams: IctuQueryParams = {
            limit: 20,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ..._queryParams,
        };

        const conditions: IctuConditionParam[] = [];
        if (major_id) {
            conditions.push({
                conditionName: 'major_id',
                value: `${major_id}`,
                condition: IctuQueryCondition.equal,
            });
        }
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
