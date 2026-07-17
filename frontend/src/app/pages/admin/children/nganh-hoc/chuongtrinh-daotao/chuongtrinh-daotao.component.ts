import { Component, Input, OnChanges, SimpleChanges, inject, signal, WritableSignal } from '@angular/core';
import { Nganhhoc } from '@models/tuyensinh/nganhhoc';
import { ChuongtrinhDaotao } from '@models/tuyensinh/chuongtrinh-daotao';
import { ChuongtrinhDaotaoService, ChuongtrinhDaotaoSearchInfo } from '@services/tuyensinh/chuongtrinh-daotao.service';
import { IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { DtoObject } from '@models/dto';
import { Observable, map, filter, switchMap } from 'rxjs';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { NotificationService } from '@services/notification.service';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";

// PrimeNG components for new design
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { Tag } from 'primeng/tag';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Checkbox } from 'primeng/checkbox';

@Component({
    selector: 'app-chuongtrinh-daotao',
    imports: [
    IctuPaginatorComponent, InputText, Textarea, Select,
    ReactiveFormsModule, FormsModule,
    LoadingProgressComponent,
    Button, SelectButton, Tag, Card, Dialog, InputNumber, Checkbox
],
    templateUrl: './chuongtrinh-daotao.component.html',
    styleUrl: './chuongtrinh-daotao.component.css',
    standalone: true,
})
export class ChuongtrinhDaotaoComponent implements OnChanges {
    @Input() set nganh(item: Nganhhoc | null) {
        this._nganh = item;
    }
    get nganh(): Nganhhoc | null {
        return this._nganh;
    }
    @Input() permission!: IctuPermissionControl;
    private _nganh: Nganhhoc | null = null;

    // ── View mode toggle ──
    viewMode = signal<'table' | 'card'>('card');
    readonly viewModeOptions = [
        { label: 'Bảng', value: 'table' },
        { label: 'Thẻ', value: 'card' },
    ];

    // ── Form dialog ──
    formVisible = signal(false);

    optionList: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Dừng hoạt động' },
        { value: 1, label: 'Đang hoạt động' },
    ];

    listDoituong_xettuyen = [
        {value:'thpt', label:'Trung học Phổ thông'},
        {value:'trungcap', label:'Trung cấp'},
        {value:'caodang', label:'Cao đẳng'},
        {value:'daihoc', label:'Đại học'},
    ]

    private service = inject(ChuongtrinhDaotaoService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);

    searchInfo: ChuongtrinhDaotaoSearchInfo = { search: '' };
    dataTable: IctuDataTable<ChuongtrinhDaotao> = new IctuDataTable<ChuongtrinhDaotao>();
    state: WritableSignal<'loading' | 'success' | 'error'> = signal('success');
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };

    // Form state
    formMode: WritableSignal<'add' | 'edit'> = signal('add');
    editingItem: ChuongtrinhDaotao | null = null;
    selectedMajorId: number = 0;

    formGroup = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
        description: [''],
        dieu_kien_xet_tuyen: [''],
        thoi_gian_dao_tao: [''],
        chi_tieu: [0, [Validators.min(0)]],
        tong_tin_chi : [0, [Validators.min(0)]],
        is_active: [1],
    });

    formFilledAndValid(): boolean {
        return this.formGroup.valid;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['nganh'] && this.nganh?.id) {
            this.selectedMajorId = this.nganh.id;
            this.loadData(1, true);
        }
    }

    // ── Data ──

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        const majorId = this.selectedMajorId;
        if (!majorId) return;
        this.state.set('loading');
        this.temp = { paged, resetPaginator };
        this.service.load(this.searchInfo, majorId, { limit: this.dataTable.paginator.rows(), paged }).pipe(
            map((res: DtoObject<ChuongtrinhDaotao[]>): ChuongtrinhDaotao[] => {
                if (resetPaginator) {
                    return this.dataTable.paginator.setupPaginator(res);
                } else {
                    this.dataTable.paginator.changePage(paged);
                    return res.data;
                }
            }),
        ).subscribe({
            next: (data: ChuongtrinhDaotao[]): void => {
                this.dataTable.fillData(data);
                this.state.set('success');
            },
            error: (): void => {
                this.state.set('error');
            },
        });
    }

    private requestDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<ChuongtrinhDaotao> => new IctuDeletingAnimationControl(ids, this.service)),
            switchMap((deleteController: IctuDeletingAnimationControl<ChuongtrinhDaotao>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            }),
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa chương trình thành công');
                }
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa chương trình thất bại');
            },
        });
    }

    onSearch(): void {
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    reloadDetail(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this.temp.paged, this.temp.resetPaginator);
    }

    // ── Form actions ──

    addProgram(): void {
        this.formMode.set('add');
        this.editingItem = null;
        this.resetForm();
        this.formVisible.set(true);
    }

    editProgram(data: ChuongtrinhDaotao): void {
        this.formMode.set('edit');
        this.editingItem = data;
        this.formGroup.reset({
            name: data.name,
            code: data.code,
            description: data.description || '',
            dieu_kien_xet_tuyen: data.dieu_kien_xet_tuyen || '',
            thoi_gian_dao_tao: data.thoi_gian_dao_tao || '',
            chi_tieu: data.chi_tieu || 0,
            is_active: data.is_active ? 1 : 0,
        });
        this.formVisible.set(true);
    }

    deleteProgram(data: ChuongtrinhDaotao): void {
        this.requestDeletingData([data.id]);
    }

    deleteSelectedPrograms(): void {
        const ids: number[] = this.dataTable.getSelectedData().map(({ id }: ChuongtrinhDaotao): number => id);
        if (ids.length) {
            this.requestDeletingData(ids);
        }
    }

    submitForm(): void {
        if (!this.formGroup.valid) return;
        const raw = this.formGroup.value;
        const info: Partial<ChuongtrinhDaotao> = {
            name: raw.name || '',
            code: raw.code || '',
            description: raw.description || '',
            dieu_kien_xet_tuyen: raw.dieu_kien_xet_tuyen || '',
            thoi_gian_dao_tao: raw.thoi_gian_dao_tao || '',
            chi_tieu: raw.chi_tieu || 0,
            major_id: this.selectedMajorId,
            is_active: raw.is_active === 1,
        };
        const isAdd = this.formMode() === 'add';
        const request: Observable<any> = isAdd
            ? this.service.create(info)
            : this.service.update(this.editingItem!.id, info);
        const message = isAdd ? 'Thêm chương trình thành công' : 'Cập nhật chương trình thành công';

        request.subscribe({
            next: (): void => {
                this.notification.toastSuccess(message, 'Thông báo');
                this.cancelForm();
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError(message, 'Thông báo');
            },
        });
    }

    cancelForm(): void {
        this.formVisible.set(false);
        this.formMode.set('add');
        this.editingItem = null;
        this.resetForm();
    }

    private resetForm(): void {
        this.formGroup.reset({
            name: '',
            code: '',
            description: '',
            dieu_kien_xet_tuyen: '',
            thoi_gian_dao_tao: '',
            chi_tieu: 0,
            is_active: 1,
        });
    }

    viewdkxt(text: string){
    
        return text || this.listDoituong_xettuyen.find(f=>f.value == text) ? this.listDoituong_xettuyen.find(f=>f.value == text).label : '' ;
    }
}
