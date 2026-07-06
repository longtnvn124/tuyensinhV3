import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { HocSinh } from '@models/hoc-sinh';

export interface HocSinhSearchInfo {
	search : string;
}

@Injectable( {
	providedIn : 'any'
} )
export class HocSinhService extends IctuBaseServiceClass<HocSinh> {
    constructor() {
        super('hocsinh');
    }
    load(
        info: HocSinhSearchInfo,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<HocSinh[]>> {
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
                orderby: 'full_name',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'full_name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                {
                    conditionName: 'code',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                }
            );
        }
        return this.query(conditions, queryParams);
    }

    loadAddHS(
        info: HocSinhSearchInfo,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<HocSinh[]>> {
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
                orderby: 'full_name',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'status',
            value: `${0}`,
            condition: IctuQueryCondition.equal,
        });
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'full_name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                },
                {
                    conditionName: 'code',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                }
            );
        }
        return this.query(conditions, queryParams);
    }
}
