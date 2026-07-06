import { Component, inject, input, InputSignal, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { DataTableEvent, DataTableEventName, IctuDataTable } from '@app/models/datatable';
import { HocSinh } from '@app/models/hoc-sinh';
import { AuthenticationService } from '@app/services/authentication.service';
import { HocSinhSearchInfo, HocSinhService } from '@app/services/hoc-sinh.service';
import { forkJoin, map, merge, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckbox } from "@angular/material/checkbox";
import { IctuPaginatorComponent } from "@app/theme/components/ictu-paginator/ictu-paginator.component";
import { MatMenuModule } from "@angular/material/menu";
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { MatButton } from '@angular/material/button';
import { StudentFee } from '@app/models/student-fee';
import { StudentFeeSearchInfo, StudentFeeService } from '@app/services/student-fee.service';
import { TooltipModule } from 'primeng/tooltip';
import { IctuFormControl2 } from '@app/models/ictu-form-control';
import { Drawer } from 'primeng/drawer';
import { NotificationService } from '@app/services/notification.service';
import { Course } from '@app/models/course';
import { CoursesService } from '@app/services/course.service';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { ClassesService } from '@app/services/classes.service';
import { Class } from '@app/models/class';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { HocSinhLopHocService } from '@app/services/hoc-sinh-lop-hoc.service';
import { Select } from "primeng/select";
import { DatePicker } from "primeng/datepicker";
import { Editor, NgxEditorComponent, NgxEditorMenuComponent, Toolbar } from 'ngx-editor';
import { HelperClass } from '@app/utilities/helper';
import { IctuDropdownField, IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { IctuDropdownOptionMapPipe } from '@app/pipes/ictu-dropdown-option-map.pipe';
import { ClassSessionService } from '@app/services/class-session.service';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { DiemDanh } from '@app/models/diem-danh';
import { ClassSession } from '@app/models/class-session';
import { SysRoleName } from '@app/models/role';
import { PhuHuynh } from '@app/models/phu-huynh';
import { HocSinhLopHoc } from '@app/models/hoc-sinh-lop-hoc';
import { PhuHuynhService } from '@app/services/phu-huynh.service';
import { Dialog } from "primeng/dialog";
import { InputNumberModule } from 'primeng/inputnumber';
import { FormatVndPipe } from '@app/pipes/format-vnd.pipe';
type Mode = 'default' | 'student_fee';
type ViewModeType = 'default' | 'class' | 'course';
interface HocSinhExtend extends HocSinh {
  student_fee: StudentFee[];
  student_fee_current: StudentFee;
}
interface DiemDanhExtend extends DiemDanh {
  class_session: Pick<ClassSession, 'id' | 'topic' | 'title' | 'type' | 'course_id'>,
}

@Component({
  selector: 'app-accountant-student-fee',
  imports: [LoadingProgressComponent,
    FormsModule,
    IctuPaginatorComponent,
    MatMenuModule,
    CommonModule,
    InputText,
    ButtonModule,
    MatButton,
    TooltipModule,
    Drawer,
    ReactiveFormsModule,
    Select,
    DatePicker,
    NgxEditorMenuComponent,
    NgxEditorComponent,
    IctuDropdownOptionMapPipe,
    Dialog,
    InputNumberModule,
    FormatVndPipe
  ],
  templateUrl: './accountant-student-fee.component.html',
  styleUrl: './accountant-student-fee.component.css',
})

export default class AccountantStudentFeeComponent implements OnInit, OnDestroy {
  dataTable: IctuDataTable<HocSinhExtend> = new IctuDataTable<HocSinhExtend>();

  dataTableStudentFee: IctuDataTable<StudentFee> = new IctuDataTable<StudentFee>();

  private studentFeeService: StudentFeeService = inject(StudentFeeService);

  private phuHuynhservice: PhuHuynhService = inject(PhuHuynhService);

  visibleDialogPhuHuynh: boolean = false;

  private courseService: CoursesService = inject(CoursesService);

  private notification: NotificationService = inject(NotificationService);

  private classService: ClassesService = inject(ClassesService);

  private coSoDaoTaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);

  private classStudentService: HocSinhLopHocService = inject(HocSinhLopHocService);

  private studentService: HocSinhService = inject(HocSinhService);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  private diemDanhService: DiemDanhService = inject(DiemDanhService);

  private helper = new HelperClass();

  private eventObserver$: Subject<DataTableEvent<StudentFee>> = new Subject<DataTableEvent<StudentFee>>();

  editor: Editor;
  toolbar = [
    ['bold', 'italic', 'underline'],
    ['heading', 'blockquote', 'code', 'ordered_list', 'bullet_list'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify']
  ] as Toolbar;

  allCourse: Course[] = [];

  allClass: Class[] = [];

  state: WritableSignal<AppState> = signal<AppState>('loading');

  private onDestroy$: Subject<string> = new Subject<string>();

  searchInfo: HocSinhSearchInfo = {
    search: '',
  };

  studentFeeSearchInfo: StudentFeeSearchInfo = {
    course_id: 0,
    student_id: 0,
  };

  get donviId(): number {
    return this.auth.user.donvi_id;
  }

  constructor() {
    this.eventObserver$
      .asObservable()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(
        ({
          name,
          data,
        }: DataTableEvent<StudentFee>): void =>
          this.handelEvent[name](data)
      );
  }

  private auth: AuthenticationService = inject(AuthenticationService);

  modeState: WritableSignal<Mode> = signal<Mode>('default');

  setMode(mode: Mode, hocsinh?: HocSinh) {
    switch (mode) {
      case 'default':
        this.modeState.set('default');
        break;
      case 'student_fee':
        this.studentSelect.set(hocsinh);
        this.modeState.set('student_fee');
        this.loadStudentFeeStudent(1, true);
        break;
    }
  }

  studentSelect: WritableSignal<HocSinh> = signal(null);

  listPhuHuynh: PhuHuynh[] = [];

  phuHuynhManager: PhuHuynh;

  stateDialog: WritableSignal<AppState> = signal<AppState>('loading');

  readonly viewModeType: WritableSignal<ViewModeType> = signal<ViewModeType>('default');

  private fb: FormBuilder = inject(FormBuilder);

  readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

  formField(path: keyof StudentFee): AbstractControl {
    return this.formControl.formGroup.get(path);
  }

  default_class: Class = {
    id: -1,
    name: 'Tất cả',
    course_id: 0,
    started_date: '',
    donvi_id: 0,
    csdt_id: 0,
    code: '',
    desc: '',
    duration: 0,
    learning_mode: null as any,
    teacher_ids: [],
    assistant_ids: [],
    parent_id: 0,
    curriculum: [],
    time_slots: [],
    status: 0,
    total_student: 0,
    sync_required: 0,
    class_sessions: [],
    is_deleted: 0,
    deleted_by: 0,
    created_by: 0,
    updated_by: 0,
    created_at: '',
    updated_at: ''
  };

  default_course: Partial<Course> = {
    id: -1,
    title: 'Tất cả',
  };

  readonly listAgent: WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>([]);

  readonly activeAgent: WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>(null);

  readonly listClass: WritableSignal<Partial<Class[]>> = signal<Partial<Class[]>>([]);

  readonly activeClass: WritableSignal<Partial<Class>> = signal<Partial<Class>>(this.default_class);

  readonly listCourse: WritableSignal<Partial<Course[]>> = signal<Partial<Course[]>>([]);

  readonly activeCourse: WritableSignal<Partial<Course>> = signal<Partial<Course>>(this.default_course);

  private readonly loadDataObserver: Subject<void> = new Subject<void>();

  readonly allDiemDanhNotFee: WritableSignal<DiemDanh[]> = signal<DiemDanh[]>([]);

  student_fee_amount_add: number = 0;
  courseDropdownField: IctuDropdownField = new IctuDropdownField(
    this.courseService.loadOptions(this.donviId),
    'Chọn khóa học'
  );

  hocSinhSearchInfo: HocSinhSearchInfo = {
    search: ''
  };

  formControl: IctuFormControl2<StudentFee> =
    new IctuFormControl2<StudentFee>({
      dropdownFields: [
        this.courseDropdownField,
      ],
      formGroup: this.fb.group({
        id: [0],
        donvi_id: [this.donviId],
        code: ['', [Validators.required]],
        student_id: [0],
        course_id: [0],
        class_id: [0, [Validators.required, Validators.min(1)]],
        price: [0, [Validators.required, Validators.min(1)]],
        total_price: [0],
        discount: [0],
        amount: [0, [Validators.required, Validators.min(1)]],
        total_amount: [0, [Validators.required, Validators.min(1)]],
        amount_left: [0],
        used: [0],
        desc: [''],
        payment_date: ['', [Validators.required]],
        effective_date: ['', [Validators.required]],
        params: [''],

      }),
      objectName: 'học phí',
      drawer: this.drawer,
    });

  private handelEvent: Record<
    DataTableEventName,
    (data: StudentFee) => void
  > = {
      OPEN_FORM_ADD: (): void => {
        this.formControl.formGroup.reset({
          id: 0,
          code: '',
          donvi_id: this.donviId,
          student_id: this.studentSelect()?.id || 0,
          course_id: 0,
          class_id: this.activeClass()?.id || 0,
          price: 0,
          total_price: 0,
          discount: 0,
          amount: 0,
          total_amount: 0,
          used: 0,
          desc: '',
          payment_date: new Date(),
          effective_date: new Date(),
          params: '',
        });
        this.setValueCourseID(this.activeClass().id);

        this.formControl.openFormAdd();
      },
      OPEN_FORM_UPDATE: (data: StudentFee): void => {
        this.formControl.formGroup.reset({
          id: data.id,
          code: data.code,
          donvi_id: data.donvi_id,
          student_id: data.student_id,
          course_id: data.course_id,
          class_id: data.class_id,
          total_price: data.total_price,
          discount: data.discount,
          price: data.price,
          amount: data.amount,
          total_amount: data.total_amount,
          used: data.used,
          desc: data.desc,
          payment_date: new Date(data.payment_date),
          effective_date: data.effective_date ? new Date(data.effective_date) : null,
          params: data.params,
        });
        this.formControl.openFormEdit(data);
      },
      DELETE_SINGLE_ROW: ({ id }: StudentFee): void => {
      },
      DELETE_SELECTED_ROWS: (): void => {
      },
      SUBMIT_FORM: (): void => {
        let info: Partial<StudentFee> = {
          donvi_id: this.formField('donvi_id').value,
          code: this.formField('code').value,
          id: this.formField('donvi_id').value,
          student_id: this.formField('student_id').value,
          course_id: this.formField('course_id').value,
          class_id: this.formField('class_id').value,
          total_price: this.formField('total_price').value,
          discount: this.formField('discount').value,
          price: this.formField('price').value,
          total_amount: this.formField('total_amount').value,
          desc: this.formField('desc').value,
          payment_date: this.helper.formatSQLDate(this.formField('payment_date').value),
          effective_date: this.helper.formatSQLDate(this.formField('effective_date').value),
          // params: this.formField('params').value,
        };

        if (this.formControl.isFormAdd) {
          info.amount = this.formField('amount').value;
        }
        const message: string = this.formControl.isFormAdd
          ? 'Thêm mới thành công'
          : 'Cập nhật thành công';
        const messageError: string = this.formControl.isFormAdd
          ? 'Thêm mới không thành công'
          : 'Cập nhật không thành công';
        const request: Observable<any> = this.formControl.isFormAdd
          ? this.studentFeeService.create(info)
          : this.studentFeeService.update(this.formControl.object.id, info);
        this.formControl.submit(request).subscribe({
          next: (): void => {
            this.notification.toastSuccess(
              message,
              'Thông báo'
            );
            if (this.formControl.isFormAdd) {
              this.formControl.formGroup.reset({
                id: 0,
                donvi_id: this.donviId,
                student_id: 0,
                course_id: 0,
                class_id: 0,
                price: 0,
                amount: 0,
                total_amount: 0,
                desc: '',
                payment_date: new Date(),
                effective_date: new Date(),
                params: '',
              });
            } else {
              this.formControl.closeForm();
            }
          },
          error: (): void => {
            this.notification.toastError(
              messageError,
              'Thông báo'
            );
          },
        });
      }
    };

  onDrawerHide(): void {
    this.student_fee_amount_add = 0;
    if (this.formControl.submitted) {
      this.loadStudentFeeStudent(this.dataTableStudentFee.paginator.paged(), false);
      this.loadData(this.dataTable.paginator.paged(), false, false);
    }
  }

  onChangeCourse(): void {
    this.loadAllDiemDanhNotFeeByCourseID(this.studentSelect()?.id ?? -1);
  }

  ngOnInit(): void {
    this.editor = new Editor();
    this.loadData(1, true, true);
  }


  // preload(): Observable<Course[]> {
  //   this.state.set('loading');
  //   return this.allCourse.length
  //     ? of(this.allCourse)
  //     : this.courseService
  //       .query(
  //         [

  //         ],
  //         { include: this.donviId, include_by: 'donvi_id', limit: -1, paged: 1 }
  //       )
  //       .pipe(
  //         map((res: DtoObject<Course[]>): Course[] => {
  //           this.allCourse = res.data;
  //           return this.allCourse;
  //         })
  //       );
  // }


  private loadAgent(): Observable<CoSoDaoTao[]> {
    const conditions: IctuConditionParam[] = [];
    const queryParams: IctuQueryParams = { limit: -1, paged: 1, include: this.donviId, include_by: 'donvi_id' };
    return this.listAgent().length ? of(this.listAgent()) : this.coSoDaoTaoService.query(conditions, queryParams).pipe(
      map((response: DtoObject<CoSoDaoTao[]>): CoSoDaoTao[] => {
        if (response.data.length) {
          this.listAgent.set(response.data);
          this.activeAgent.set(response.data[0]);
          return response.data;
        }
        else {
          return [];
        }
      })
    )
  }

  updateCourseIDAll(): void {
    this.diemDanhService.query([{
      conditionName: 'course_id',
      condition: IctuQueryCondition.equal,
      value: '0',
    }], { limit: -1, with: 'class_session', include: this.donviId, include_by: 'donvi_id' }).pipe(switchMap((res: DtoObject<DiemDanhExtend[]>) => {
      return forkJoin(
        res.data
          .filter(item => item.class_session?.course_id && item.class_session.course_id != 0)
          .map(item => {
            const info: Partial<DiemDanh> = {
              course_id: item.class_session?.course_id ?? 0,
            };

            return this.diemDanhService.update(item.id, info);
          })
      );
    })).subscribe({
      next: (value) => {
        this.notification.toastSuccess('Cập nhật course_id thành công', 'Thông báo');
      },
      error: (err) => {
        this.notification.toastError('Cập nhật course_id không thành công', 'Thông báo');
      }
    })
  }


  loadAllDiemDanhNotFeeByCourseID(hocsinh_id: number): void {

    this.allDiemDanhNotFee.set([]);
    this.formControl.state.set('LOADING');
    this.diemDanhService.query([{
      conditionName: 'course_id',
      condition: IctuQueryCondition.equal,
      value: this.formField('course_id').value,
      orWhere: 'and'
    }, {
      conditionName: 'hocsinh_id',
      condition: IctuQueryCondition.equal,
      value: hocsinh_id.toString(),
      orWhere: 'and'
    },
    {
      conditionName: 'student_fee_id',
      condition: IctuQueryCondition.equal,
      value: '0',
      orWhere: 'and'
    }, {
      conditionName: 'created_at',
      condition: IctuQueryCondition.greaterThanToEqualsTo,
      value: this.helper.formatSQLDate(this.formField('effective_date').value),
      orWhere: 'and'
    },
    {
      conditionName: 'status',
      condition: IctuQueryCondition.equal,
      value: 'PRESENT',
      orWhere: 'and'
    },],
      { limit: -1, paged: 1, include: this.donviId, include_by: 'donvi_id' }).pipe((map((res) => res.data))).subscribe({
        next: (res) => {

          this.allDiemDanhNotFee.set(res);
          this.formControl.state.set('READY');
        },
        error: (err) => {
          this.allDiemDanhNotFee.set([]);
          this.formControl.state.set('PREPARATION_FAILED');
        }
      });

  }

  loadStudentFee(paged: number, resetPaginator: boolean): Observable<HocSinhExtend[]> {
    const conditions_hocsinh1: IctuConditionParam[] = [{
      conditionName: 'status',
      condition: IctuQueryCondition.equal,
      value: '1',
      orWhere: 'and'
    }];
    let conditions_hocsinh: IctuConditionParam[] = [];
    if (this.hocSinhSearchInfo.search) {
      conditions_hocsinh.push(...conditions_hocsinh1, {
        conditionName: 'full_name',
        value: `%${this.hocSinhSearchInfo.search}%`,
        condition: IctuQueryCondition.like,
      },);
    } else {
      conditions_hocsinh.push(...conditions_hocsinh1);
    }

    const queryParams_hocsinh: IctuQueryParams = {
      limit: 20,
      paged: paged,
      order: 'ASC',
      orderby: 'full_name',
    };
    return this.classStudentService.loadNoStop(this.activeClass()?.id ?? -1, this.donviId).pipe(
      switchMap((resClassStudent) => {
        const classStudentIds = resClassStudent.data.length ? resClassStudent.data.map(i => i.hocsinh_id).join(',') : '-1';
        if ((this.activeClass() && this.activeClass().id == -1) || this.hocSinhSearchInfo.search) {
          queryParams_hocsinh.include = this.donviId;
          queryParams_hocsinh.include_by = 'donvi_id';
        } else {
          queryParams_hocsinh.include = classStudentIds;
          queryParams_hocsinh.include_by = 'id';
        }
        return this.studentService.query(conditions_hocsinh, queryParams_hocsinh).pipe(
          switchMap((resStudent) => {
            let students = resStudent.data;
            if (resetPaginator) {
              this.dataTable.paginator.setupPaginator(resStudent);
            } else {
              this.dataTable.paginator.changePage(paged);
            }

            const queryParams: IctuQueryParams = {
              limit: -1,
              paged: 1,
              include: students.map(item => item.id).join(','),
              include_by: 'student_id',
            };

            const conditions: IctuConditionParam[] = [];

            if (this.activeClass() && this.activeClass().id != -1) {
              conditions.push({
                conditionName: 'course_id',
                condition: IctuQueryCondition.equal,
                value: this.activeClass().course_id.toString(),
                orWhere: 'and'
              });

            }

            return this.studentFeeService.query(conditions, queryParams).pipe(
              map((resStudentFee) => {
                return students.map((student): HocSinhExtend => {
                  const student_fee = resStudentFee.data.filter(f => f.student_id === student.id);
                  return {
                    ...student,
                    student_fee: student_fee,
                    student_fee_current: student_fee.length ? student_fee[student_fee.length - 1] : null,
                  };
                });

              })
            );
          })
        );
      })
    );
  }

  loadStudentFeeStudent(paged: number, resetPaginator: boolean): void {
    this.state.set('loading');
    this.studentFeeSearchInfo = { course_id: this.activeClass()?.course_id ?? 0, student_id: this.studentSelect().id };
    this.studentFeeService.load(this.studentFeeSearchInfo, this.donviId, { limit: 20, paged: paged }).pipe(
      map((res) => {
        if (resetPaginator) {
          this.dataTableStudentFee.paginator.setupPaginator(res);
        } else {
          this.dataTableStudentFee.paginator.changePage(paged);
        }
        return res.data;
      })
    ).subscribe(
      {
        next: (res) => {
          this.dataTableStudentFee.fillData(res);
          this.state.set('success');
        },
        error: (err) => {
          this.notification.toastError('Tải dữ liệu không thành công', 'Thông báo');
          this.state.set('error');
        }
      }
    );
  }

  loadData(paged: number, resetPaginator: boolean, isLoadClass?: boolean): void {
    this.state.set('loading');
    this.loadDataObserver.next();
    this.filterByAgent().pipe(
      takeUntil(merge(this.loadDataObserver, this.onDestroy$)),
      switchMap(() => forkJoin({
        classes: isLoadClass ? this.loadClass() : of(this.listClass()),
        studentFee: this.loadStudentFee(paged, resetPaginator),
      })))
      .subscribe({
        next: (res: {
          classes: Class[];
          studentFee: HocSinhExtend[];
        }): void => {
          const resultclasses = res.classes;
          if (isLoadClass) {
            resultclasses.push(this.default_class);
          }
          this.listClass.set(resultclasses);
          this.dataTable.fillData(res.studentFee);
          this.state.set('success');
        },
        error: (): void => {
          this.state.set('error');
        }
      })
  }



  loadClass(): Observable<Class[]> {
    this.state.set('loading');
    return this.classService.query([
      {
        conditionName: 'csdt_id',
        value: this.activeAgent().id.toString(),
        condition: IctuQueryCondition.equal,
        orWhere: 'and',
      }, {
        conditionName: 'status',
        value: '1',
        condition: IctuQueryCondition.equal,
        orWhere: 'and',
      },
    ], { limit: -1, paged: 1, include: this.donviId, include_by: 'donvi_id' }).pipe(map((res) => {
      return res.data;
    }))
  }


  private filterByAgent(): Observable<number> {
    if (this.activeAgent()) {
      return of(this.activeAgent().id);
    }
    else {
      if (this.listAgent().length > 0) {
        this.activeAgent.set(this.listAgent()[0]);
        return of(this.activeAgent().id);
      }
      else {
        const conditions: IctuConditionParam[] = [];
        const queryParams: IctuQueryParams = { limit: -1, paged: 1, include: this.donviId, include_by: 'donvi_id' };
        this.coSoDaoTaoService.query(conditions, queryParams).pipe(
          map((response: DtoObject<CoSoDaoTao[]>): number => {
            if (response.data.length) {
              this.listAgent.set(response.data);
              this.activeAgent.set(response.data[0]);
              return this.activeAgent().id;
            }
            else {
              return 0;
            }
          })
        )

        this.courseDropdownField.load();
        return forkJoin<
          [
            IctuDropdownOption<number>[],
            DtoObject<CoSoDaoTao[]>
          ]
        >([
          this.courseDropdownField.load(),
          this.coSoDaoTaoService.query(conditions, queryParams),
        ])
          .pipe(
            map(
              ([_, response]: [
                IctuDropdownOption<number>[],
                DtoObject<CoSoDaoTao[]>
              ]): number => {
                if (response.data.length) {
                  this.listAgent.set(response.data);
                  this.activeAgent.set(response.data[0]);
                  return this.activeAgent().id;
                }
                else {
                  return 0;
                }
              }
            )
          )
      }
    }
  }

  addNewItem(): void {
  }

  addNewItemStudentFee(): void {
    this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
  }

  editRowItemStudentFee(data: StudentFee): void {
    this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
  }

  submitFormItemStudentFee(): void {
    this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
  }

  onChangePage(paged: number): void {
    this.loadData(paged, false);
  }

  onChangePageStudentFee(paged: number): void {
    this.loadData(paged, false);
  }

  onSearchData(): void {
    this.loadData(1, true);
  }


  btnChangeAgent(agent: CoSoDaoTao): void {
    if (!this.activeAgent() || this.activeAgent().id !== agent.id) {
      this.activeAgent.set(agent);
      this.loadData(1, true, true);
    }
  }

  protected btnChangeClass(value: Class): void {
    if (!this.activeClass() || this.activeClass().id !== value.id) {
      this.activeClass.set(value);
      this.loadData(1, true, false);
    }
  }


  reload(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadData(this.dataTable.paginator.paged(), false, false);
  }

  protected btnSetViewModeType(mode: ViewModeType): void {
    this.viewModeType.set(mode);
  }


  loadPhuHuynh(row: HocSinh) {
    this.stateDialog.set('loading');
    this.listPhuHuynh = [];
    this.phuHuynhservice.load({ search: '' }, row.phuhuynh_id ?? 0, 0, {
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
            { search: '' },
            0,
            this.phuHuynhManager.id ?? 0,
            {
              limit: -1,
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
              this.stateDialog.set('success');
            },
            error: (): void => {
              this.stateDialog.set('error');
            }
          });
        }
        else {
          this.stateDialog.set('success');
        }
      },
      error: (): void => {
        this.stateDialog.set('error');
      }
    });
  }

  opendialogPhuHuynh(row: HocSinh): void {
    this.studentSelect.set(row);
    this.visibleDialogPhuHuynh = true;
    this.loadPhuHuynh(row);
  }

  onChangeClass(event: any) {
    const classId = event.value;

    this.setValueCourseID(classId);
  }

  setValueCourseID(classId: number): void {
    const selectedClass = this.listClass().find(c => c.id === classId);
    this.formField('course_id').setValue(selectedClass?.course_id ?? 0);
  }

  onChangeTotalAmount(): void {
    const total_amount = this.formField('total_amount').value;
    const student_fee = this.dataTableStudentFee.data().length
      ? this.dataTableStudentFee.data().reduce((max, cur) =>
        new Date(cur.effective_date) > new Date(max.effective_date) ? cur : max
      )
      : null
    if (student_fee && this.formControl.isFormAdd) {
      const amount = total_amount + student_fee.amount_left;
      this.formField('amount').setValue(amount);
      this.student_fee_amount_add = student_fee.amount_left
    } else {
      this.formField('amount').setValue(total_amount);
    }
  }

  ngOnDestroy(): void {
    this.onDestroy$.next('OnDestroy');
    this.onDestroy$.complete();
  }
}

