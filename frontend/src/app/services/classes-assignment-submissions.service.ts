import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Observable } from 'rxjs';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { ClassesAssignmentSubmission } from '@app/models/classes-assignment-submissions';


@Injectable({
    providedIn: 'any',
})
export class ClassesAssignmentSubmissionService extends IctuBaseServiceClass<ClassesAssignmentSubmission> {
    constructor() {
        super('classes-assignment-submissions');
    }
    load(
        classes_assignments_id: number,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<ClassesAssignmentSubmission[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
                with: 'student'
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push(
            {
                conditionName: 'classes_assignments_id',
                value: classes_assignments_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
        );

        return this.query(conditions, queryParams);
    }
}
