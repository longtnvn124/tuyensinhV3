import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Observable } from 'rxjs';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { ClassesAssignment } from '@app/models/classes-assignment';
import { HttpParams } from '@angular/common/http';

export interface ClassesAssignmentServiceSearch {
    type: string;
}

@Injectable({
    providedIn: 'any',
})
export class ClassesAssignmentService extends IctuBaseServiceClass<ClassesAssignment> {
    constructor() {
        super('classes-assignments');
    }
    load(
        class_session_id: number,
        donvi_id: number,
        class_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<ClassesAssignment[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
                with: 'course_lesson_test',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push(
            {
                conditionName: 'class_session_id',
                value: class_session_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
            {
                conditionName: 'class_id',
                value: class_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            }
        );

        return this.query(conditions, queryParams);
    }
    public getOne(
        id: string,
        queryParams?: IctuQueryParams
    ): Observable<DtoObject<ClassesAssignment>> {

        const params = new HttpParams({ fromObject: queryParams || {} });

        const route = `${this.api}${id}`;

        return this.http.get<DtoObject<ClassesAssignment>>(route, { params });
    }

}
