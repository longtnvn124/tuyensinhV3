import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { IctuDropdownOption } from '../models/ictu-dropdown-option';
import { LichHoc } from '../models/lichhoc';

export interface LichHocSearchInfo {
    search: string;
    date_start: string;
    date_end: string;
}

@Injectable({
    providedIn: 'any',
})
export class LichHocService extends IctuBaseServiceClass<LichHoc> {
    constructor() {
        super('calendar');
    }
    load(
        info: LichHocSearchInfo,
        donvi_id: number,
        giaovien_id: number,
        class_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<LichHoc[]>> {
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
                orderby: 'time_start',
                with: 'lophocfull,phonghoc,giaovien,trogiang',
            },
            _queryParams
        );

        const searchConditions: IctuConditionParam[] = [];

        if (info.date_start && info.date_end) {
            searchConditions.push(
                {
                    conditionName: 'time_start',
                    value: info.date_start.toString(),
                    condition: IctuQueryCondition.greaterThanToEqualsTo,
                    orWhere: 'and',
                },
                {
                    conditionName: 'time_start',
                    value: info.date_end.toString(),
                    condition: IctuQueryCondition.lessThanOrEqualsTo,
                    orWhere: 'and',
                }
            );
        }if (class_id != 0) {
            searchConditions.push(
                {
                    conditionName: 'class_id',
                    value: class_id.toString(),
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                }
            );
        }

        // if (info.search) {
        //     searchConditions.push({
        //         conditionName: 'name',
        //         value: `%${info.search}%`,
        //         condition: IctuQueryCondition.like,
        //         orWhere: 'and',
        //     });
        // }

        const conditions: IctuConditionParam[] = [];
        
        if (giaovien_id != 0) {
            conditions.push(
                {
                    conditionName: 'giaovien_id',
                    value: giaovien_id.toString(),
                    condition: IctuQueryCondition.equal,
                },
                ...searchConditions,
                {
                    conditionName: 'trogiang_id',
                    value: `%|${giaovien_id}|%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                ...searchConditions
            );
            
        } else {
            conditions.push(...searchConditions);
        }
        return this.query(conditions, queryParams);
    }
    loadYeucau(
        info: LichHocSearchInfo,
        donvi_id: number,
        giaovien_id: number,
        class_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<LichHoc[]>> {
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
                orderby: 'time_start',
                with: 'lophocfull,phonghoc,giaovien,trogiang',
            },
            _queryParams
        );

        const searchConditions: IctuConditionParam[] = [];

        if (info.date_start && info.date_end) {
            searchConditions.push(
                {
                    conditionName: 'time_start',
                    value: info.date_start.toString(),
                    condition: IctuQueryCondition.greaterThanToEqualsTo,
                    orWhere: 'and',
                },
                {
                    conditionName: 'time_start',
                    value: info.date_end.toString(),
                    condition: IctuQueryCondition.lessThanOrEqualsTo,
                    orWhere: 'and',
                },
                {
                    conditionName: 'status_reason',
                    value: '1',
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                }
            );
        }if (class_id != 0) {
            searchConditions.push(
                {
                    conditionName: 'class_id',
                    value: class_id.toString(),
                    condition: IctuQueryCondition.equal,
                    orWhere: 'and',
                }
            );
        }

        // if (info.search) {
        //     searchConditions.push({
        //         conditionName: 'name',
        //         value: `%${info.search}%`,
        //         condition: IctuQueryCondition.like,
        //         orWhere: 'and',
        //     });
        // }

        const conditions: IctuConditionParam[] = [];
        
        if (giaovien_id != 0) {
            conditions.push(
                {
                    conditionName: 'giaovien_id',
                    value: giaovien_id.toString(),
                    condition: IctuQueryCondition.equal,
                },
                ...searchConditions,
                {
                    conditionName: 'trogiang_id',
                    value: `%|${giaovien_id}|%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                ...searchConditions
            );
            
        } else {
            conditions.push(...searchConditions);
        }
        return this.query(conditions, queryParams);
    }

    loadOptions(
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<IctuDropdownOption<number>[]> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: -1,
                paged: 1,
                include: donvi_id,
                include_by: 'donvi_id',
                order: 'ASC',
            },
            _queryParams
        );
        return this.query([], queryParams).pipe(
            map(
                ({
                    data,
                }: DtoObject<LichHoc[]>): IctuDropdownOption<number>[] =>
                    data.map(
                        (csdt: LichHoc): IctuDropdownOption<number> => ({
                            value: csdt.id,
                            label: csdt.diadiem_phonghoc,
                        })
                    )
            )
        );
    }
}
