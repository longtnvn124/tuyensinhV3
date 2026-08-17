import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HosoThisinh } from '@app/models/tuyensinh/hoso-thisinh';

export interface HosoThisinhSearchInfo {
    search: string;
    status?: string;
    dotxettuyen_id?: number;
    nganh_id?: number;
    nguoi_tuvan?: number;
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
                    conditionName: 'ho_va_ten',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                {
                    conditionName: 'dien_thoai',
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
        if (info.dotxettuyen_id) {
            conditions.push({
                conditionName: 'dotxettuyen_id',
                value: `${info.dotxettuyen_id}`,
                condition: IctuQueryCondition.equal,
            });
        }
        if (info.nganh_id) {
            conditions.push({
                conditionName: 'nganh_id',
                value: `${info.nganh_id}`,
                condition: IctuQueryCondition.equal,
            });
        }
        if (info.nguoi_tuvan) {
            conditions.push({
                conditionName: 'nguoi_tuvan',
                value: `${info.nguoi_tuvan}`,
                condition: IctuQueryCondition.equal,
            });
        }
        return this.query(conditions, queryParams);
    }

    checkCccd(cccd?: string, phone?: string): Observable<HosoCheckCccdResult> {
        const cleaned = cccd?.trim();
        const cleanedPhone = phone?.trim();
        if (!cleaned && !cleanedPhone) {
            return of<HosoCheckCccdResult>({ found: false });
        }
        const queryParams: IctuQueryParams = {
            limit: 1,
            paged: 1,
            order: 'DESC',
            orderby: 'created_at',
            select: 'id,ho_va_ten,nganh_id,created_at,status,cccd,dien_thoai,email'
        };
        const conditions: IctuConditionParam[] = [];
        if (cleaned) {
            conditions.push({
                conditionName: 'cccd',
                value: cleaned,
                condition: IctuQueryCondition.equal,
            });
        }
        if (cleanedPhone) {
            conditions.push({
                conditionName: 'dien_thoai',
                value: cleanedPhone,
                condition: IctuQueryCondition.equal,
                ...(cleaned ? {orWhere: 'and' as const} : {}),
            });
        }
        return this.query(conditions, queryParams).pipe(
            map((res: DtoObject<HosoThisinh[]>): HosoCheckCccdResult => {
                const first: HosoThisinh | undefined =
                    Array.isArray(res?.data) && res.data.length ? res.data[0] : undefined;
                return first ? { found: true, record: first } : { found: false };
            }),
            catchError((): Observable<HosoCheckCccdResult> => of<HosoCheckCccdResult>({ found: false })),
        );
    }

    checkpointHoso(cccd?: string, phone?: string): Observable<HosoThisinh | null> {
        return this.http.post<HosoThisinh | null>(this.api + 'check-point', {cccd, phone});
    }
}
