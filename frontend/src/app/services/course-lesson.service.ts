import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { CourseLesson, ScormResponse } from '@models/course-lesson';
import { ENVIRONMENT } from '@env';

export interface CourseLessonSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class CoursesLessonService extends IctuBaseServiceClass<CourseLesson> {
    constructor() {
        super('lessons');
    }

    load(
        info: CourseLessonSearchInfo,
        donvi_id: number,
        course_id: number,
        parent_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<CourseLesson[]>> {
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
                orderby: 'ordering',
            },
            _queryParams
        );
        const conditions: IctuConditionParam[] = [];

        conditions.push(
            {
                conditionName: 'course_id',
                value: course_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
        );

        if (parent_id != -1) {
            conditions.push(
                {
                    conditionName: 'parent_id',
                    value: parent_id.toString(),
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                }
            );
        }

        if (info.search) {
            conditions.push(
                {
                    conditionName: 'title',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                },
                {
                    conditionName: 'desc',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                }
            );
        }

        return this.query(conditions, queryParams);
    }

    loadLesson(
        donvi_id: number,
        course_id: number,
        parent_id: string,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<CourseLesson[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: parent_id,
                include_by: 'parent_id',
                order: 'ASC',
                orderby: 'ordering',
            },
            _queryParams
        );
        const conditions: IctuConditionParam[] = [];
        conditions.push(
            {
                conditionName: 'course_id',
                value: course_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'donvi_id',
                value: donvi_id.toString(),
                condition: IctuQueryCondition.equal,
            }
        );

        return this.query(conditions, queryParams);
    }

    loadMaxOdering(
        donvi_id: number,
        course_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<CourseLesson[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
                order: 'DESC',
                orderby: 'ordering',
                select: 'ordering',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push(
            {
                conditionName: 'course_id',
                value: course_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'parent_id',
                value: '0',
                condition: IctuQueryCondition.equal,
            }
        );
        return this.query(conditions, queryParams);
    }

    public unzipScorm(idLessonPlan: number, isUnzip: boolean): Observable<string> {

        let api = ''.concat(
            ENVIRONMENT.deployment.api,
            'lessons',
            '/scorm/',
            idLessonPlan.toString()
        );

        if (isUnzip) {
            api += '?force=1';
        }

        return this.http.post<ScormResponse>(api, {}).pipe(
            map(res => res.data)
        );
    }

}
