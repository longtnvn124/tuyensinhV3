# Service: Nganhhoc

## 1. Model — `src/app/models/nganhhoc.ts`

```typescript
import { IctuBaseModel } from '@models/ictu-base-model';

export interface Nganhhoc extends IctuBaseModel {
    id: number;
    name: string;        // tên ngành
    code: string;        // mã ngành, unique
    description?: string;
    is_active: boolean;  // hiển thị trên website hay không
}
```

Map với table `nganhhoc` trong DB (MySQL):
| Field | Type | Notes |
|-------|------|-------|
| id | INT | PK, auto-increment |
| name | VARCHAR(255) | NOT NULL |
| code | VARCHAR(50) | NOT NULL, UNIQUE |
| description | TEXT | nullable |
| is_active | TINYINT(1) | DEFAULT 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| updated_at | DATETIME | ON UPDATE CURRENT_TIMESTAMP |

Các field audit (`created_by`, `updated_by`, `is_deleted`, ...) do backend tự xử lý.

---

## 2. Service — `src/app/services/tuyensinh/nganhhoc.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { IctuBaseServiceClass } from '@models/ictu-base-service.class';
import {
    DtoObject,
    IctuConditionParam,
    IctuQueryCondition,
    IctuQueryParams,
} from '@models/dto';
import { map, Observable } from 'rxjs';
import { Nganhhoc } from '@app/models/nganhhoc';

export interface NganhhocSearchInfo {
    search: string;
}

@Injectable({
    providedIn: 'any',
})
export class NganhhocService extends IctuBaseServiceClass<Nganhhoc> {
    constructor() {
        super('nganhhoc');
    }

    /* ========== Danh sách + tìm kiếm ========== */

    load(
        info: NganhhocSearchInfo,
        _queryParams?: Partial<IctuQueryParams>,
    ): Observable<DtoObject<Nganhhoc[]>> {
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
                    conditionName: 'name',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
                {
                    conditionName: 'code',
                    value: `%${info.search}%`,
                    condition: IctuQueryCondition.like,
                    orWhere: 'or',
                },
            );
        }
        return this.query(conditions, queryParams);
    }

    /* ========== CRUD ========== */

    create(info: Partial<Nganhhoc>): Observable<number> {
        return this.http.post<DtoObject<number>>(this.api, info).pipe(
            map(r => r.data),
        );
    }

    update(id: number, info: Partial<Nganhhoc>): Observable<any> {
        return this.http.put<DtoObject<any>>(
            ''.concat(this.api, id.toString(10)),
            info,
        ).pipe(map(r => r.data));
    }

    delete(id: number): Observable<any> {
        return this.http.delete<DtoObject<any>>(
            ''.concat(this.api, id.toString(10)),
        ).pipe(map(r => r.data));
    }
}
```

---

## 3. Tổng hợp method

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `(id: number, queryParams?) => Observable<Nganhhoc>` | Lấy 1 record theo ID |
| `create` | `(info: Partial<Nganhhoc>) => Observable<number>` | Tạo mới, trả về ID |
| `update` | `(id: number, info: Partial<Nganhhoc>) => Observable<any>` | Cập nhật |
| `delete` | `(id: number) => Observable<any>` | Xoá (soft-delete nếu backend hỗ trợ) |
| `query` | `(conditions, queryParams?, subpath?) => Observable<DtoObject<Nganhhoc[]>>` | Query tùy chỉnh |

---

## 4. Cách dùng trong component

```typescript
import { Component, OnInit, inject } from '@angular/core';
import { NganhhocService, NganhhocSearchInfo } from '@app/services/tuyensinh/nganhhoc.service';
import { Nganhhoc } from '@app/models/nganhhoc';
import { DtoObject } from '@models/dto';

@Component({
    selector: 'app-nganh-hoc',
    templateUrl: './nganh-hoc.component.html',
    standalone: true,
})
export class NganhHocComponent implements OnInit {
    private nganhhocService = inject(NganhhocService);

    ngOnInit(): void {
        // Lấy danh sách
        const searchInfo: NganhhocSearchInfo = { search: '' };
        this.nganhhocService.load(searchInfo).subscribe({
            next: (res: DtoObject<Nganhhoc[]>) => console.log(res.data),
        });

        // Lấy 1 record
        this.nganhhocService.get(1).subscribe({
            next: (nganh: Nganhhoc) => console.log(nganh),
        });

        // Tạo mới
        this.nganhhocService.create({ name: 'Công nghệ thông tin', code: 'CNTT', is_active: true }).subscribe({
            next: (id: number) => console.log('Created:', id),
        });

        // Cập nhật
        this.nganhhocService.update(1, { name: 'Công nghệ thông tin (CNTT)' }).subscribe({
            next: () => console.log('Updated'),
        });

        // Xoá
        this.nganhhocService.delete(1).subscribe({
            next: () => console.log('Deleted'),
        });
    }
}
```

---

## 5. So sánh với service cũ

| Vấn đề | Service cũ | Service mới |
|--------|-----------|-------------|
| Kế thừa | Không, viết tay | `extends IctuBaseServiceClass<Nganhhoc>` |
| API URL | `getRoute('hoidong-ketqua/')` — sai endpoint | `super('nganhhoc')` — đúng |
| Types | Dùng `HoidongKetqua` sai model | Dùng `Nganhhoc` đúng model |
| Query helper | `httpParamsHelper` không được inject | Dùng `paramsConditionBuilder` từ base class |
| Code lượng | ~57 dòng, nhiều boilerplate | ~40 dòng, tận dụng base class |
