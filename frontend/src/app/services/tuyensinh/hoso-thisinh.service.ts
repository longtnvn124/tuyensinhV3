import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';

export interface HosoThisinhSearchInfo {
    search: string;
    status?: string;
    dot_dangky_id?: number;
    major_id?: number;
    nguoi_tuvan_id?: number;
}

export type HosoCheckCccdResult =
    | { found: false }
    | { found: true; record: HosoThisinh };

@Injectable({
    providedIn: 'any',
})
export class HosoThisinhService extends IctuBaseServiceClass<HosoThisinh> {
	getTuyensinhByPageNew(conditions: IctuConditionParam[]): Observable<DtoObject<HosoThisinh[]>> {
		return this.query(conditions, { limit: 1, paged: 1 });
	}
	updateTuyensinh(id: number, data: Partial<HosoThisinh>): Observable<any> {
		return this.update(id, data);
	}
	addTuyensinh(data: Partial<HosoThisinh>): Observable<number> {
		return this.create(data);
	}
    constructor() {
        super('hoso-tuyensinh');
    }

    load(
        info: HosoThisinhSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<HosoThisinh[]>> {
        const queryParams: IctuQueryParams = {
            limit: 20,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            ..._queryParams,
        };

        const conditions: IctuConditionParam[] = [];
        if (info.search) {
            conditions.push(
                {
                    conditionName: 'full_name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                {
                    conditionName: 'phone',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
            );
        }
        if (info.status) {
            conditions.push({
                conditionName: 'status',
                value: info.status,
                condition: IctuQueryCondition.equal,
            });
        }
        if (info.dot_dangky_id) {
            conditions.push({
                conditionName: 'dot_dangky_id',
                value: `${info.dot_dangky_id}`,
                condition: IctuQueryCondition.equal,
            });
        }
        if (info.major_id) {
            conditions.push({
                conditionName: 'major_id',
                value: `${info.major_id}`,
                condition: IctuQueryCondition.equal,
            });
        }
        if (info.nguoi_tuvan_id) {
            conditions.push({
                conditionName: 'nguoi_tuvan_id',
                value: `${info.nguoi_tuvan_id}`,
                condition: IctuQueryCondition.equal,
            });
        }
        return this.query(conditions, queryParams);
    }

    checkCccd(cccd: string): Observable<HosoCheckCccdResult> {
        const cleaned = (cccd || '').trim();
        if (!cleaned) {
            return of<HosoCheckCccdResult>({ found: false });
        }
        const queryParams: IctuQueryParams = {
            limit: 1,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
        };
        const conditions: IctuConditionParam[] = [
            {
                conditionName: 'cccd',
                value: cleaned,
                condition: IctuQueryCondition.equal,
            },
        ];
        return this.query(conditions, queryParams).pipe(
            map((res: DtoObject<HosoThisinh[]>): HosoCheckCccdResult => {
                const first: HosoThisinh | undefined =
                    Array.isArray(res?.data) && res.data.length ? res.data[0] : undefined;
                return first ? { found: true, record: first } : { found: false };
            }),
            catchError((): Observable<HosoCheckCccdResult> => of<HosoCheckCccdResult>({ found: false })),
        );
    }
}
