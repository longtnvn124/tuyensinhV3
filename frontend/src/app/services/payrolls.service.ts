import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { Payrolls } from '@app/models/payroll';

@Injectable({
    providedIn: 'any'
})


export class PayrollsService extends IctuBaseServiceClass<Payrolls> {
    constructor() {
        super('payrolls');
    }
    load(
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<Payrolls[]>> {
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
        return this.query(conditions, queryParams);
    }
}
