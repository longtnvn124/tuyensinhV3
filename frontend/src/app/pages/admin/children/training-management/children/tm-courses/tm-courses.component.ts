import { Component, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { IctuDropdownOptionMapPipe } from '@app/pipes/ictu-dropdown-option-map.pipe';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownField, IctuDropdownOption } from '@models/ictu-dropdown-option';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { LinhVucDaoTaoService } from '@services/linh-vuc-dao-tao.service';
import { BacDaoTaoService } from '@services/bac-dao-tao.service';
import { AppState } from '@models/app-state';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { DataTableEvent, DataTableEventName, IctuDataTable } from '@models/datatable';
import { forkJoin, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject } from '@models/dto';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { MatTooltipModule } from '@angular/material/tooltip';
import { CourseSearchInfo, CoursesService } from '@services/course.service';
import { Course, CourseCommand, CourseRoutingCommand, TYPE_COURSE_OPTIONS } from '@models/course';
import { Editor, NgxEditorComponent, NgxEditorMenuComponent, Toolbar } from 'ngx-editor';
import { Helper } from '@utilities/helper';
import { SysRoleName } from '@models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { EmployeesService } from '@services/employees.service';
import { TooltipModule } from 'primeng/tooltip';
import { CourseRoutingOverview } from '@app/components/course-overview/course-overview.component';

type deCuong = { order: number; title: string; slug: string };

@Component({
    selector: 'app-tm-courses',
    imports: [Drawer, IctuPaginatorComponent, InputText, LoadingProgressComponent, MatButton, MatCheckbox, ReactiveFormsModule, Select, FormsModule, IctuDropdownOptionMapPipe, DialogModule, DragDropModule, MatTooltipModule, NgxEditorComponent, NgxEditorMenuComponent, TooltipModule],
    templateUrl: './tm-courses.component.html',
    styleUrl: './tm-courses.component.css'
})
export default class TmCoursesComponent implements OnInit, OnDestroy, IctuBasePermission {
    optionList: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Dừng hoạt động' },
        { value: 1, label: 'Đang hoạt động' }
    ];

    private service: CoursesService = inject(CoursesService);

    private auth: AuthenticationService = inject(AuthenticationService);

    private notification: NotificationService = inject(NotificationService);

    private linhvucDaoTaoService: LinhVucDaoTaoService = inject(LinhVucDaoTaoService);

    private bacDaoTaoService: BacDaoTaoService = inject(BacDaoTaoService);

    private employeesService: EmployeesService = inject(EmployeesService);

    private roleUsed: SysRoleName = inject(PROVIDED_ROLE);

    get donviId(): number {
        return this.auth.user.donvi_id;
    }

    get userID(): number {
        return this.auth.user.id;
    }

    get userName(): string {
        return this.auth.user.username;
    }

    linhvucDropdownField: IctuDropdownField = new IctuDropdownField(this.linhvucDaoTaoService.loadChildOptions(), 'Chọn lĩnh vực đào tạo');

    bacDaoTaoDropdownField: IctuDropdownField = new IctuDropdownField(this.bacDaoTaoService.loadOptions(this.donviId), 'Chọn bậc đào tạo');

    giaovienDropdownField: IctuDropdownField = new IctuDropdownField(this.employeesService.loadEmployeeSelectOptions(this.donviId), 'Chọn giáo viên phụ trách');

    typeDropdownField = TYPE_COURSE_OPTIONS;

    editor: Editor;

    toolbar = [
        ['bold', 'italic', 'underline'],
        ['heading', 'blockquote', 'code', 'ordered_list', 'bullet_list'],
        ['link'],
        ['text_color', 'background_color'],
        ['align_left', 'align_center', 'align_right', 'align_justify']
    ] as Toolbar;

    state: WritableSignal<AppState> = signal<AppState>('loading');

    private fb: FormBuilder = inject(FormBuilder);

    visibleDialog: boolean = false;

    structureLesson: deCuong[] = [];

    isUpdateStructureLesson: boolean = false;

    khoahoc_idSelect: number = 0;

    readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

    formControl: IctuFormControl2<Course> = new IctuFormControl2<Course>({
        dropdownFields: [
            this.bacDaoTaoDropdownField,
            this.linhvucDropdownField
        ],
        formGroup: this.fb.group({
            title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
            code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
            desc: [''],
            thumbnail: [''],
            tags: [''],
            category_ids: [''],
            attachments: [''],
            linhvuc_id: [0, [Validators.required]],
            bacdaotao_id: [0, [Validators.required]],
            sobaigiang: [0, [Validators.required]],
            duration: [0],
            video_introduce: [''],
            playlist_id: [''],
            playlist_source: [''],
            seo: [''],
            price: [0],
            discount: [0],
            feature: [0],
            status: [0, [Validators.required]],
            activated: [0],
            teacher_ids: [''],
            creator_id: [0],
            creator_name: [''],
            params: [''],
            donvi_id: [0, [Validators.required]],
            type: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]]
        }),
        objectName: 'khóa học',
        drawer: null
    });

    private handelEvent: Record<DataTableEventName, (data: Course) => void> = {
        OPEN_FORM_ADD: (course: Course): void => {
            this.getToCourse(course?.id ?? 0);
            // this.formControl.openFormAdd();
        },
        OPEN_FORM_UPDATE: (data: Course): void => {
            this.formControl.formGroup.reset({
                title: data.title,
                code: data.code,
                desc: data.desc,
                thumbnail: data.thumbnail,
                tags: data.tags,
                category_ids: data.category_ids,
                attachments: data.activated,
                linhvuc_id: data.linhvuc_id,
                bacdaotao_id: data.bacdaotao_id,
                sobaigiang: data.sobaigiang,
                duration: data.duration,
                video_introduce: data.video_introduce,
                playlist_id: data.playlist_id,
                playlist_source: data.playlist_source,
                seo: data.seo,
                price: data.price,
                discount: data.discount,
                feature: data.feature,
                status: data.status,
                activated: data.activated,
                teacher_ids: data.teacher_ids,
                creator_id: data.creator_id,
                creator_name: data.creator_name,
                params: data.params,
                donvi_id: data.donvi_id
            });
            this.formControl.openFormEdit(data);
        },
        DELETE_SINGLE_ROW: ({ id }: Course): void => {
            this.requestDeletingData([id]);
        },
        DELETE_SELECTED_ROWS: (): void => {
            const ids: number[] = this.dataTable.getSelectedData().map(({ id }: Course): number => id);
            if (ids.length) {
                this.requestDeletingData(ids);
            }
        },
        SUBMIT_FORM: (): void => {
            if (this.formControl.canSubmit) {
                const info: Partial<Course> = {
                    title: this.formField('title').value,
                    code: this.formField('code').value,
                    desc: this.formField('desc').value,
                    linhvuc_id: this.formField('linhvuc_id').value,
                    bacdaotao_id: this.formField('bacdaotao_id').value,
                    sobaigiang: this.formField('sobaigiang').value,
                    status: this.formField('status').value,
                    creator_id: this.userID,
                    creator_name: this.userName,
                    donvi_id: this.donviId,
                    type: this.formField('type').value
                };
                const request: Observable<any> = this.formControl.isFormAdd ? this.service.create(info) : this.service.update(this.formControl.object.id, info);
                const message: string = this.formControl.isFormAdd ? 'Thêm mới thành công' : 'Cập nhật thành công';
                this.formControl.submit(request).subscribe({
                    next: (): void => {
                        this.notification.toastSuccess(message, 'Thông báo');
                        if (this.formControl.isFormAdd) {
                            this.formControl.formGroup.reset({
                                title: '',
                                code: '',
                                desc: '',
                                thumbnail: '',
                                tags: '',
                                category_ids: '',
                                attachments: '',
                                linhvuc_id: 0,
                                bacdaotao_id: 0,
                                sobaigiang: 0,
                                duration: 0,
                                video_introduce: '',
                                playlist_id: '',
                                playlist_source: '',
                                seo: '',
                                price: 0,
                                discount: 0,
                                feature: 0,
                                status: 0,
                                activated: 0,
                                teacher_ids: '',
                                creator_id: 0,
                                creator_name: '',
                                params: '',
                                donvi_id: this.donviId
                            });
                        }
                        else {
                            this.formControl.closeForm();
                        }
                    },
                    error: (): void => {
                        this.notification.toastError(message, 'Thông báo');
                    }
                });
            }
        }
    };

    private eventObserver$: Subject<DataTableEvent<Course>> = new Subject<DataTableEvent<Course>>();

    private destroyed$: Subject<void> = new Subject<void>();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true
    };

    searchInfo: CourseSearchInfo = {
        search: ''
    };

    dataTable: IctuDataTable<Course> = new IctuDataTable<Course>();

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(new IctuPermissionControl(this.auth.getUserPermission('training-management/courses')));

    constructor(private router: Router) {
        this.eventObserver$.asObservable().pipe(takeUntil(this.destroyed$)).subscribe(({ name, data }: DataTableEvent<Course>): void =>
            this.handelEvent[name](data)
        );
    }

    private formField(path: keyof Course): AbstractControl {
        return this.formControl.formGroup.get(path);
    }

    ngOnInit(): void {
        this.editor = new Editor();
        this.loadData(1, true);
    }

    private requestDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<Course> => new IctuDeletingAnimationControl(ids, this.service)),
            switchMap((deleteController: IctuDeletingAnimationControl<Course>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            })
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa thành công');
                }
                this.loadData(this._temp.paged, false);
            },
            error: (): void => {
                this.notification.toastError('Xóa thất bại');
            }
        });
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this._temp = { paged, resetPaginator };
        this.linhvucDropdownField.load();
        this.bacDaoTaoDropdownField.load();
        forkJoin<
            [
                IctuDropdownOption<number>[],
                IctuDropdownOption<number>[],
                DtoObject<Course[]>
            ]
        >([
            this.linhvucDropdownField.load(),
            this.bacDaoTaoDropdownField.load(),
            this.service.load(this.searchInfo, this.donviId, {
                limit: this.dataTable.paginator.rows(),
                paged
            })
        ]).pipe(
            map(
                ([_, __, res]: [
                    IctuDropdownOption<number>[],
                    IctuDropdownOption<number>[],
                    DtoObject<Course[]>
                ]): Course[] => {
                    if (resetPaginator) {
                        return this.dataTable.paginator.setupPaginator(res);
                    }
                    else {
                        this.dataTable.paginator.changePage(paged);
                        return res.data;
                    }
                }
            )
        ).subscribe({
            next: (data: Course[]): void => {
                this.dataTable.fillData(data);
                this.state.set('success');
            },
            error: (): void => {
                this.state.set('error');
            }
        });
    }

    deleteRow(data: Course): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    editRow(data: Course): void {
        this.structureLesson = data.lecture_format ?? [];
        this.khoahoc_idSelect = data.id;
        this.isUpdateStructureLesson = false;
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this._temp.paged, this._temp.resetPaginator);
    }

    addNewItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadData(1, true);
        }
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onSearchData(): void {
        this.loadData(1, true);
    }

    getToCourse(course_id: number): void {
        const _hashcode: CourseRoutingCommand = {
            courseID: course_id,
            userId: this.userID,
            role: this.roleUsed
        }
        void this.router.navigate(['/edit-course'], {
            queryParams: {
                hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
                previewBy: Helper.removeAccents(this.userName)
            }
        });
    }

    protected btnGetToCourseEditor(event: MouseEvent, course: Course): void {
        event.preventDefault();
        event.stopPropagation();
        this.getToCourse(course.id);
    }

    addItem(): void {
        this.structureLesson.push({
            order: this.structureLesson.length > 0 ? Math.max(... this.structureLesson.map((i: deCuong): number => i.order)) + 1 : 0,
            title: '',
            slug: ''
        });
        this.isUpdateStructureLesson = true;
    }

    openDialog(row: Course): void {
        this.structureLesson = row.lecture_format ?? [];
        this.khoahoc_idSelect = row.id;
        this.visibleDialog = true;
    }

    closeDialog(): void {
        this.structureLesson = [];
        this.visibleDialog = false;
    }

    drop(event: CdkDragDrop<any[]>): void {
        moveItemInArray(
            this.structureLesson,
            event.previousIndex,
            event.currentIndex
        );
        this.updateOrder();
    }

    updateOrder(): void {
        this.structureLesson.forEach((item, index) => (item.order = index));
        this.isUpdateStructureLesson = true;
    }

    saveItems(): void {
        this.structureLesson = this.structureLesson.filter((item) => item.title.trim() !== '').sort((a, b) => a.order - b.order).map((item, index) => ({
            ...item,
            order: index,
            slug: Helper.removeAccents(item.title)
        }));

        const info: Partial<any> = {
            structure: this.structureLesson
        };
        const request: Observable<any> = this.service.update(
            this.khoahoc_idSelect,
            info
        );
        request.subscribe({
            next: (): void => {
                this.loadData(1, true);
                this.closeDialog();
                this.notification.toastSuccess('Cập nhật thành công', 'Thông báo');
            },
            error: (): void => {
                this.notification.toastError('Cập nhật không thành công', 'Thông báo');
            }
        });
    }

    removeItem(index: number): void {
        this.structureLesson.splice(index, 1);
    }

    isUpdateFormControl(formControl: boolean, structure: boolean): boolean {
        return formControl || structure;
    }

    getToPreviewCourse(item: Course): void {
        const _hashcode: CourseCommand = {
            course: item,
            role: this.roleUsed,
            userId: this.auth.user.id
        };
        void this.router.navigate(['/preview-course'], {
            queryParams: {
                hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
                viewer: 'by_'.concat(this.roleUsed)
            }
        });
    }

    getToCourseOverView(item: Course): void {
        const _hashcode: CourseRoutingOverview = {
            userId: this.auth.user.id,
            course_id: item.id,
            class_id: 0
        };
        void this.router.navigate(['/course-overview'], {
            queryParams: {
                hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
                viewer: 'by_'.concat(this.roleUsed)
            }
        });
    }

    ngOnDestroy(): void {
        this.destroyed$.next();
        this.destroyed$.complete();
    }
}
