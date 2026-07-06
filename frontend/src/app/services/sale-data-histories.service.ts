import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { SaleDataHistories } from '../models/sale-data-histories';

export interface SaleDataHistoriesInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class SaleDataHistoriesService extends IctuBaseServiceClass<SaleDataHistories> {
    constructor() {
        super('sales-data-histories');
    }
    load(
        info: SaleDataHistoriesInfo,
        donvi_id: number,
        sales_data_id: number,
        status: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<SaleDataHistories[]>> {
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
            conditionName: 'sales_data_id',
            value: sales_data_id.toString(),
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
