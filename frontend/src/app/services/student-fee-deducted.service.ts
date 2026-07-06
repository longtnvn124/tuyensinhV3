import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { StudentFeeDeducted } from '@app/models/student-fee-deducted';

@Injectable({
    providedIn: 'any'
})
export class StudentFeeDeductedService extends IctuBaseServiceClass<StudentFeeDeducted> {
    constructor() {
        super('student-fee-deducted');
    }
    load(
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<StudentFeeDeducted[]>> {
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
