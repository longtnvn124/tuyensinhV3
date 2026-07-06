import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Observable } from 'rxjs';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { CourseLessonTest } from '@app/models/course-lesson-test';

export interface CourseLessonTestServiceSearch {
    type: string;
    required: number;
}

@Injectable({
    providedIn: 'any',
})
export class CourseLessonTestService extends IctuBaseServiceClass<CourseLessonTest> {
    constructor() {
        super('course-lesson-tests');
    }
    load(
        course_lesson_id: number,
        donvi_id: number,
        search: CourseLessonTestServiceSearch,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<CourseLessonTest[]>> {
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

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'course_lesson_id',
            value: course_lesson_id.toString(),
            condition: IctuQueryCondition.equal,
            orWhere: 'and',
        });
        if (search.type && search.type != '') {
            conditions.push({
                conditionName: 'type',
                value: search.type,
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            });
        }
        if (search.required != -1) {
            conditions.push({
                conditionName: 'required',
                value: search.required.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            });
        }
        return this.query(conditions, queryParams);
    }
}
