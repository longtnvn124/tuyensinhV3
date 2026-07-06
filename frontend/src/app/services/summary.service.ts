import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'any'
})


export class SummaryService extends IctuBaseServiceClass<any> {
    constructor() {
        super('summary');
    }
    
    load(
        time_start: string,
        time_end: string,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<any[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: -1,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [
            { conditionName: 'time_start', condition: IctuQueryCondition.greaterThanToEqualsTo, value: time_start, orWhere: 'and' },
            { conditionName: 'time_end', condition: IctuQueryCondition.lessThanOrEqualsTo, value: time_end, orWhere: 'and' },];
        return this.query(conditions, queryParams);
    }
}
