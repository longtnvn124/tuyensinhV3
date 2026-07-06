import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { Pricing, PricingType } from '@app/models/pricing';

export interface PricingSearchInfo {
    type: PricingType;
}

@Injectable({
    providedIn: 'any'
})


export class PricingService extends IctuBaseServiceClass<Pricing> {
    constructor() {
        super('pricing');
    }
    load(
        search_info: PricingSearchInfo,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<Pricing[]>> {
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

        const conditions: IctuConditionParam[] = [];
        if (search_info.type) {
            conditions.push({
                conditionName: 'type',
                condition: IctuQueryCondition.equal,
                value: search_info.type.toString()
            })
        }
        return this.query(conditions, queryParams);
    }
}
