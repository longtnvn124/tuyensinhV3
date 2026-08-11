import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { HoidongHosoThisinh } from '@models/tuyensinh/hoidong-hoso-thisinh';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'any',
})
export class HoidongHosoThisinhService extends IctuBaseServiceClass<HoidongHosoThisinh> {
    constructor() {
        super('hoidong-hoso-thisinh');
    }

    loadByHoidong(
        hoidongId: number,
        queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<HoidongHosoThisinh[]>> {
        return this.query(this.getHoidongConditions(hoidongId), {
            limit: 50,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ...queryParams,
        });
    }

    loadAllByHoidong(hoidongId: number): Observable<DtoObject<HoidongHosoThisinh[]>> {
        return this.query(this.getHoidongConditions(hoidongId), {
            limit: -1,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
        });
    }

    private getHoidongConditions(hoidongId: number): IctuConditionParam[] {
        return [{
            conditionName: 'hoidong_id',
            condition: IctuQueryCondition.equal,
            value: `${hoidongId}`,
        }];
    }
}
