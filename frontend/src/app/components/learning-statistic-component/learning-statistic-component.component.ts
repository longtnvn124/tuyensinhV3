import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { MatMenuModule } from "@angular/material/menu";
import { IctuPaginatorComponent } from "@app/theme/components/ictu-paginator/ictu-paginator.component";
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { debounceTime, filter, forkJoin, map, merge, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { AuthenticationService } from '@app/services/authentication.service';
import { HocSinh } from '@app/models/hoc-sinh';
import { IctuDataTable2 } from '@app/models/datatable';
import { HocSinhSearchInfo, HocSinhService } from '@app/services/hoc-sinh.service';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { DatePicker } from "primeng/datepicker";
import dayjs, { Dayjs } from 'dayjs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { DiemDanh } from '@app/models/diem-danh';
import { TooltipModule } from 'primeng/tooltip';
import { Class } from '@app/models/class';
import { ClassesService } from '@app/services/classes.service';
import { HocSinhLopHocService } from '@app/services/hoc-sinh-lop-hoc.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { InputText } from 'primeng/inputtext';
import { StudentFee } from '@app/models/student-fee';
import { Helper } from '@app/utilities/helper';
import { StudentFeeDeductedService } from '@app/services/student-fee-deducted.service';
import { isTrustedHtml } from 'node_modules/ngx-editor/lib/trustedTypesUtil';
import { StudentFeeDeducted } from '@app/models/student-fee-deducted';
import { FormatVndPipe } from '@app/pipes/format-vnd.pipe';
import { NotificationService } from '@app/services/notification.service';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MatCheckbox } from "@angular/material/checkbox";
import { InputNumberModule } from 'primeng/inputnumber';
import ExcelJS, { Worksheet } from 'exceljs';
import { saveAs } from 'file-saver';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { Select } from "primeng/select";
import { NgScrollbar } from 'ngx-scrollbar';

type LearingStatisticMode = 'default' | 'detail';

export interface StudentStatistic {
  student: Pick<HocSinh, 'id' | 'avatar' | 'full_name' | 'english_name' | 'dob'>;
  student_id: number;
  total_attendance: number;
  total_present: number;
  total_absent: number;
  total_diligence: number;
  student_fee: Pick<StudentFee, 'id' | 'amount_left' | 'student_id' | 'effective_date' | 'course_id' | 'total_price' | 'total_amount' | 'class_id' | 'remaining_amount'>;
  is_diligence: boolean;
  student_fee_deducted: StudentFeeDeducted;
  amount_deducted: number;

  actual_revenue: number;
  projected_revenue: number;
}

interface ExcelCelFormat {
  order: number;
  full_name: string,
  dob: Date,
  total_present: number;
  total_absent: number;
  amount_left: number;
  total_diligence: number;
  projected_revenue: number;
  actual_revenue: number;
}


function applyBorder(cell: ExcelJS.Cell): void {
  cell.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
}

function saveAsExcelFile(buffer: any, fileName: string): void {
  const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
  saveAs(data, fileName + '_export_' + new Date().getTime() + '.xlsx');
}


interface StatisticIncome {
  projected_revenue: number;
  actual_revenue: number;
}

interface HocSinhStatistic extends HocSinh {
  student_fee: Pick<StudentFee, 'id' | 'amount_left' | 'student_id' | 'effective_date' | 'course_id' | 'total_price' | 'total_amount' | 'class_id' | 'remaining_amount'>[];
}

const getMonthBoundaryDates: (date: Dayjs | string | Date) => Date[] = (date: Dayjs | string | Date): Date[] => {
  const givenDate: Dayjs = dayjs(date);
  return [givenDate.startOf('month').toDate(), givenDate.endOf('month').toDate()];
}
@Component({
  selector: 'app-learning-statistic-component',
  imports: [LoadingProgressComponent, MatMenuModule, DatePicker, FormsModule, CommonModule, MatButton, TooltipModule, InputText, FormatVndPipe, ToggleSwitchModule, MatCheckbox, InputNumberModule, ReactiveFormsModule, Select, NgScrollbar],
  templateUrl: './learning-statistic-component.component.html',
  styleUrl: './learning-statistic-component.component.css',
})
export class LearningStatisticComponentComponent implements OnInit, OnDestroy {

  state: WritableSignal<AppState> = signal<AppState>('loading');

  private destroyed$: Subject<void> = new Subject<void>();

  readonly listAgent: WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>([]);

  readonly activeAgent: WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>(null);

  private coSoDaoTaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);

  private studentService: HocSinhService = inject(HocSinhService);

  private diemdanhService: DiemDanhService = inject(DiemDanhService);

  private classStudentService: HocSinhLopHocService = inject(HocSinhLopHocService);

  private classService: ClassesService = inject(ClassesService);

  private studentFeeDeductedService: StudentFeeDeductedService = inject(StudentFeeDeductedService);

  private notificationService: NotificationService = inject(NotificationService);

  protected readonly rangeDates: WritableSignal<Date[]> = signal(getMonthBoundaryDates(new Date()));

  private fileName: Signal<string> = computed((): string => this.rangeDates().length ? Helper.removeAccents(`${this.activeClass()?.name} Từ ngày ${dayjs(this.rangeDates()[0]).format('DD/MM/YYYY')} đến ngày ${dayjs(this.rangeDates()[1]).format('DD/MM/YYYY')}`) : '');

  is_diligence: boolean = true;

  _search: string = '';

  readonly dateStart: Signal<string> = computed((): string => {
    return this.rangeDates()[0] ? [dayjs(this.rangeDates()[0]).format('YYYY-MM-DD'), '00:00:00'].join(' ') : '';
  });

  readonly dateEnd: Signal<string> = computed((): string => {
    return this.rangeDates()[1] ? [dayjs(this.rangeDates()[1]).format('YYYY-MM-DD'), '23:59:59'].join(' ') : '';
  });

  readonly activeAgentName: Signal<string> = computed((): string => this.activeAgent() ? this.activeAgent().ten : 'Chọn cơ sở đào tạo');

  default_class: Class = {
    id: -1,
    name: 'Chọn lớp học',
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

  readonly listClass: WritableSignal<Partial<Class[]>> = signal<Partial<Class[]>>([]);

  readonly activeClass: WritableSignal<Partial<Class>> = signal<Partial<Class>>(this.default_class);

  mode: WritableSignal<LearingStatisticMode> = signal<LearingStatisticMode>('default');

  diemDanhList: DiemDanh[] = [];

  setMode(mode: LearingStatisticMode, studentStatistic?: StudentStatistic) {
    switch (mode) {
      case 'default':
        this.mode.set('default');
        break;
      case 'detail':
        this.studentStatistic.set(studentStatistic);
        this.mode.set('detail');
        break;
    }
  }

  private readonly loadDataObserver: Subject<void> = new Subject<void>();

  private auth: AuthenticationService = inject(AuthenticationService);

  public dataTable: IctuDataTable2<StudentStatistic> = new IctuDataTable2<StudentStatistic>();


  public dataTable_temp: IctuDataTable2<StudentStatistic> = new IctuDataTable2<StudentStatistic>();

  public dataTable_submit: IctuDataTable2<StudentStatistic> = new IctuDataTable2<StudentStatistic>();

  public studentStatistic: WritableSignal<StudentStatistic> = signal(null);

  readonly attendanceStudent: Signal<DiemDanh[]> = computed((): DiemDanh[] => this.diemDanhList.filter((item) => item.hocsinh_id == this.studentStatistic().student_id));

  readonly studentStatistic_name: Signal<string> = computed((): string => this.studentStatistic() ? this.studentStatistic().student.full_name : '');

  public classStatisticIncome: WritableSignal<StatisticIncome> = signal({ actual_revenue: 0, projected_revenue: 0 });

  private exportingObserver: Subject<void> = new Subject<void>();

  diligence_options: IctuDropdownOption<number>[] = [
    { value: 1, label: 'Đủ chuyên cần' },
    { value: 2, label: 'Thiếu chuyên cần' },
  ] as const;

  active_diligence_option: number = 0;

  hocSinhSearchInfo: HocSinhSearchInfo = {
    search: ''
  };

  class_id_select: number = 0;

  get donViID(): number {
    return this.auth.user.donvi_id;
  }

  private _changeActiveAgent(agent: CoSoDaoTao): void {
    this.activeAgent.set(agent);
  }

  protected btnChangeAgent(agent: CoSoDaoTao): void {
    if (!this.activeAgent() || this.activeAgent().id !== agent.id) {
      this._changeActiveAgent(agent);
      this.listClass.set([]);
      this.activeClass.set(this.default_class);
      this.loadData(1, true, true);
    }
  }


  constructor() {
    merge<[Date[]]>(
      toObservable(this.rangeDates).pipe(
        filter((rangeDates: Date[]): boolean => rangeDates.every(Boolean))
      )
    ).pipe(
      takeUntilDestroyed(),
      debounceTime(100),
    ).subscribe((): void => {
      this.loadData(1, true, true);
    });
    this.exportingObserver.asObservable().pipe(
      takeUntilDestroyed(),
      debounceTime(100)
    ).subscribe((): void => {
      const excel = this.dataTable.data().filter((item) => item._ictuDataTableRowChecked);
      void this.exportTOExcel(excel);
      return;
    })
  }

  private _changeActiveClass(value: Class): void {
    this.activeClass.set(value);
  }

  protected btnChangeClass(value: Class): void {
    if (!this.activeClass() || this.activeClass().id !== value.id) {
      this._changeActiveClass(value);
      this.loadData(1, true);
    }
  }

  ngOnInit(): void {
    // this.loadData(1, true, true);
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
        const queryParams: IctuQueryParams = { limit: -1, paged: 1, include: this.donViID, include_by: 'donvi_id' };
        return this.coSoDaoTaoService.query(conditions, queryParams).pipe(
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
      }
    }
  }

  loadAttendance(paged: number, resetPaginator: boolean, is_setlimit: boolean): Observable<StudentStatistic[]> {
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
        // orWhere: 'or',
      },);
      // conditions_hocsinh.push(...conditions_hocsinh1, {
      //   conditionName: 'code',
      //   value: `%${this.hocSinhSearchInfo.search}%`,
      //   condition: IctuQueryCondition.like,
      // });
    } else {
      conditions_hocsinh.push(...conditions_hocsinh1);
    }

    const queryParams_hocsinh: IctuQueryParams = {
      limit: -1,
      paged: paged,
      order: 'ASC',
      orderby: 'full_name',
      with: 'student_fee'
    };
    // is_setlimit ? 20 :
    return this.classStudentService.load(this.activeClass()?.id ?? -1, this.donViID).pipe(
      switchMap((resClassStudent) => {
        const classStudentIds = resClassStudent.data.length ? resClassStudent.data.map(i => i.hocsinh_id).join(',') : '-1';
        if ((this.activeClass() && this.activeClass().id == -1) || this.hocSinhSearchInfo.search) {
          queryParams_hocsinh.include = this.donViID;
          queryParams_hocsinh.include_by = 'donvi_id';
        } else {
          queryParams_hocsinh.include = classStudentIds;
          queryParams_hocsinh.include_by = 'id';
        }
        return this.studentService.query(conditions_hocsinh, queryParams_hocsinh).pipe(
          switchMap((resStudent) => {

            let students = resStudent.data as HocSinhStatistic[];
            if (resetPaginator) {
              this.dataTable.paginator.setupPaginator(resStudent);
            } else {
              this.dataTable.paginator.changePage(paged);
            }

            const queryParams: IctuQueryParams = {
              limit: -1,
              paged: 1,
              include: students.map(item => item.id).join(','),
              include_by: 'hocsinh_id',
              with: 'class_session,class',
              select: 'class_session_id,class_id,course_id,status,hocsinh_id,student_fee_id'
            };

            const conditions: IctuConditionParam[] = [
              {
                conditionName: 'created_at',
                condition: IctuQueryCondition.greaterThanToEqualsTo,
                value: this.dateStart(),
                orWhere: 'and'
              },
              {
                conditionName: 'created_at',
                condition: IctuQueryCondition.lessThanOrEqualsTo,
                value: this.dateEnd(),
                orWhere: 'and'
              }
            ];
            if (this.activeClass() && this.activeClass().id != -1) {
              conditions.push({
                conditionName: 'course_id',
                condition: IctuQueryCondition.equal,
                value: this.activeClass().course_id.toString(),
                orWhere: 'and'
              });
            }
            const student_fee_ids = students.map(item => {
              const fees = item.student_fee.filter(f => f.course_id === this.activeClass().course_id);
              if (!fees.length) return null;
              const latest = fees.reduce((max, cur) =>
                new Date(cur.effective_date) > new Date(max.effective_date) ? cur : max
              );
              return latest.id;
            })
              .filter(id => id !== null)
              .join(',') || '-1';
            return forkJoin({
              diem_danh: this.diemdanhService.query(conditions, queryParams),
              student_fee_deducted: this.studentFeeDeductedService.query([
                {
                  conditionName: 'date',
                  value: dayjs(this.dateEnd()).format('MM-YYYY'),
                  condition: IctuQueryCondition.equal,
                  orWhere: 'and'
                }
              ], { limit: -1, paged: 1, include: student_fee_ids, include_by: 'student_fee_id' })
            }).pipe(
              map((res) => {
                this.diemDanhList = res.diem_danh.data;
                return students.map((student): StudentStatistic => {
                  const attendance = this.diemDanhList.filter(d => d.hocsinh_id === student.id);
                  const student_fee = student.student_fee.filter((item) => item.course_id === this.activeClass().course_id)?.length
                    ? student.student_fee.filter((item) => item.course_id === this.activeClass().course_id).reduce((max, cur) =>
                      new Date(cur.effective_date) > new Date(max.effective_date) ? cur : max
                    )
                    : { id: 0, amount_left: 0, student_id: student.id, effective_date: '', course_id: 0, total_price: 0, total_amount: 0, class_id: 0, remaining_amount: 0 };


                  const student_fee_deducted = res.student_fee_deducted.data.find(item =>
                    item.student_fee_id == student_fee.id &&
                    new Date(item.created_at).getMonth() === new Date(this.dateEnd()).getMonth() &&
                    new Date(item.created_at).getFullYear() === new Date(this.dateEnd()).getFullYear()
                  );
                  const total_diligence = attendance.filter(item => item.status == 'PRESENT' || item.status == 'LATE').length;
                  const actual_revenue = (student_fee.total_price / student_fee.total_amount) * total_diligence;
                  const projected_revenue = total_diligence < this.activeAgent().diligence ? (student_fee.total_price / student_fee.total_amount) * this.activeAgent().diligence : (student_fee.total_price / student_fee.total_amount) * total_diligence;
                  return {
                    student: {
                      id: student.id,
                      avatar: student.avatar,
                      full_name: student.full_name,
                      english_name: student.english_name,
                      dob: student.dob
                    },
                    student_id: student.id,
                    total_attendance: attendance.length,
                    total_present: attendance.filter(item => item.status == 'PRESENT' || item.status == 'LATE').length,
                    total_absent: attendance.filter(item => item.status != 'PRESENT' && item.status != 'LATE').length,
                    total_diligence: total_diligence - this.activeAgent().diligence,
                    student_fee: student_fee,
                    is_diligence: total_diligence - this.activeAgent().diligence < 0 ? false : true,
                    // is_diligence: student_fee_deducted && student_fee_deducted.amount != 0 ? true : false, áp dụng chuyên cần hay không(cũ)
                    student_fee_deducted: student_fee_deducted,
                    amount_deducted: student_fee_deducted ? student_fee_deducted.amount : 0,
                    actual_revenue: isNaN(actual_revenue) ? 0 : actual_revenue,
                    projected_revenue: isNaN(projected_revenue) ? 0 : projected_revenue
                  };
                });

              })
            );
          })
        );
      })
    );
  }


  loadData(paged: number, resetPaginator: boolean, isLoadClass?: boolean): void {
    this.state.set('loading');
    this.loadDataObserver.next();
    this.filterByAgent().pipe(
      takeUntil(merge(this.loadDataObserver, this.destroyed$)),
      switchMap(() => forkJoin({
        classes: isLoadClass ? this.loadClass() : of(this.listClass()),
        studentStatistic: this.loadAttendance(paged, resetPaginator, true),
      })))
      .subscribe({
        next: (res: {
          classes: Class[];
          studentStatistic: StudentStatistic[];
        }): void => {
          const resultclasses = res.classes;
          // if (isLoadClass) {
          //   resultclasses.push(this.default_class);
          // }
          this.listClass.set(resultclasses);
          this.dataTable_temp.fillData(res.studentStatistic);
          this.dataTable.fillData(res.studentStatistic);


          this.setRevenue();
          this.state.set('success');
        },
        error: (err): void => {
          console.error(err);
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
    ], { limit: -1, paged: 1, include: this.donViID, include_by: 'donvi_id' }).pipe(map((res) => {
      return res.data;
    }))
  }

  setRevenue(): void {
    const totalProjectedRevenue = this.dataTable.data().reduce((sum, item) => sum + (item.projected_revenue || 0), 0);
    const totalActualRevenue = this.dataTable.data().reduce((sum, item) => sum + (item.actual_revenue || 0), 0);
    this.classStatisticIncome.set({ actual_revenue: totalActualRevenue, projected_revenue: totalProjectedRevenue });
  }

  onSearchData(): void {
    this.loadData(1, true);
  }

  onChangeDiligenceOption(): void {
    if (this.active_diligence_option == 1) {
      this.dataTable.fillData(this.dataTable_temp.data().filter((item) => item.is_diligence));
    } else if (this.active_diligence_option == 2) {

      this.dataTable.fillData(this.dataTable_temp.data().filter((item) => !item.is_diligence));
    } else {
      this.dataTable.fillData(this.dataTable_temp.data());
    }
    this.setRevenue();
  }

  caculateDiligence(student_fee: Pick<StudentFee, 'id' | 'amount_left' | 'total_price' | 'total_amount'>): number {
    const result = (student_fee.total_price / student_fee.total_amount) * student_fee.amount_left;
    return isNaN(result) ? 0 : result;
  }

  submitDiligence(studentStatistic: StudentStatistic): void {
    if (studentStatistic.student_fee.id != 0 && -studentStatistic.amount_deducted <= 0) {
      const createInfo: Partial<StudentFeeDeducted> = {
        student_fee_id: studentStatistic.student_fee.id,
        donvi_id: this.donViID,
        amount: studentStatistic.amount_deducted,
        class_id: studentStatistic.student_fee.class_id,
        student_id: studentStatistic.student_id,
        course_id: studentStatistic.student_fee.course_id,
        date: dayjs(this.dateEnd()).format('MM-YYYY'),
      }
      this.studentFeeDeductedService.create(createInfo).subscribe({
        next: (res) => {
          this.notificationService.toastSuccess('Cập nhật thành công');
          this.loadData(this.dataTable.paginator.paged(), false);
        },
        error: (err) => {
          this.notificationService.toastError('Cập nhật thất bại');
        }
      });
    } else {

      this.notificationService.toastError('Học sinh chưa được đóng học phí', 'Thông báo');
    }
  }

  submitDiligenceSelect(): void {
    const requests = this.dataTable.data().filter((item) => item._ictuDataTableRowChecked).map((studentStatistic: StudentStatistic) => {
      if (studentStatistic.student_fee.id != 0 && -studentStatistic.amount_deducted < 0) {
        const createInfo: Partial<StudentFeeDeducted> = {
          student_fee_id: studentStatistic.student_fee.id,
          donvi_id: this.donViID,
          amount: studentStatistic.amount_deducted,
          class_id: studentStatistic.student_fee.class_id,
          student_id: studentStatistic.student_id,
          course_id: studentStatistic.student_fee.course_id,

          date: dayjs(this.dateEnd()).format('MM-YYYY'),
        };
        return this.studentFeeDeductedService.create(createInfo);
      }
      return of(null);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.notificationService.toastSuccess('Cập nhật thành công');
        this.loadData(this.dataTable.paginator.paged(), false);
      },
      error: (err) => {
        this.notificationService.toastError('Cập nhật thất bại');
      }
    });
  }

  // disabledSubmitDiligenceAll(studentStatistic: StudentStatistic): boolean {
  //   return (studentStatistic.student_fee.id != 0 && studentStatistic.total_diligence < 0)
  //     || (studentStatistic.student_fee.id != 0 && studentStatistic.total_diligence >= 0 &&
  //       studentStatistic.student_fee_deducted && studentStatistic.student_fee_deducted.amount != 0 && (-studentStatistic.student_fee_deducted.amount != studentStatistic.total_diligence));
  // }

  disabledSubmitDiligenceAll(studentStatistic: StudentStatistic): boolean {
    return ((studentStatistic.student_fee.id != 0 && studentStatistic.student_fee_deducted && studentStatistic.amount_deducted != 0
      && -studentStatistic.amount_deducted != studentStatistic.total_diligence)
      || (studentStatistic.student_fee.id != 0 && !studentStatistic.student_fee_deducted && studentStatistic.total_diligence < 0));
  }

  submitDiligenceAll(): void {
    this.state.set('loading');
    this.filterByAgent().pipe(
      takeUntil(merge(this.loadDataObserver, this.destroyed$)),
      switchMap(() => this.loadAttendance(1, true, false)))
      .subscribe({
        next: (res) => {
          this.dataTable_submit.fillData(res);
          const requests = this.dataTable_submit.data().map((studentStatistic: StudentStatistic) => {
            if (this.disabledSubmitDiligenceAll(studentStatistic)) {
              const createInfo: Partial<StudentFeeDeducted> = {
                student_fee_id: studentStatistic.student_fee.id,
                donvi_id: this.donViID,
                amount: studentStatistic.total_diligence > 0 ? 0 : studentStatistic.total_diligence != -studentStatistic.amount_deducted ? Math.abs(studentStatistic.total_diligence) : studentStatistic.amount_deducted,
                class_id: studentStatistic.student_fee.class_id,
                student_id: studentStatistic.student_id,
                course_id: studentStatistic.student_fee.course_id,

                date: dayjs(this.dateEnd()).format('MM-YYYY'),
              };
              return this.studentFeeDeductedService.create(createInfo);
            }
            return of(null);
          });

          forkJoin(requests).subscribe({
            next: () => {
              this.notificationService.toastSuccess('Cập nhật thành công');
              this.loadData(this.dataTable.paginator.paged(), false);
            },
            error: (err) => {
              this.notificationService.toastError('Cập nhật thất bại');
            }
          });
        },
        error: (err): void => {
          console.error(err);
          this.state.set('error');
        }
      })

  }



  onToggleDiligence(event: any, studentStatistic: StudentStatistic) {
    console.log('Giá trị mới:', event.checked);
    const createInfo: Partial<StudentFeeDeducted> = {
      student_fee_id: studentStatistic.student_fee.id,
      donvi_id: this.donViID,
      amount: 0,
      class_id: studentStatistic.student_fee.class_id,
      student_id: studentStatistic.student_id,
      course_id: studentStatistic.student_fee.course_id,
      date: dayjs(this.dateEnd()).format('MM-YYYY'),
    }
    this.studentFeeDeductedService.create(createInfo).subscribe({
      next: (res) => {
        this.notificationService.toastSuccess('Cập nhật thành công');
        this.loadData(this.dataTable.paginator.paged(), false);
      },
      error: (err) => {
        this.notificationService.toastError('Cập nhật thất bại');
      }
    })
  }

  onChangePage(paged: number): void {
    this.loadData(paged, false);
  }

  reload(event: MouseEvent): void {
    this.loadData(this.dataTable.paginator.paged(), false);
    event.preventDefault();
    event.stopPropagation();
  }

  private async exportTOExcel(statistics: StudentStatistic[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet: Worksheet = workbook.addWorksheet('Danh sách');
    worksheet.columns = [
      { header: 'STT', key: 'order', width: 5 },
      { header: 'Họ và tên', key: 'full_name', width: 25 },
      { header: 'Ngày sinh', key: 'dob', width: 15 },
      { header: 'Đi học', key: 'total_present', width: 15 },
      { header: 'Nghỉ học', key: 'total_absent', width: 15 },
      { header: 'Còn lại', key: 'amount_left', width: 15 },
      { header: 'Chuyên cần', key: 'total_diligence', width: 15 },
      { header: 'Doanh thu thực tế', key: 'actual_revenue', width: 25 },
      { header: 'Doanh thu dự kiến', key: 'projected_revenue', width: 25 },
    ];
    const data: ExcelCelFormat[] = statistics.map((item: StudentStatistic, index: number): ExcelCelFormat => ({
      order: 1 + index,
      full_name: item.student.full_name,
      dob: item.student.dob ? new Date(item.student.dob) : null,
      total_present: item.total_present,
      total_absent: item.total_absent,
      amount_left: item.student_fee.amount_left,
      total_diligence: item.total_diligence,
      actual_revenue: item.actual_revenue,
      projected_revenue: item.projected_revenue
    }));
    worksheet.addRows(data);
    worksheet.getColumn(8).numFmt = '#,##0"đ"';
    worksheet.getColumn(9).numFmt = '#,##0"đ"';
    worksheet.getColumn(3).numFmt = 'dd/mm/yyyy';
    // 3. Định dạng Header (Dòng 1)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', size: 12, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      applyBorder(cell);
    });

    // 4. Định dạng các dòng dữ liệu
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Bỏ qua header
        row.eachCell((cell, colNumber) => {
          // Font mặc định
          cell.font = { name: 'Times New Roman', size: 12 };
          if (colNumber === 2) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
          else if (colNumber === 7 || colNumber === 8) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          }
          else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          // Border
          applyBorder(cell);
        });
      }
    });

    const lastRow = worksheet.rowCount;

    worksheet.addRow({
      order: 'Tổng cộng',
      actual_revenue: { formula: `SUM(H2:H${lastRow})` },
      projected_revenue: { formula: `SUM(I2:I${lastRow})` }
    });
    const totalRow = worksheet.getRow(worksheet.rowCount);
    totalRow.font = { bold: true };
    for (let i = 1; i <= 9; i++) {
      const cell = totalRow.getCell(i);
      if (!cell.value) cell.value = '';
      if (i === 1) {
        cell.alignment = { horizontal: 'left' };
      } else if (i === 8 || i === 9) {
        cell.alignment = { horizontal: 'right' };
      } else {
        cell.alignment = { horizontal: 'center' };
      }
      applyBorder(cell);
    }

    // 5. Xuất file
    const buffer: ExcelJS.Buffer = await workbook.xlsx.writeBuffer();
    saveAsExcelFile(buffer, this.fileName());
  }

  btnExportData(): void {
    this.exportingObserver.next();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
