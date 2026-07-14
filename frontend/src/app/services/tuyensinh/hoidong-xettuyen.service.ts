import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable } from 'rxjs';
import { HoidongXettuyen } from '@app/models/tuyensinh/hoidong-xettuyen';
import { HoidongHosoThisinh } from '@app/models/tuyensinh/hoidong-hoso-thisinh';

export interface HoidongXettuyenSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class HoidongXettuyenService extends IctuBaseServiceClass<HoidongXettuyen> {
    constructor() {
        super('hoidong-xettuyen');
    }

    load(
        info: HoidongXettuyenSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<HoidongXettuyen[]>> {
        const queryParams: IctuQueryParams = {
            limit: 20,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ..._queryParams,
        };

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push({
                conditionName: 'name',
                value: `%${info.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
        }
        return this.query(conditions, queryParams);
    }

    getAssignedHoso(
        hoidongId: number,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<HoidongHosoThisinh[]>> {
        const queryParams: IctuQueryParams = {
            limit: 50,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ..._queryParams,
        };
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'hoidong_id',
                condition: IctuQueryCondition.equal,
                value: `${hoidongId}`,
            },
        ];
        return this.query(conditions, queryParams, 'hoso-thisinh') as unknown as Observable<DtoObject<HoidongHosoThisinh[]>>;
    }

    assignHoso(payload: { hoidong_id: number; registration_id: number }): Observable<any> {
        return this.create(payload as any);
    }

    removeAssignedHoso(registrationId: number): Observable<any> {
        return this.delete(registrationId);
    }

    updateKetQua(registrationId: number, payload: Partial<HoidongHosoThisinh>): Observable<any> {
        return this.update(registrationId, payload);
    }
}
