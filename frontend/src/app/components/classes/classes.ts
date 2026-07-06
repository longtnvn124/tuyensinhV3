import { Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { IctuDropdownOption, IctuDropdownOption2 } from '@models/ictu-dropdown-option';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { AppState } from '@models/app-state';
import { Class, ClassPlanningCommand } from '@app/models/class';
import { DataTableEvent, DataTableEventName, IctuDataTable2, IctuDataTableRow } from '@models/datatable';
import { debounceTime, map, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@models/dto';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonModule } from '@angular/common';
import { SysRoleName } from '@models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { ClassesService } from '@services/classes.service';
import { Helper } from '@utilities/helper';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EmployeePhotoPipe } from '@pipes/employee-photo.pipe';
import { ClassProgressCalculatorComponent } from '@components/class-progress-calculator/class-progress-calculator.component';
import { ClassSession } from '@models/class-session';
import { Employee } from '@models/employee';
import { Course, CourseRoutingCommand } from '@models/course';
import { Dialog } from 'primeng/dialog';
import { ClassCourseUpgradeComponent } from '@components/class-course-upgrade/class-course-upgrade.component';
import { isArray } from 'lodash-es';
import { CourseRoutingOverview } from '../course-overview/course-overview.component';

export interface ClassExtended extends Class {
    teachers?: Employee[];
    assistants?: Employee[];
    course?: Course;
    _progress: number,
    _isAllLessonCompleted: boolean,
    _totalLessons: number,
}

@Component({
    selector: 'app-classes',
    standalone: true,
    imports: [IctuPaginatorComponent, InputText, LoadingProgressComponent, MatButton, MatCheckbox, ReactiveFormsModule, FormsModule, FloatLabelModule, MultiSelectModule, MatTooltipModule, MatMenuModule, MatIconModule, MatButtonModule, DatePickerModule, CommonModule, EmployeePhotoPipe, ClassProgressCalculatorComponent, Dialog, ClassCourseUpgradeComponent],
    templateUrl: './classes.html',
    styleUrl: './classes.css'
})
export class Classes {

    private service: ClassesService = inject(ClassesService);

    private auth: AuthenticationService = inject(AuthenticationService);

    private notification: NotificationService = inject(NotificationService);

    private roleUsed: SysRoleName = inject(PROVIDED_ROLE);

    searchInfoClasses: string = '';

    optionList: IctuDropdownOption<number>[] = [
        { value: 0, label: 'Dừng hoạt động' },
        { value: 1, label: 'Đang hoạt động' }
    ];

    get donViId(): number {
        return this.auth.user.donvi_id;
    }

    get userID(): number {
        return this.auth.user.id;
    }

    get userName(): string {
        return this.auth.user.username;
    }

    state: WritableSignal<AppState> = signal<AppState>('loading');

    private handelEvent: Record<DataTableEventName, (data: Class) => void> = {
        OPEN_FORM_ADD: (): void => {
            this.getToClassPlanning(0);
        },
        OPEN_FORM_UPDATE: ({ id }: Class): void => {
            this.getToClassPlanning(id);
        },
        DELETE_SINGLE_ROW: ({ id }: Class): void => {
            this.requestDeletingData([id]);
        },
        DELETE_SELECTED_ROWS: (): void => {
            const ids: number[] = this.dataTable.getSelectedData().map(({ id }: Class): number => id);
            if (ids.length) {
                this.requestDeletingData(ids);
            }
        },
        SUBMIT_FORM: (): void => {
        }
    };

    private eventObserver$: Subject<DataTableEvent<Class>> = new Subject<DataTableEvent<Class>>();

    private destroyed$: Subject<void> = new Subject<void>();

    private _temp: { paged: number; resetPaginator: boolean } = {
        paged: 1,
        resetPaginator: true
    };

    protected readonly search: WritableSignal<string> = signal<string>('');

    protected dataTable: IctuDataTable2<ClassExtended> = new IctuDataTable2<ClassExtended>();

    protected readonly disabledCheckbox: Signal<boolean> = computed((): boolean => !this.dataTable.data().some((_class: IctuDataTableRow<Class>): boolean => _class.status === 0));

    protected readonly totalChecked: Signal<boolean> = computed((): boolean => this.dataTable.data().every((_class: IctuDataTableRow<Class>): boolean => _class._ictuDataTableRowChecked));

    protected readonly someItemsChecked: Signal<boolean> = computed((): boolean => this.dataTable.data().some((_class: IctuDataTableRow<Class>): boolean => _class._ictuDataTableRowChecked));

    protected readonly partiallyChecked: Signal<boolean> = computed((): boolean => this.someItemsChecked() && !this.totalChecked());

    protected visibleUpgradeCourseClassDialog: boolean = false;

    protected readonly courseOptions: WritableSignal<IctuDropdownOption2<Course, number>[]> = signal([]);

    protected readonly classCourseUpgrade: WritableSignal<ClassExtended> = signal(null);

    private observerGetToCourseDetails: Subject<number> = new Subject<number>();

    constructor(private router: Router) {
        this.eventObserver$.pipe(
            takeUntilDestroyed(),
            debounceTime(500)
        ).subscribe(({ name, data }: DataTableEvent<Class>): void => {
            this.handelEvent[name](data);
        });

        toObservable(this.classCourseUpgrade).pipe(
            takeUntilDestroyed(),
            map((_class: ClassExtended): boolean => !!_class),
            distinctUntilChanged()
        ).subscribe((isOpened: boolean): void => {
            this.visibleUpgradeCourseClassDialog = isOpened;
        });

        this.observerGetToCourseDetails.asObservable().pipe(
            takeUntilDestroyed(),
            debounceTime(500)
        ).subscribe((course_id: number): void => {
            this.getToCourseDetails(course_id);
        })
    }

    ngOnInit(): void {
        this.loadData(1, true);
    }

    private requestDeletingData(ids: number[]): void {
        this.notification.confirmDelete(ids.length).pipe(
            filter((confirm: boolean): boolean => confirm),
            map((): IctuDeletingAnimationControl<Class> => new IctuDeletingAnimationControl(ids, this.service)),
            switchMap((deleteController: IctuDeletingAnimationControl<Class>): Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting(deleteController.progress);
            })
        ).subscribe({
            next: (success: boolean): void => {
                if (success) {
                    this.notification.toastSuccess('Xóa thành công');
                }
                this.loadData(1, true);
            },
            error: (): void => {
                this.notification.toastError('Xóa thất bại');
            }
        });
    }

    private loadData(paged: number = 1, resetPaginator: boolean = true): void {
        this.state.set('loading');
        this._temp = { paged, resetPaginator };
        this.loadClasses(paged).pipe(
            takeUntil(this.destroyed$),
            map((response: DtoObject<Class[]>): DtoObject<ClassExtended[]> => this.class2ClassExtended(response))
        ).subscribe({
            next: (response: DtoObject<ClassExtended[]>): void => {
                this.dataTable.fillRawData(response, { paged, resetPaginator });
                this.state.set('success');
            },
            error: (): void => {
                this.state.set('error');
            }
        });
    }

    private loadClasses(paged: number): Observable<DtoObject<Class[]>> {
        const conditions: IctuConditionParam[] = [
            { conditionName: 'parent_id', value: '0', condition: IctuQueryCondition.equal },
            { conditionName: 'donvi_id', value: this.donViId.toString(10), condition: IctuQueryCondition.equal, orWhere: 'and' }
        ];
        if (this.searchInfoClasses != '') {
            conditions.push({ conditionName: 'name', value: `%${this.searchInfoClasses}%`, condition: IctuQueryCondition.like });
        }
        const queryParams: IctuQueryParams = {
            limit: this.dataTable.paginator.rows(),
            paged,
            order: 'ASC',
            orderby: 'name',
            with: 'teachers,assistants,class_sessions,course'
        };
        return this.service.query(conditions, queryParams);
    }

    private class2ClassExtended(response: DtoObject<Class[]>): DtoObject<ClassExtended[]> {
        return {
            ...response, data: response.data.map((_class: Class): ClassExtended => {
                const completed: number = _class.class_sessions.filter((session: ClassSession): boolean => session.status === 2).length;
                return {
                    ..._class,
                    _totalLessons: (isArray(_class.curriculum) ? _class.curriculum : []).length,
                    _progress: _class.class_sessions.length ? Math.floor((completed / _class.class_sessions.length) * 100) : 0,
                    _isAllLessonCompleted: _class.class_sessions.length > 0 && completed === _class.class_sessions.length
                };
            })
        }
    }

    deleteRow(data: Class): void {
        this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
    }

    deleteSelectedRows(): void {
        this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
    }

    protected btnGetToCourseDetails({ course_id }: Class): void {
        this.observerGetToCourseDetails.next(course_id);
    }

    protected editRow(data: Class): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
    }

    protected reload(event: MouseEvent): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        this.loadData(this._temp.paged, this._temp.resetPaginator);
    }

    protected addNewItem(): void {
        this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
    }

    protected submitForm(): void {
        this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
    }

    onChangePage(paged: number): void {
        this.loadData(paged, false);
    }

    onSearchData(): void {
        this.loadData(1, true);
    }

    protected getToClassPlanning(class_id: number): void {
        const _hashcode: ClassPlanningCommand = {
            classId: class_id,
            role: this.roleUsed,
            userId: this.auth.user.id
        };
        void this.router.navigate(['class-planning'], {
            queryParams: {
                hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
                previewBy: Helper.removeAccents(this.auth.user.display_name)
            }
        });
    }

    protected getToCourseDetails(course_id: number): void {
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

    protected avoidCloseMenuByClicking(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    protected btnCreateClassLessons(classObject: ClassExtended): void {
        this.classCourseUpgrade.set(classObject);
    }

    protected closeUpgradeCourseClassPanel(dirty: boolean): void {
        this.visibleUpgradeCourseClassDialog = false;
        if (dirty) {
            setTimeout((): void => this.reload(null), 500);
        }
        this.classCourseUpgrade.set(null);
    }

    getToCourseOverView(item: ClassExtended): void {
        const _hashcode: CourseRoutingOverview = {
            userId: this.auth.user.id,
            course_id: item.course_id,
            class_id: item.id
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
