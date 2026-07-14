import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuQueryParams,
} from '@models/dto';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SimpleRole {
    id: number;
    name: string;
    title: string;
    description?: string;
    ordering?: number;
}

export type PickRole = Pick<SimpleRole, 'id' | 'name' | 'title' | 'description'>;

@Injectable({
    providedIn: 'any',
})
export class RoleService extends IctuBaseServiceClass<SimpleRole> {
    constructor() {
        super('roles');
    }

    load(
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<PickRole[]> {
        const queryParams: IctuQueryParams = {
            limit: 100,
            paged: 1,
            order: 'ASC',
            orderby: 'ordering',
            select: 'id,name,title,description',
            ..._queryParams,
        };
        return this.query([], queryParams).pipe(
            map(
                (response: DtoObject<SimpleRole[]>): PickRole[] =>
                    (response.data || []).map((r) => ({
                        id: r.id,
                        name: r.name,
                        title: r.title,
                        description: r.description,
                    })),
            ),
        );
    }


    
}
