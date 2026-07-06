import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
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
import { HocSinhService } from '@app/services/hoc-sinh.service';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { DiemDanh } from '@app/models/diem-danh';
import { ClassSession } from '@app/models/class-session';
import { ClassSessionService } from '@app/services/class-session.service';
import { StudentFee } from '@app/models/student-fee';
import { StudentFeeService } from '@app/services/student-fee.service';
import { DatePicker } from "primeng/datepicker";
import dayjs from 'dayjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { Class } from '@app/models/class';
import { ClassesService } from '@app/services/classes.service';
import { HocSinhLopHocService } from '@app/services/hoc-sinh-lop-hoc.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormatVndPipe } from '@app/pipes/format-vnd.pipe';

export interface StudentAttendance {
  student: HocSinh;
  total_present: number;
  total_absent: number;
  session_attendance: { [classSessionId: number]: DiemDanh };
  student_fee: Pick<StudentFee, 'id' | 'price' | 'total_amount' | 'effective_date' | 'course_id'> | null;
  price_per_session: number;
  projected_revenue: number;
  actual_revenue: number;
}

const getMonthBoundaryDates: (date: Date) => Date[] = (date: Date): Date[] => {
  const givenDate = dayjs(date);
  return [givenDate.startOf('month').toDate(), givenDate.endOf('month').toDate()];
}

@Component({
  selector: 'app-accountant-revenue',
  standalone: true,
  imports: [LoadingProgressComponent, MatMenuModule, CommonModule, TooltipModule, IctuPaginatorComponent, DatePicker, FormsModule, FormatVndPipe],
  templateUrl: './accountant-revenue.component.html',
  styleUrl: './accountant-revenue.component.css',
})
export default class AccountantRevenueComponent implements OnInit, OnDestroy {

  state: WritableSignal<AppState> = signal<AppState>('loading');

  private destroyed$: Subject<void> = new Subject<void>();

  readonly listAgent: WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>([]);

  readonly activeAgent: WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>(null);

  private coSoDaoTaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);

  private auth: AuthenticationService = inject(AuthenticationService);

  private studentService: HocSinhService = inject(HocSinhService);

  private classStudentService: HocSinhLopHocService = inject(HocSinhLopHocService);

  private classService: ClassesService = inject(ClassesService);

  private diemdanhService: DiemDanhService = inject(DiemDanhService);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  private studentFeeService: StudentFeeService = inject(StudentFeeService);

  readonly activeAgentName: WritableSignal<string> = signal<string>('Chọn cơ sở đào tạo');

  protected readonly rangeDates: WritableSignal<Date[]> = signal(getMonthBoundaryDates(new Date()));

  readonly classSessions: WritableSignal<ClassSession[]> = signal<ClassSession[]>([]);

  readonly totalProjectedRevenue: WritableSignal<number> = signal<number>(0);

  readonly totalActualRevenue: WritableSignal<number> = signal<number>(0);

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

  public dataTable: IctuDataTable2<StudentAttendance> = new IctuDataTable2<StudentAttendance>();

  get donViID(): number {
    return this.auth.user.donvi_id;
  }

  private _changeActiveAgent(agent: CoSoDaoTao): void {
    this.activeAgent.set(agent);
    this.activeAgentName.set(agent.ten);
  }

  protected btnChangeAgent(agent: CoSoDaoTao): void {
    if (!this.activeAgent() || this.activeAgent().id !== agent.id) {
      this._changeActiveAgent(agent);
      this.listClass.set([]);
      this.activeClass.set(this.default_class);
      this.loadData(true);
    }
  }

  private _changeActiveClass(value: Class): void {
    this.activeClass.set(value);
  }

  protected btnChangeClass(value: Class): void {
    if (!this.activeClass() || this.activeClass().id !== value.id) {
      this._changeActiveClass(value);
      this.loadData(true);
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
      this.loadData(true);
    });
  }

  ngOnInit(): void {
    this.loadData(true);
  }

  private filterByAgent(): Observable<number> {
    if (this.activeAgent()) {
      return of(this.activeAgent().id);
    } else {
      if (this.listAgent().length > 0) {
        this.activeAgent.set(this.listAgent()[0]);
        this.activeAgentName.set(this.listAgent()[0].ten);
        return of(this.activeAgent().id);
      } else {
        const conditions: IctuConditionParam[] = [];
        const queryParams: IctuQueryParams = { limit: -1, paged: 1, include: this.donViID, include_by: 'donvi_id' };
        return this.coSoDaoTaoService.query(conditions, queryParams).pipe(
          map((response: DtoObject<CoSoDaoTao[]>): number => {
            if (response.data.length) {
              this.listAgent.set(response.data);
              this.activeAgent.set(response.data[0]);
              this.activeAgentName.set(response.data[0].ten);
              return this.activeAgent().id;
            } else {
              return 0;
            }
          })
        );
      }
    }
  }

  loadClass(): Observable<Class[]> {
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
    }));
  }

  loadClassSessions(): Observable<ClassSession[]> {
    const dateStart = this.rangeDates()[0] ? dayjs(this.rangeDates()[0]).format('YYYY-MM-DD') + ' 00:00:00' : '';
    const dateEnd = this.rangeDates()[1] ? dayjs(this.rangeDates()[1]).format('YYYY-MM-DD') + ' 23:59:59' : '';

    const conditions: IctuConditionParam[] = [
      {
        conditionName: 'class_id',
        condition: IctuQueryCondition.equal,
        value: this.activeClass().id.toString(),
        orWhere: 'and'
      },
      {
        conditionName: 'time_start',
        condition: IctuQueryCondition.greaterThanToEqualsTo,
        value: dateStart,
        orWhere: 'and'
      },
      {
        conditionName: 'time_end',
        condition: IctuQueryCondition.lessThanOrEqualsTo,
        value: dateEnd,
        orWhere: 'and'
      }
    ];

    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      order: 'ASC',
      orderby: 'time_start'
    };

    return this.classSessionService.query(conditions, queryParams).pipe(
      map((res) => res.data)
    );
  }

  loadStudentFees(studentIds: number[]): Observable<StudentFee[]> {
    if (!studentIds.length) return of([]);

    const conditions: IctuConditionParam[] = [
      {
        conditionName: 'course_id',
        condition: IctuQueryCondition.equal,
        value: this.activeClass().course_id.toString(),
        orWhere: 'and'
      },
      {
        conditionName: 'donvi_id',
        condition: IctuQueryCondition.equal,
        value: this.donViID.toString(),
        orWhere: 'and'
      }
    ];

    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      include: studentIds.join(','),
      include_by: 'student_id'
    };

    return this.studentFeeService.query(conditions, queryParams).pipe(
      map((res) => {
        // Nhóm theo student_id, lấy item có effective_date lớn nhất
        const allFees = res.data || [];
        const feeMap = new Map<number, StudentFee>();
        allFees.forEach(fee => {
          const existing = feeMap.get(fee.student_id);
          if (!existing || new Date(fee.effective_date) > new Date(existing.effective_date)) {
            feeMap.set(fee.student_id, fee);
          }
        });
        return Array.from(feeMap.values());
      })
    );
  }

  loadStudentsWithAttendance(): Observable<StudentAttendance[]> {
    const conditions: IctuConditionParam[] = [{
      conditionName: 'status',
      condition: IctuQueryCondition.equal,
      value: '1',
      orWhere: 'and'
    }];

    const dateStart = this.rangeDates()[0] ? dayjs(this.rangeDates()[0]).format('YYYY-MM-DD') + ' 00:00:00' : '';
    const dateEnd = this.rangeDates()[1] ? dayjs(this.rangeDates()[1]).format('YYYY-MM-DD') + ' 23:59:59' : '';

    return this.classStudentService.load(this.activeClass()?.id ?? -1, this.donViID).pipe(
      switchMap((resClassStudent) => {
        const classStudentIds = resClassStudent.data.length ? resClassStudent.data.map(i => i.hocsinh_id).join(',') : '-1';
        const queryParams: IctuQueryParams = {
          limit: -1,
          paged: 1,
          order: 'ASC',
          orderby: 'full_name',
          include: classStudentIds,
          include_by: 'id'
        };
        return this.studentService.query(conditions, queryParams).pipe(
          switchMap((resStudent) => {
            const students = resStudent.data;
            const studentIds = students.map(s => s.id);

            return forkJoin({
              studentFees: this.loadStudentFees(studentIds),
              diemDanh: this.diemdanhService.query(
                this.buildDiemDanhConditions(dateStart, dateEnd),
                {
                  limit: -1,
                  paged: 1,
                  include: studentIds.join(','),
                  include_by: 'hocsinh_id',
                  with: 'class_session,class',
                  select: 'class_session_id,class_id,course_id,status,hocsinh_id'
                }
              )
            }).pipe(
              map(({ studentFees, diemDanh }) => {
                const diemDanhList: DiemDanh[] = diemDanh.data;
                const sessionCount = this.classSessions().length;

                return students.map((student): StudentAttendance => {
                  const attendance = diemDanhList.filter(d => d.hocsinh_id === student.id);
                  const sessionAttendance: { [classSessionId: number]: DiemDanh } = {};
                  attendance.forEach(d => {
                    sessionAttendance[d.class_session_id] = d;
                  });

                  // Lấy student_fee có effective_date mới nhất
                  const fees = studentFees.filter(f => f.student_id === student.id);
                  const latestFee = fees.length
                    ? fees.reduce((max, cur) => new Date(cur.effective_date) > new Date(max.effective_date) ? cur : max)
                    : null;

                  const pricePerSession = latestFee && latestFee.total_amount > 0
                    ? latestFee.price / latestFee.total_amount
                    : 0;

                  const totalPresent = attendance.filter(item => item.status == 'PRESENT' || item.status == 'LATE').length;
                  const projectedRevenue = pricePerSession * sessionCount;
                  const actualRevenue = pricePerSession * totalPresent;

                  return {
                    student: student,
                    total_present: totalPresent,
                    total_absent: attendance.filter(item => item.status != 'PRESENT' && item.status != 'LATE').length,
                    session_attendance: sessionAttendance,
                    student_fee: latestFee ? {
                      id: latestFee.id,
                      price: latestFee.price,
                      total_amount: latestFee.total_amount,
                      effective_date: latestFee.effective_date,
                      course_id: latestFee.course_id
                    } : null,
                    price_per_session: pricePerSession,
                    projected_revenue: projectedRevenue,
                    actual_revenue: actualRevenue
                  };
                });
              })
            );
          })
        );
      })
    );
  }

  private buildDiemDanhConditions(dateStart: string, dateEnd: string): IctuConditionParam[] {
    const conditions: IctuConditionParam[] = [
      {
        conditionName: 'created_at',
        condition: IctuQueryCondition.greaterThanToEqualsTo,
        value: dateStart,
        orWhere: 'and'
      },
      {
        conditionName: 'created_at',
        condition: IctuQueryCondition.lessThanOrEqualsTo,
        value: dateEnd,
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

    return conditions;
  }

  private calcTotalRevenue(students: StudentAttendance[]): void {
    const totalProjected = students.reduce((sum, item) => sum + (item.projected_revenue || 0), 0);
    const totalActual = students.reduce((sum, item) => sum + (item.actual_revenue || 0), 0);
    this.totalProjectedRevenue.set(totalProjected);
    this.totalActualRevenue.set(totalActual);
  }

  loadData(isLoadClass: boolean): void {
    this.state.set('loading');
    this.filterByAgent().pipe(
      takeUntil(this.destroyed$),
      switchMap(() => forkJoin({
        classes: isLoadClass ? this.loadClass() : of(this.listClass()),
        sessions: this.activeClass()?.id !== -1 ? this.loadClassSessions() : of([]),
      })),
      switchMap((res) => {
        if (isLoadClass) {
          this.listClass.set(res.classes);
        }
        this.classSessions.set(res.sessions);
        return this.activeClass()?.id !== -1 ? this.loadStudentsWithAttendance() : of([]);
      })
    ).subscribe({
      next: (students: StudentAttendance[]): void => {
        this.dataTable.fillData(students);
        this.calcTotalRevenue(students);
        this.state.set('success');
      },
      error: (err): void => {
        console.error(err);
        this.state.set('error');
      }
    });
  }

  getSessionStatus(student: StudentAttendance, sessionId: number): string {
    const dd = student.session_attendance[sessionId];
    if (!dd) return '';
    switch (dd.status) {
      case 'PRESENT': return 'C';
      case 'LATE': return 'M';
      case 'UNEXCUSED': return 'K';
      case 'EXCUSED': return 'P';
      default: return '';
    }
  }

  onChangePage(_paged: number): void {
    this.loadData(false);
  }

  reload(event: MouseEvent): void {
    this.loadData(false);
    event.preventDefault();
    event.stopPropagation();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
