import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { Word } from '@app/models/word';

@Injectable({
    providedIn: 'any',
})
export class WordsService extends IctuBaseServiceClass<Word> {
    constructor() {
        super('words');
    }

    load(
        ids: string,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<Word[]>> {
        const queryParams: IctuQueryParams = Object.assign<
            IctuQueryParams,
            IctuQueryParams
        >(
            {
                limit: 20,
                paged: 1,
                include: ids,
                include_by: 'id',
            },
            _queryParams
        );

        const conditions: IctuConditionParam[] = [];
        conditions.push({
            conditionName: 'donvi_id',
            value: donvi_id.toString(),
            condition: IctuQueryCondition.equal,
        });

        return this.query(conditions, queryParams);
    }

    findWord(
        title: string,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<Word[]>> {
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
        conditions.push({
            conditionName: 'title',
            value: title.toString(),
            condition: IctuQueryCondition.equal,
        });

        return this.query(conditions, queryParams);
    }
}
