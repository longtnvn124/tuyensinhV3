import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { Class } from '@models/class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@app/models/dto';
import { map, Observable } from 'rxjs';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';

export interface classesSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class ClassesService extends IctuBaseServiceClass<Class> {
    constructor() {
        super('classes');
    }

    load(
        info: classesSearchInfo,
        donvi_id: number,
        teacher_id: number,
        parent_id: number,
        position: string,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<Class[]>> {
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
                orderby: 'created_at',
                with: 'course,csdt',
            },
            _queryParams
        );

        if (position == 'teacher') {
            queryParams['teacher_ids'] = teacher_id;
        } else if (position == 'TA') {
            queryParams['assistant_ids'] = teacher_id;
        }

        const searchConditions: IctuConditionParam[] = [
            {
                conditionName: 'parent_id',
                value: parent_id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and',
            },
        ];

        if (info.search) {
            searchConditions.push({
                conditionName: 'name',
                value: `%${info.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'and',
            });
        }

        const conditions: IctuConditionParam[] = [];
        return this.query(conditions, queryParams);
    }

    loadOptions(donvi_id: number, position: string, user_id: number, _queryParams?: Partial<IctuQueryParams>): Observable<IctuDropdownOption<number>[]> {
        const queryParams: IctuQueryParams = Object.assign<IctuQueryParams, IctuQueryParams>({
            limit: -1,
            paged: 1,
            include: donvi_id,
            include_by: 'donvi_id',
            order: 'ASC',
            orderby: 'name',
            select: 'id,name'
        }, _queryParams);
        if (position == 'teacher') {
            queryParams['teacher_ids'] = user_id;
        } else if (position == 'TA') {
            queryParams['assistant_ids'] = user_id;
        }
        return this.query([], queryParams).pipe(map(({ data }: DtoObject<Class[]>): IctuDropdownOption<number>[] => data.map((result: Class): IctuDropdownOption<number> => ({
            value: result.id,
            label: result.name
        }))))
    }
}
