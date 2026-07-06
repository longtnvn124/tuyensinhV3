import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { StudentFee } from '@app/models/student-fee';

export interface StudentFeeSearchInfo {
    course_id: number;
    student_id: number;
}

@Injectable({
    providedIn: 'any'
})
export class StudentFeeService extends IctuBaseServiceClass<StudentFee> {
    constructor() {
        super('student-fee');
    }
    load(
        info: StudentFeeSearchInfo,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<StudentFee[]>> {
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
        if (info.course_id) {
            conditions.push(
                {
                    conditionName: 'course_id',
                    value: info.course_id.toString(),
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                },
            );
        }
        if (info.student_id) {
            conditions.push(
                {
                    conditionName: 'student_id',
                    value: info.student_id.toString(),
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                },
            );
        }
        return this.query(conditions, queryParams);
    }
}
