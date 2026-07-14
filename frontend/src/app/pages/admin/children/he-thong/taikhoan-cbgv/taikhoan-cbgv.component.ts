import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { IctuBasePermission, IctuPermissionControl } from '@models/ictu-base-model';
import { UserService } from '@services/user.service';
import { PickRole, RoleService } from '@services/role.service';
import { User } from '@models/user';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { DataTableEvent, DataTableEventName, IctuDataTable, IctuDataTablePaginatorInfo } from '@models/datatable';
import { filter, finalize, forkJoin, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { HttpClient, HttpParams } from '@angular/common/http';
import { getApiRouteLink } from '@env';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { Parents, ParentsService } from '@app/services/tuyensinh/parents';
import { IctuPaginatorControl } from '@app/theme/components/ictu-paginator/ictu-paginator-control';

type CbgvUser = User;

@Component({
    selector: 'app-taikhoan-cbgv',
    imports: [Drawer, IctuPaginatorComponent, InputText, LoadingProgressComponent, MatButton, MatCheckbox, MultiSelect, ReactiveFormsModule, FormsModule],
    templateUrl: './taikhoan-cbgv.component.html',
    styleUrl: './taikhoan-cbgv.component.css',
    standalone: true,
})
export default class TaikhoanCbgvComponent implements OnInit, OnDestroy, IctuBasePermission {

    searchInfo: { search: string } = { search: '' };
    dataTable: IctuDataTable<CbgvUser> = new IctuDataTable<CbgvUser>();
    dataRoles: PickRole[] = [];
    dataUsersDrd : User[]= [];
    formControl: IctuFormControl2<CbgvUser>;
    readonly drawer = viewChild<Drawer>('masterDrawer');
    eventObserver$: Subject<DataTableEvent<CbgvUser>> = new Subject<DataTableEvent<CbgvUser>>();
    handelEvent!: Record<DataTableEventName, (data?: CbgvUser | CbgvUser[]) => void>;
    state: WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>('success');
    private temp: IctuDataTablePaginatorInfo = { paged: 1, resetPaginator: true };
    showPassword = false;

    togglePassword(): void {
        this.showPassword = !this.showPassword;
    }

    private userService = inject(UserService);
    private roleService = inject(RoleService);
    private parentsService = inject(ParentsService);
    private auth = inject(AuthenticationService);
    private notification = inject(NotificationService);
    private fb = inject(FormBuilder);
    private onDestroy$: Subject<string> = new Subject<string>();

    permissionControl: Signal<IctuPermissionControl> = signal<IctuPermissionControl>(new IctuPermissionControl(this.auth.getUserPermission('he-thong/quan-ly-tai-khoan')));

    paginatorControl : Signal<IctuPaginatorControl> = signal<IctuPaginatorControl>( new IctuPaginatorControl( {
            pageLinkSize      : 5 ,
            rows              : 20 ,
            showFirstLastIcon : true
        } ) );


    isAdmin: Signal<boolean> = computed((): boolean => this.auth.userHasRole(['admin']) || this.auth.userHasRole(['direction']));
    isDoitac: Signal<boolean> = computed((): boolean => this.auth.userHasRole(['doi-tac']));

    constructor() {
        this.formControl = new IctuFormControl2<CbgvUser>({
            dropdownFields: [],
            formGroup: this.fb.group({
                username: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._]{3,20}$/)]],
                display_name: ['', [Validators.required, Validators.maxLength(255)]],
                email: ['', [Validators.required, Validators.email]],
                phone: ['', [Validators.required]],
                password: ['', [Validators.minLength(8)]],
                role_ids: [[] as number[], [Validators.required]],
                parent_id: [null as number | null],
            }),
            objectName: 'cán bộ - giảng viên',
            drawer: this.drawer,
        });

        this.handelEvent = {
            OPEN_FORM_ADD: (): void => {
                this.formControl.formGroup.reset({
                    username: '',
                    display_name: '',
                    email: '',
                    phone: '',
                    password: '',
                    role_ids: [],
                    parent_id: null,
                });
                this.formControl.formGroup.get('username')?.enable();
                this.formControl.formGroup.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
                this.formControl.formGroup.get('password')?.updateValueAndValidity();
                this.formControl.openFormAdd();
            },
            OPEN_FORM_UPDATE: (data: CbgvUser): void => {
                const roleIds: number[] = (data.role_ids || [])
                    .map(r => Number(r))
                    .filter(n => !isNaN(n));
                this.formControl.formGroup.reset({
                    username: data.username,
                    display_name: data.display_name,
                    email: data.email,
                    phone: data.phone,
                    password: '',
                    role_ids: roleIds,
                    parent_id: (data as CbgvUser & { parent_id?: number | null }).parent_id ?? null,
                });
                this.formControl.formGroup.get('username')?.disable();
                this.formControl.formGroup.get('password')?.setValidators([Validators.minLength(8)]);
                this.formControl.formGroup.get('password')?.updateValueAndValidity();
                this.formControl.openFormEdit(data);
            },
            DELETE_SINGLE_ROW: ({ id }: CbgvUser): void => {
                this.requestDeletingData([id]);
            },
            DELETE_SELECTED_ROWS: (): void => {
                const ids: number[] = this.dataTable.getSelectedData().map(({ id }: CbgvUser): number => id);
                if (ids.length) {
                    this.requestDeletingData(ids);
                }
            },
            SUBMIT_FORM: (): void => {
                if (this.formControl.canSubmit) {
                    const info: Partial<CbgvUser> = {
                        display_name: this.formField('display_name').value,
                        email: this.formField('email').value,
                        phone: this.formField('phone').value,
                        role_ids: (this.formField('role_ids').value as number[]).map(id => id.toString()),
                    };
                    const parentId: number | null = this.formField('parent_id' as keyof CbgvUser).value;
                    if (parentId) {
                        (info as CbgvUser & { parent_id: number | null }).parent_id = parentId;
                    }
                    const password: string = this.formField('password').value;
                    if (password) {
                        info.password = password;
                    }

                    const request: Observable<any> = this.formControl.isFormAdd
                        ? this.userService.create({
                            username: this.formField('username').value,
                            ...info,
                        } as Partial<CbgvUser>)
                        : this.userService.update(this.formControl.object.id, info);
                    const message: string = this.formControl.isFormAdd
                        ? 'Thêm cán bộ - giảng viên thành công'
                        : 'Cập nhật cán bộ - giảng viên thành công';
                    this.formControl.submit(request).subscribe({
                        next: (): void => {
                            this.notification.toastSuccess(message, 'Thông báo');
                            this.formControl.closeForm();
                            this.loadData(1, true);
                        },
                        error: (): void => {
                            this.notification.toastError(message, 'Thông báo');
                        },
                    });
                }
            },
        };

        this.eventObserver$.asObservable().pipe(takeUntil(this.onDestroy$)).subscribe(({ name, data }: DataTableEvent<CbgvUser>): void =>
            this.handelEvent[name](data),
        );
    }

    private formField(path: keyof CbgvUser): AbstractControl {
        return this.formControl.formGroup.get(path as string);
    }

    private loadInitial(): void {
        this.notification.isProcessing(true);


        forkJoin({
            roles: this.roleService.load(),
            users: this.userService.query([],{paged: 1, limit: -1,select: 'id,username,display_name,email'}),
        })
            .pipe(
                takeUntil(this.onDestroy$),
                finalize(() => this.notification.isProcessing(false)),
            )
            .subscribe({
                next: ({ roles, users }: { roles: PickRole[]; users: DtoObject<User[]> }): void => {
                    this.dataRoles = roles;
                    this.dataUsersDrd = users.data;
                    
                    this.loadData(1, true);
                },
                error: (): void => {
                    this.notification.toastError('Tải dữ liệu khởi tạo thất bại', 'Thông báo');
                },
            });
    }

    ngOnInit(): void {

        console.log(this.isAdmin(),this.isDoitac());
        
        this.loadInitial();
    }

    loadData(paged: number = 1, resetPaginator: boolean = true): void {
        
         const queryParams: IctuQueryParams = {
            limit: this.paginatorControl().rows(),
            paged:paged,
            order: 'DESC',
            orderby: 'id',
            exclude:this.auth.user.id
           
        
        };

        const conditions: IctuConditionParam[] = [];
        if (this.searchInfo.search) {
            conditions.push({
                conditionName: 'username',
                value: `%${this.searchInfo.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
            conditions.push({
                conditionName: 'display_name',
                value: `%${this.searchInfo.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
            conditions.push({
                conditionName: 'email',
                value: `%${this.searchInfo.search}%`,
                condition: IctuQueryCondition.like,
                orWhere: 'or',
            });
        }

        if(this.isDoitac()) {
            conditions.push({
                conditionName: 'created_by',
                value: this.auth.user.id.toString(),
                condition: IctuQueryCondition.equal,
                orWhere: 'and'
            });
        }

        this.userService.query(conditions, queryParams).pipe(switchMap((res: DtoObject<CbgvUser[]>) => {
            const ids: number[] = res.data.map((r: CbgvUser): number => r.id);
            return forkJoin([of(res), this.getParentsByUserIds(ids)]);
        })).subscribe({
            next: ([res, parents]) => {

                if ( resetPaginator ) {
                    this.paginatorControl().setupPaginator( res )
                }
                else {
                    this.paginatorControl().changePage( paged );
                }

                const data = res.data.length> 0 ? res.data.map(m=>{
                    m['_role_name'] = m.role_ids.map(id => {
                        const role = this.dataRoles.find(r => r.id === Number(id));
                        return role ? role.title : `#${id}`;
                    }).join(', ');
                    const parent = parents.data.find(p => p.user_id === m.id);
                    m['_parent'] = parent ? parent['user']['display_name'] : null;
                    return m;
                }) : [];


                this.dataTable.fillData(res.data);
            
                this.state.set('success');

                console.log('res', res)
                console.log('parents', parents)
            }, error: () => {
                this.state.set('error');

            }
        }
        );

    }

    private getParentsByUserIds(userIds: number[]): Observable<DtoObject<Parents[]>> {

        const condtion: IctuConditionParam[] = [
            { conditionName: 'user_id', condition: IctuQueryCondition.equal, value: userIds.toString(), orWhere: 'in' }
        ];
        const params: IctuQueryParams = {
            limit: userIds.length,
            paged: 1,
        }

        return userIds.length > 0 ? this.parentsService.query(condtion, params) : of({ data: [] } as DtoObject<Parents[]>);
    }

    private requestDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<CbgvUser> => new IctuDeletingAnimationControl(ids, this.userService)),
            switchMap((deleteController: IctuDeletingAnimationControl<CbgvUser>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            }),
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa cán bộ - giảng viên thành công');
                }
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa cán bộ - giảng viên thất bại');
            },
        });
    }

    onSearch(): void {
        this.loadData(1, true);
    }

    onChangePage(paged: number): void {
        this.loadData(paged, true);
    }

    onDrawerHide(): void {
        if (this.formControl.submitted) {
            this.loadData(1, true);
        }
    }

    addItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    editItem(data: CbgvUser): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    deleteItem(data: CbgvUser): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelected(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    reload(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData(this.temp.paged, this.temp.resetPaginator);
    }

    roleBadges(row: CbgvUser): { id: number; label: string }[] {
        return (row.role_ids || [])
            .map(id => Number(id))
            .filter(id => !isNaN(id))
            .map(id => {
                const role = this.dataRoles.find(r => r.id === id);
                return { id, label: role ? role.title : `#${id}` };
            });
    }

    ngOnDestroy(): void {
        this.onDestroy$.next('OnDestroy');
        this.onDestroy$.complete();
    }
}
