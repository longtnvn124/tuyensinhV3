import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { Grammar } from '@app/models/grammar';

@Injectable({
    providedIn: 'any',
})
export class GrammarService extends IctuBaseServiceClass<Grammar> {
    constructor() {
        super('grammars');
    }

    load(
        ids: string,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<Grammar[]>> {
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

    findGrammar(
        prompt: string,
        donvi_id: number,
        _queryParams?: Partial<IctuQueryParams>
    ): Observable<DtoObject<Grammar[]>> {
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
            conditionName: 'prompt',
            value: `%${prompt}%`,
            condition: IctuQueryCondition.like,
        });

        return this.query(conditions, queryParams);
    }
}
