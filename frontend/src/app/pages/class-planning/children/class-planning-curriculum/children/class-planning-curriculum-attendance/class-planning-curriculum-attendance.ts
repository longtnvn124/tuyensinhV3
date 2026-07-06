import { Component, effect, EventEmitter, inject, input, InputSignal, Output, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButtonModule } from '@angular/material/button';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { IctuPermissionControl } from '@models/ictu-base-model';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { DiemDanhService } from '@services/diem-danh.service';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { Reason } from '@models/lichhoc';
import { AppState } from '@models/app-state';
import { Drawer } from 'primeng/drawer';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { AttendanceSocKet, DiemDanh, DiemDanhStatus } from '@models/diem-danh';
import { DataTableEvent, DataTableEventName, IctuDataTable } from '@models/datatable';
import { forkJoin, map, Subject, takeUntil } from 'rxjs';
import { DtoObject, IctuQueryCondition } from '@models/dto';
import { Textarea } from 'primeng/textarea';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { ClassActivity, ClassActivityParams } from '@app/models/class-activities';
import { PhuHuynh } from '@app/models/phu-huynh';
import { PhuHuynhSearchInfo, PhuHuynhService } from '@app/services/phu-huynh.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { ClassSession } from '@app/models/class-session';
import { Helper, HelperClass } from '@app/utilities/helper';
import { TooltipModule } from 'primeng/tooltip';

type DiemDanhMode = 'listDF' | 'listDiemDanh';

type statepage = 'load' | 'error' | 'success';

interface DiemDanhExtend extends DiemDanh {
    attendance_socet?: AttendanceSocKet,
    isUpdate: boolean;
}

@Component({
    selector: 'app-class-planning-curriculum-attendance',
    imports: [
        LoadingProgressComponent,
        ReactiveFormsModule,
        FormsModule,
        CommonModule,
        DatePickerModule,
        ButtonModule,
        MatDialogModule,
        CheckboxModule,
        DialogModule,
        MatMenuModule,
        MatIconModule,
        MatButtonModule,
        Textarea,
        MatTooltipModule,
        MultiSelectModule,
        SelectModule,
        TooltipModule
    ],
    templateUrl: './class-planning-curriculum-attendance.html',
    styleUrl: './class-planning-curriculum-attendance.css'
})
export class ClassPlanningCurriculumAttendance {
    private auth: AuthenticationService = inject(AuthenticationService);

    private notification: NotificationService = inject(NotificationService);

    private hocSinhservice: HocSinhLopHocService = inject(HocSinhLopHocService);

    private diemdanhService: DiemDanhService = inject(DiemDanhService);

    private activitiesService: ClassActivitiesService = inject(
        ClassActivitiesService
    );

    private phuHuynhservice: PhuHuynhService = inject(PhuHuynhService);

    visibleDialogAttendanceSocet: boolean = false;

    attendance_selected: WritableSignal<DiemDanhExtend> = signal<DiemDanhExtend>(null);

    class_session: InputSignal<ClassSession> = input.required<ClassSession>();

    visibleDialogPhuHuynh: boolean = false;

    private helper = new HelperClass();

    student_id_comment: number = 0;

    canChange: boolean = false;

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    searchInfoPhuhuynh: PhuHuynhSearchInfo = {
        search: ''
    };

    listPhuHuynh: PhuHuynh[] = [];

    phuHuynhManager: PhuHuynh;

    statePagePhuHuynh: WritableSignal<statepage> = signal<statepage>('load');

    diemdanhSelect: DiemDanhExtend;

    activitiesStudent: ClassActivity;

    optionsTrangThai: IctuDropdownOption<string>[] = [
        { value: 'UNEXCUSED', label: 'Nghỉ không phép' },
        { value: 'LATE', label: 'Đi muộn' },
        { value: 'EXCUSED', label: 'Nghỉ có phép' },
        { value: 'PRESENT', label: 'Đi học' }
    ];

    @Output() modeUpdated = new EventEmitter<{
        mode: DiemDanhMode;
    }>();

    changeMode(mode: DiemDanhMode) {
        this.modeUpdated.emit({ mode });
    }

    state: WritableSignal<AppState> = signal<AppState>('loading');
    private fb: FormBuilder = inject(FormBuilder);
    readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

    formControl: IctuFormControl2<ClassActivity> =
        new IctuFormControl2<ClassActivity>({
            dropdownFields: [],
            formGroup: this.fb.group({
                donvi_id: [this.donviId],
                class_id: [0],
                class_session_id: [0],
                type: [''],
                user_ids: [[], [Validators.required]],
                comment: [''],
                media: [[]]
            }),
            objectName: '',
            drawer: this.drawer
        });

    headerLoad = 'Loading...';

    private handelEvent: Record<DataTableEventName, (data: DiemDanh) => void> =
        {
            OPEN_FORM_ADD: (): void => {
            },
            OPEN_FORM_UPDATE: (data: DiemDanh): void => {
            },
            DELETE_SINGLE_ROW: ({ id }: DiemDanh): void => {
                this.notification.clearToast();
            },
            DELETE_SELECTED_ROWS: (): void => {
            },
            SUBMIT_FORM: (): void => {
            }
        };

    private eventObserver$: Subject<DataTableEvent<DiemDanh>> = new Subject<
        DataTableEvent<DiemDanh>
    >();

    private onDestroy$: Subject<string> = new Subject<string>();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true
    };

    dataTable: IctuDataTable<DiemDanhExtend> = new IctuDataTable<DiemDanhExtend>();
    listDiemDanh: DiemDanh[] = [];
    TTDiemDanh = signal<ClassActivityParams>({
        dihoc: [],
        nghihoc: [],
        dimuon: []
    });
    idTTDiemDanh: number = 0;
    permissionControl: Signal<IctuPermissionControl> =
        signal<IctuPermissionControl>(
            new IctuPermissionControl(
                this.auth.getUserPermission('teaching_assistant/calendar')
            )
        );

    constructor() {
        this.eventObserver$.asObservable().pipe(takeUntil(this.onDestroy$)).subscribe(({ name, data }: DataTableEvent<DiemDanh>): void =>
            this.handelEvent[name](data)
        );
    }

    formField(path: keyof ClassActivity): AbstractControl {
        return this.formControl.formGroup.get(path);
    }

    today = new Date();

    ngOnInit(): void {
        this.auth.listen<AttendanceSocKet>('diem_danh').subscribe((res): void => {
            const index = this.dataTable.data().findIndex((t) => t.class_session_id == res.class_session_id && t.hocsinh_id == res.hocsinh_id);
            if (index != -1) {
                let _value: DiemDanhExtend[] =
                    Helper.cloneObject(
                        this.dataTable.data() ?? []
                    );
                _value[index] = {
                    ..._value[index],
                    status: res.status,
                    reason: res.reason,
                    attendance_socet: {
                        ...res,
                        created_at: this.helper.formatSQLDateTime(new Date())
                    }
                };
                this.dataTable.fillData(_value);
                this.setTTDiemDanh();
            }
        });
        // this.preload().subscribe({
        //     next: () => {
        //         this.loadData(1, true);
        //     },
        //     error: () => {
        //         this.state.set('error');
        //     },
        // });
    }

    private effectRef = effect(() => {
        const sessionId = this.class_session().id;
        if (sessionId) {
            this.loadData(1, true);
        }
    });

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.headerLoad = 'Loading...';
        this.state.set('loading');
        this._temp = { paged, resetPaginator };
        forkJoin([
            this.diemdanhService.query([{
                conditionName: 'class_session_id',
                value: this.class_session().id.toString(),
                condition: IctuQueryCondition.equal
            }], {
                limit: -1,
                paged: 1,
                include: this.donviId,
                include_by: 'donvi_id',
                order: 'ASC',
                with: 'hocsinh,phuhuynh'
            }),
            this.activitiesService.load(
                this.class_session().id,
                this.donviId,
                'DIEM_DANH',
                [],
                {
                    limit: -1,
                    paged
                }
            )
        ]).pipe(
            map(
                ([res2, res3]: [
                    DtoObject<DiemDanhExtend[]>,
                    DtoObject<ClassActivity[]>
                ]) => {
                    return {
                        listDiemDanh: res2.data,
                        TTDiemDanh: res3.data
                    };
                }
            )
        ).subscribe({
            next: ({ listDiemDanh, TTDiemDanh }) => {
                this.dataTable.fillData(listDiemDanh.map((item) => {
                    return { ...item, isUpdate: false }
                }));
                this.setTTDiemDanh();
                if (TTDiemDanh.length != 0) {
                    this.idTTDiemDanh = TTDiemDanh[0].id;
                }
                this.state.set('success');
            },
            error: () => {
                this.state.set('error');
            }
        });
    }

    createReasonUpdateCalendar(
        reasonstring: string,
        reason: Reason[]
    ): Reason[] {
        let result = [];
        if (reason) {
            for (let item of reason) {
                if (item.name == this.auth.employee.full_name) {
                    item.reason = reasonstring;
                }
            }
            result = reason;
        }
        else {
            result.push({
                name: this.auth.employee.full_name,
                reason: reasonstring
            });
        }
        return result;
    }

    deleteRow(data: DiemDanh): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    editRow(data: DiemDanh): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    reload(event: MouseEvent): void {
        this.loadData(this._temp.paged, this._temp.resetPaginator);
        event.preventDefault();
        event.stopPropagation();
    }

    addNewItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadData(1, true);
        }
    }

    shortenText(text: string): string {
        return text.length > 15 ? text.slice(0, 15) + '...' : text;
    }

    convertUserIDS(user_ids: string) {
        const userIds = user_ids.split('|').filter((id) => id).map((id) => Number(id)).filter((num) => !isNaN(num));
        return userIds;
    }

    convertUserIDsBack(userIds: number[]): string {
        if (!userIds || userIds.length === 0) return '';
        return '|' + userIds.join('|') + '|';
    }

    getRole(): string {
        if (this.auth.userHasRole(['training_management'])) {
            return 'training_management';
        }
        else if (this.auth.userHasRole(['teacher'])) {
            return 'teacher';
        }
        else if (this.auth.userHasRole(['teaching_assistant'])) {
            return 'teaching_assistant';
        }
        else {
            return 'unauthorized';
        }
    }

    getvalueFormControl() {
        return this.formField('comment').value;
    }

    loadPhuHuynh(row: DiemDanhExtend) {
        this.statePagePhuHuynh.set('load');
        this.listPhuHuynh = [];
        this.phuHuynhservice.load(this.searchInfoPhuhuynh, row.phuhuynh_id ?? 0, 0, {
            limit: -1,
            paged: 1
        }).pipe(
            map((res) => {
                this.phuHuynhManager = res.data[0];
                return this.phuHuynhManager;
            })
        ).subscribe({
            next: () => {
                if (this.phuHuynhManager) {
                    this.phuHuynhservice.load(
                        this.searchInfoPhuhuynh,
                        0,
                        this.phuHuynhManager.id ?? 0,
                        {
                            limit: 1000,
                            paged: 1
                        }
                    ).pipe(
                        map(
                            (
                                res: DtoObject<PhuHuynh[]>
                            ): PhuHuynh[] => {
                                return res.data;
                            }
                        )
                    ).subscribe({
                        next: (data: PhuHuynh[]): void => {
                            this.listPhuHuynh = data;
                            this.listPhuHuynh.unshift(
                                this.phuHuynhManager
                            );
                            this.statePagePhuHuynh.set('success');
                        },
                        error: (): void => {
                            this.statePagePhuHuynh.set('error');
                        }
                    });
                }
                else {
                    this.statePagePhuHuynh.set('success');
                }
            },
            error: (): void => {
                this.statePagePhuHuynh.set('error');
            }
        });
    }


    opendialogPhuHuynh(row: DiemDanhExtend): void {
        this.loadPhuHuynh(row);
        this.diemdanhSelect = row;
        this.visibleDialogPhuHuynh = true;
    }

    submitDiemDanhAll() {
        this.headerLoad = 'Đang cập nhật...';
        this.state.set('loading');
        if (
            this.dataTable.data().filter(
                (item) =>
                    item.isUpdate ||
                    (item.status == 'PRESENT' && !item.id)
            ).length != 0
        ) {
            const requests = this.dataTable.data().filter(
                (item) =>
                    item.isUpdate ||
                    (item.status == 'PRESENT' && !item.id)
            ).map((item_submit) => {
                const info: Partial<DiemDanh> = {
                    class_session_id: this.class_session().id,
                    donvi_id: this.donviId,
                    csdt_id: this.class_session().csdt_id ?? 0,
                    phuhuynh_id: item_submit.phuhuynh.id,
                    class_id: this.class_session().csdt_id,
                    hocsinh_id: item_submit.hocsinh.id,
                    reason: item_submit.reason ?? '',
                    status: item_submit.status
                };
                return this.diemdanhService.update(
                    item_submit.id,
                    info
                );
            });

            forkJoin(requests).subscribe({
                next: async () => {
                    this.listDiemDanh = [];
                    await this.updateActivities();
                    await this.loadData();
                    this.notification.toastSuccess('Cập nhật thành công', 'Thông báo');
                },
                error: () => {
                    this.state.set('success');
                    this.loadData();
                    this.notification.toastError('Cập nhật không thành công', 'Thông báo');
                }
            });

        }
        else {
            this.updateActivities();
        }
    }

    updateActivities() {
        const infoActivity: Partial<ClassActivity> = {
            donvi_id: this.donviId,
            class_id: this.class_session().class_id,
            comment: '',
            class_session_id: this.class_session().id,
            type: 'DIEM_DANH',
            params: this.TTDiemDanh()
        };
        let request;
        if (this.idTTDiemDanh == 0) {
            request = this.activitiesService.create(infoActivity);
        }
        else {
            request = this.activitiesService.update(
                this.idTTDiemDanh,
                infoActivity
            );
        }
        request.subscribe({
            next: () => {
                this.state.set('success');
            },
            error: () => {
                this.state.set('success');
            }
        });
    }

    updateStatusDiemDanh(status: DiemDanhStatus, index: number): void {
        let dataTableOld = this.dataTable.data();
        if (status == 'PRESENT') {
            dataTableOld[index].reason = '';
        }
        dataTableOld[index].status = status;
        dataTableOld[index].isUpdate = true;
        this.dataTable.fillData(dataTableOld);
        this.setTTDiemDanh();
    }

    isCanSubmit(): boolean {
        const tam = this.dataTable.data().filter(
            (item) =>
                item.isUpdate ||
                (item.status == 'PRESENT' && !item.id)
        );
        return tam.length ? true : false;
    }

    selectAttendance(row: DiemDanhExtend): void {
        this.attendance_selected.set(row);
        this.visibleDialogAttendanceSocet = true;
    }

    setTTDiemDanh(): void {
        const tam: ClassActivityParams = {
            dihoc:
                this.dataTable.data().filter((item) => item.status === 'PRESENT').map((item) => item.hocsinh.id) ?? [],
            nghihoc:
                this.dataTable.data().filter(
                    (item) =>
                        item.status === 'UNEXCUSED' ||
                        item.status === 'EXCUSED'
                ).map((item) => item.hocsinh.id) ?? [],
            dimuon:
                this.dataTable.data().filter((item) => item.status === 'LATE').map((item) => item.hocsinh.id) ?? []
        };
        this.TTDiemDanh.set(tam);
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.effectRef?.destroy();
        this.onDestroy$.complete();
    }
}
