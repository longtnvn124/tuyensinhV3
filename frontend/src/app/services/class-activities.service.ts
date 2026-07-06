import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { ClassActivity, ClassActivityType } from '@app/models/class-activities';
@Injectable({
    providedIn: 'any',
})
export class ClassActivitiesService extends IctuBaseServiceClass<ClassActivity> {
    constructor() {
        super('class-activities');
    }

    load(
        class_session_id: number,
        donvi_id: number,
        type: ClassActivityType,
        student_ids: number[],
        _queryParams?: Partial<IctuQueryParams>,
        user_id?: number
    ): Observable<DtoObject<ClassActivity[]>> {
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
                with: 'assistants,students',
            },
            _queryParams
        );
        if (student_ids.length != 0) {
            queryParams['student_ids'] = student_ids;
        }

        const conditions: IctuConditionParam[] = [];
        conditions.push(
            {
                conditionName: 'class_session_id',
                value: class_session_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'type',
                value: type.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            }
        );
        if (user_id) {
            conditions.push({
                conditionName: 'created_by',
                value: user_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            });
        }

        return this.query(conditions, queryParams);
    }
}
