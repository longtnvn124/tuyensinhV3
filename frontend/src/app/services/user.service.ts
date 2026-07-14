import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '@models/user';
import { getApiRouteLink } from '@env';

export interface DoiTacSearchInfo {
    search: string;
    role_id?: number;
}

export type UserUpdatableFields = Pick<
    User,
    'display_name' | 'phone' | 'email' | 'password'
>;

@Injectable({
    providedIn: 'any',
})
export class UserService extends IctuBaseServiceClass<User> {
    private readonly apiProfile: string = getApiRouteLink('profile');

    constructor() {
        super('users');
    }

    load(
        info: DoiTacSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<User[]>> {
        const queryParams: IctuQueryParams = {
            limit: 20,
            paged: 1,
            order: 'DESC',
            orderby: 'id',
            ..._queryParams,
        
        };

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push({
                conditionName: 'username',
                value: `%${info.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
            conditions.push({
                conditionName: 'display_name',
                value: `%${info.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
            conditions.push({
                conditionName: 'email',
                value: `%${info.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
        }
        if (info.role_id) {
            conditions.push({
                conditionName: 'role_id',
                value: info.role_id.toString(),
                condition: IctuQueryCondition.equal,
            });
        }

        return this.query(conditions, queryParams);
    }

    updateProfile(
        info: Partial<UserUpdatableFields>,
    ): Observable<number> {
        return this.http
            .put<DtoObject<number>>(this.apiProfile, info)
            .pipe(
                map(
                    (response: DtoObject<number>): number => response.data,
                ),
            );
    }

}
