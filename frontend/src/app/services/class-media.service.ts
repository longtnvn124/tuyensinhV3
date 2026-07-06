import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from "@models/ictu-base-service.class";
import { Observable } from "rxjs";
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from "@models/dto";
import { ClassMedia, ClassMediaType } from '@app/models/class-media';

@Injectable({
    providedIn: 'any'
})
export class ClassMediaService extends IctuBaseServiceClass<ClassMedia> {

    constructor() {
        super('class-medias');
    }
    load(
        class_session_id: number,
        donvi_id: number,
        type: ClassMediaType,
        student_ids: number[],
        _queryParams?: Partial<IctuQueryParams>,
        user_id?: number
    ): Observable<DtoObject<ClassMedia[]>> {
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
        // if (user_id) {
        //     conditions.push({
        //         conditionName: 'created_by',
        //         value: user_id.toString(),
        //         condition: IctuQueryCondition.equal,
        //         orWhere: 'and',
        //     });
        // }

        return this.query(conditions, queryParams);
    }
}
