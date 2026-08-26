import { HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RegistrationStatus, Registrations } from '@app/models/tuyensinh/registrations';

export interface RegistrationSearchInfo {
    search: string;
    status?: RegistrationStatus;
    dotxettuyen_id?: number;
    nganh_id?: number;
    nguoi_tuvan?: number;
}

export type RegistrationCheckCccdResult =
    | { found: false }
    | { found: true; record: Registrations };

@Injectable({
    providedIn: 'any',
})
export class RegistrationsService extends IctuBaseServiceClass<Registrations> {
	getRegistrationsByPage(conditions: IctuConditionParam[]): Observable<DtoObject<Registrations[]>> {
		return this.query(conditions, { limit: 1, paged: 1 });
	}
	updateRegistration(id: number, data: Partial<Registrations>): Observable<any> {
		return this.update(id, data);
	}
	addRegistration(data: Partial<Registrations>, context?: HttpContext): Observable<number> {
		return this.create(data, context);
	}
    constructor() {
        super('registrations');
    }

    load(
        info: RegistrationSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<Registrations[]>> {
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
        if (info.status !== undefined) {
            conditions.push({
                conditionName: 'status',
                value: `${info.status}`,
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

    checkCccd(cccd?: string, phone?: string): Observable<RegistrationCheckCccdResult> {
        const cleaned = cccd?.trim();
        const cleanedPhone = phone?.trim();
        if (!cleaned && !cleanedPhone) {
            return of<RegistrationCheckCccdResult>({ found: false });
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
            map((res: DtoObject<Registrations[]>): RegistrationCheckCccdResult => {
                const first: Registrations | undefined =
                    Array.isArray(res?.data) && res.data.length ? res.data[0] : undefined;
                return first ? { found: true, record: first } : { found: false };
            }),
            catchError((): Observable<RegistrationCheckCccdResult> => of<RegistrationCheckCccdResult>({ found: false })),
        );
    }

    checkpointRegistration(cccd?: string, phone?: string): Observable<Registrations | null> {
        return this.http.post<Registrations | null>(this.api + 'check-point', {cccd, phone});
    }
}
