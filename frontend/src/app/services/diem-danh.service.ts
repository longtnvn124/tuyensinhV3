import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { DiemDanh } from '@models/diem-danh';
@Injectable({
    providedIn: 'any',
})
export class DiemDanhService extends IctuBaseServiceClass<DiemDanh> {
    constructor() {
        super('diem-danh');
    }

    load(
        class_session_id: number,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<DiemDanh[]>> {
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

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'class_session_id',
            value: class_session_id.toString(),
            condition: IctuQueryCondition.equal,
        });

        return this.query(conditions, queryParams);
    }

    loadAttendanceStudent(
        student_id: number,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<DiemDanh[]>> {
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

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'hocsinh_id',
            value: student_id.toString(),
            condition: IctuQueryCondition.equal,
        });

        return this.query(conditions, queryParams);
    }
}
