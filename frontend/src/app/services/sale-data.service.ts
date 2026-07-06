import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { SaleData } from '../models/sale-data';

export interface SaleDataSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class SaleDataService extends IctuBaseServiceClass<SaleData> {
    constructor() {
        super('sales-data');
    }
    load(
        info: SaleDataSearchInfo,
        donvi_id: number,
        user_id: number,
        status: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<SaleData[]>> {
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

        const searchConditions: IctuConditionParam[] = [];
        searchConditions.push({
            conditionName: 'user_id',
            value: user_id.toString(),
            condition: IctuQueryCondition.equal,
            orWhere: 'and',
        });
        if (status) {
            searchConditions.push({
                conditionName: 'status',
                value: status.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            });
        }

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
                    conditionName: 'child_name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                }
            );
        }
        return this.query(searchConditions, queryParams);
    }
}
