import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { IctuCustomMatMenuComponent } from "@app/components/form-controls/ictu-custom-mat-menu/ictu-custom-mat-menu.component";
import { IctuDropdownOptionElement } from '@app/models/ictu-dropdown-option';
import { CHECK_IN_STATUS_OPTIONS, CheckAssignmentProgress, DiemDanh } from '@app/models/diem-danh';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker } from "primeng/datepicker";
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { map, of, Subject, Observable, takeUntil, merge, switchMap, filter, debounceTime, forkJoin, from, mergeMap, catchError } from 'rxjs';
import { AuthenticationService } from '@app/services/authentication.service';
import { IctuDataTable2 } from '@app/models/datatable';
import { MatMenuModule } from '@angular/material/menu';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatCheckbox } from "@angular/material/checkbox";
import { SafeUrlPipe } from '@app/pipes/safe-url.pipe';
import { ClassSession, ClassSessionRelative } from '@app/models/class-session';
import { HocSinh } from '@app/models/hoc-sinh';
import { Course } from '@app/models/course';
import { Helper } from '@app/utilities/helper';
import { IctuPaginatorComponent } from "@app/theme/components/ictu-paginator/ictu-paginator.component";
import { Dialog } from "primeng/dialog";
import { ClassSessionService } from '@app/services/class-session.service';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationService } from '@app/services/notification.service';
import { Class } from '@app/models/class';
import { log } from 'node:console';

const getWeekBoundaryDates: (date: Dayjs | string | Date) => Date[] = (date: Dayjs | string | Date): Date[] => {
  const _date: Dayjs = dayjs(date);
  return [_date.startOf('isoWeek').toDate(), _date.endOf('isoWeek').toDate()];
}

interface DiemDanhCombined extends DiemDanh {
  class_session: Pick<ClassSession, 'id' | 'type' | 'title' | 'topic' | 'course_id' | 'course_lesson_id' | 'time_start'>;
  class_session_assigned: Pick<ClassSession, 'id' | 'type' | 'title' | 'topic' | 'course_id' | 'course_lesson_id' | 'class_id' | 'time_start' | 'status' | 'extra_student_ids'>;
  course: Pick<Course, 'id' | 'title' | 'lecture_format' | 'type'>,
  class_assigned: Pick<Class, 'id' | 'name' | 'course_id' | 'code'>
}

interface InfoClassSession {
  course_id: number;
  course_lesson_ids: number[];
  class_ids: number[];
}

type typeViewClassSesssion = 'all' | 'fit';

@Component({
  selector: 'app-tm-absence-combine-management',
  imports: [LoadingProgressComponent, IctuCustomMatMenuComponent, ReactiveFormsModule, FormsModule, MatButton, DatePicker, MatMenuModule, NgScrollbar, MatCheckbox, IctuPaginatorComponent, Dialog, CommonModule, TooltipModule],
  templateUrl: './tm-absence-combine-management.component.html',
  styleUrl: './tm-absence-combine-management.component.css',
})
export default class TmAbsenceCombineManagementComponent implements OnInit, OnDestroy {

  state: WritableSignal<AppState> = signal<AppState>('loading');

  state_dialog: WritableSignal<AppState | 'assigned'> = signal<AppState | 'assigned'>('loading');

  readonly checkInStatusOptions: IctuDropdownOptionElement<CheckAssignmentProgress>[] = CHECK_IN_STATUS_OPTIONS.filter(i => i.value === 0 || i.value === 2);

  protected rangeDates: WritableSignal<Date[]> = signal(getWeekBoundaryDates(new Date()));

  private readonly dateStart: Signal<string> = computed((): string => {
    return this.rangeDates()[0] ? [dayjs(this.rangeDates()[0]).format('YYYY-MM-DD'), '00:00:00'].join(' ') : '';
  });

  private readonly dateEnd: Signal<string> = computed((): string => {
    return this.rangeDates()[1] ? [dayjs(this.rangeDates()[1]).format('YYYY-MM-DD'), '23:59:59'].join(' ') : '';
  });

  currentDate: WritableSignal<string> = signal<string>(dayjs().format('YYYY-MM-DD 00:00:00'));

  startDateClassSession = computed((): string => {
    return dayjs(this.currentDate()).startOf('isoWeek').format('YYYY-MM-DD 00:00:00');
  });

  endDateClassSession = computed((): string => {
    return dayjs(this.currentDate()).endOf('isoWeek').format('YYYY-MM-DD 23:59:59');
  });

  readonly activeAgentName: Signal<string> = computed((): string => this.activeAgent() ? this.activeAgent().ten : 'Chọn cơ sở đào tạo');

  readonly listAgent: WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>([]);

  readonly activeAgent: WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>(null);

  readonly checkInStatusCssClassOptions: IctuDropdownOptionElement<CheckAssignmentProgress>[] = [
    { value: 0, label: 'ictu-badge--secondary' },
    { value: 2, label: 'ictu-badge--warning' },
  ];

  activeDiemDanhCombined: WritableSignal<DiemDanhCombined> = signal<DiemDanhCombined>(null);

  typeViewClassSession: WritableSignal<typeViewClassSesssion> = signal<typeViewClassSesssion>('all');

  infoClassSession: WritableSignal<InfoClassSession> = signal<InfoClassSession>(null);

  diemdanh_submit: WritableSignal<DiemDanhCombined[]> = signal<DiemDanhCombined[]>([]);

  get donViID(): number {
    return this.auth.user.donvi_id;
  }

  visibleDialog: boolean = false;

  protected filterProgress: WritableSignal<CheckAssignmentProgress> = signal(0);

  private readonly loadDataObserver: Subject<void> = new Subject<void>();

  private auth: AuthenticationService = inject(AuthenticationService);

  public dataTable: IctuDataTable2<DiemDanhCombined> = new IctuDataTable2<DiemDanhCombined>();

  public dataTable_class_session_all: WritableSignal<ClassSessionRelative[]> = signal<ClassSessionRelative[]>([]);

  public dataTable_class_session_fit: Signal<ClassSessionRelative[]> = computed((): ClassSessionRelative[] => this.dataTable_class_session_all().
    filter((item) =>
      item.course_id == this.infoClassSession()?.course_id
      && this.infoClassSession().course_lesson_ids.includes(item.course_lesson_id)));

  private destroyed$: Subject<void> = new Subject<void>();

  private coSoDaoTaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);

  private diemDanhService: DiemDanhService = inject(DiemDanhService);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  private notification: NotificationService = inject(NotificationService);

  constructor() {
    merge<[Date[], number]>(
      toObservable(this.rangeDates).pipe(
        filter((rangeDates: Date[]): boolean => rangeDates.every(Boolean))
      ),
      toObservable(this.filterProgress)
    ).pipe(
      takeUntilDestroyed(),
      debounceTime(100),
    ).subscribe((): void => {
      this.loadData(1, true);
    });

  }


  ngOnInit(): void {
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

  loadData(paged: number, resetPaginator: boolean): void {
    this.state.set('loading');
    this.loadDataObserver.next();
    this.filterByAgent().pipe(
      takeUntil(merge(this.loadDataObserver, this.destroyed$)),
      switchMap(() => this.loadDiemDanh(paged, resetPaginator)))
      .subscribe({
        next: (res): void => {
          this.dataTable.fillData(res);
          this.state.set('success');
        },
        error: (err): void => {
          console.error(err);
          this.state.set('error');
        }
      })
  }

  loadDiemDanh(paged: number, resetPaginator: boolean): Observable<DiemDanhCombined[]> {
    const conditions: IctuConditionParam[] = [
      { conditionName: 'created_at', condition: IctuQueryCondition.greaterThanToEqualsTo, value: this.dateStart() },
      { conditionName: 'created_at', condition: IctuQueryCondition.lessThanOrEqualsTo, value: this.dateEnd(), orWhere: 'and' },
      { conditionName: 'parent_id', condition: IctuQueryCondition.equal, value: '0', orWhere: 'and' },
      { conditionName: 'progress', condition: IctuQueryCondition.equal, value: '0', orWhere: 'and' },
      { conditionName: 'csdt_id', condition: IctuQueryCondition.equal, value: this.activeAgent().id.toString(), orWhere: 'and' },
      { conditionName: 'is_attended', condition: IctuQueryCondition.equal, value: '0', orWhere: 'and' },
    ];

    if (this.filterProgress() == 0) {
      conditions.push({ conditionName: 'assigned_class_session_id', condition: IctuQueryCondition.equal, value: '0', orWhere: 'and' },);
    } else if (this.filterProgress() == 2) {
      conditions.push({ conditionName: 'assigned_class_session_id', condition: IctuQueryCondition.notEqualTo, value: '0', orWhere: 'and' },);
    }
    const queryParams: IctuQueryParams = {
      limit: 20,
      paged: paged,
      order: 'ASC',
      orderby: 'created_at',
      with: 'class_session_assigned,class_session,hocsinh,class,course,class_assigned'
    };
    return this.diemDanhService.query(conditions, queryParams).pipe(map((res) => {
      let diemdanh = res.data as DiemDanhCombined[];
      if (resetPaginator) {
        this.dataTable.paginator.setupPaginator(res);
      } else {
        this.dataTable.paginator.changePage(paged);
      }
      return diemdanh;
    }));
  }

  onChangePage(paged: number): void {
    this.loadData(paged, false);
  }



  private _changeActiveAgent(agent: CoSoDaoTao): void {
    this.activeAgent.set(agent);
    this.loadData(1, true);
  }

  protected btnChangeAgent(agent: CoSoDaoTao): void {
    if (!this.activeAgent() || this.activeAgent().id !== agent.id) {
      this._changeActiveAgent(agent);
    }
  }


  openDialog(row: DiemDanhCombined): void {
    this.state_dialog.set('loading');
    this.activeDiemDanhCombined.set(row);
    this.currentDate.set(dayjs(new Date(row.class_session.time_start)).format('YYYY-MM-DD 00:00:00'));
    this.infoClassSession.set({ course_id: row.course_id, course_lesson_ids: [row.class_session.course_lesson_id], class_ids: [row.class_id] });
    this.diemdanh_submit.set([row]);
    this.visibleDialog = true;
    this.loadClassSession();
  }

  getDuplicateIds(arr: DiemDanhCombined[]): number[] {
    const ids = arr.map(i => i.hocsinh_id);

    return [...new Set(
      ids.filter((id, index) => ids.indexOf(id) !== index)
    )];
  }

  private lastDateOfList(dateList: string[]): Dayjs {
    return dateList.length ? dateList.reduce((reducer: Dayjs, strDateTime: string): Dayjs => {
      return reducer?.isAfter(dayjs(strDateTime)) ? reducer : dayjs(strDateTime);
    }, null) : dayjs();
  }

  openDialogAll(): void {
    this.state_dialog.set('loading');
    const tam = this.dataTable.data().filter((item) => item._ictuDataTableRowChecked);
    const isSameCourse = tam.every(item => item.course_id === tam[0].course_id);
    const hasDuplicate = this.getDuplicateIds(tam);
    if (!isSameCourse) {
      this.notification.toastInfo('Khóa học của các học sinh đã chọn không đồng nhất', 'Thông báo');
      return;
    } else if (hasDuplicate.length) {
      const nameDuplicate = [
        ...new Map(
          tam
            .filter(item => hasDuplicate.includes(item.hocsinh_id))
            .map(item => [item.hocsinh_id, item])
        ).values()
      ].map(item => item.hocsinh?.full_name).join(', ');
      this.notification.toastInfo(`${nameDuplicate}.
        Những học sinh trên đang nhiều hơn 2 buổi`, 'Thông báo');
      return;
    }
    this.currentDate.set(this.lastDateOfList(tam.map((item) => item.class_session.time_start)).format('YYYY-MM-DD 00:00:00'));
    this.diemdanh_submit.set(tam);
    const class_ids = [...new Set(tam.map(item => item.class_id))];
    this.infoClassSession.set({ course_id: tam[0].course_id, course_lesson_ids: tam.map(item => item.class_session.course_lesson_id), class_ids: class_ids });
    this.visibleDialog = true;
    // const conditions: IctuConditionParam[] = [
    //   { conditionName: 'time_start', condition: IctuQueryCondition.greaterThanToEqualsTo, value: this.currentDate, orWhere: 'and' },
    //   { conditionName: 'time_end', condition: IctuQueryCondition.lessThanOrEqualsTo, value: this.next20Days, orWhere: 'and' },
    //   { conditionName: 'parent_id', condition: IctuQueryCondition.equal, value: '0', orWhere: 'and' },
    //   { conditionName: 'csdt_id', condition: IctuQueryCondition.equal, value: this.activeAgent().id.toString(), orWhere: 'and' },
    //   { conditionName: 'course_id', condition: IctuQueryCondition.equal, value: this.infoClassSession().course_id.toString(), orWhere: 'and' },
    // ];
    // const queryParams: IctuQueryParams = {
    //   limit: -1,
    //   paged: 1,
    //   order: 'ASC',
    //   orderby: 'created_at',
    //   include: this.donViID,
    //   include_by: 'donvi_id',
    //   exclude: class_ids,
    //   exclude_by: 'class_id',
    //   with: 'class'
    // };
    // this.classSessionService.query(conditions, queryParams).pipe(
    //   map((response: DtoObject<ClassSession[]>): ClassSessionRelative[] =>
    //     response.data.map((item: ClassSession): ClassSessionRelative => {
    //       return {
    //         ...item,
    //         assistants: item['assistants'] ?? null,
    //         course_lesson: item['course_lesson'] ?? null,
    //         class: item['class'] ?? null,
    //         room: item['room'] ?? null,
    //         teacher: item['teacher'] ?? null,
    //         foreign_teacher: item['foreign_teacher'] ?? null
    //       };
    //     })
    //   )
    // ).subscribe({
    //   next: (res) => {
    //     this.dataTable_class_session_all.set(res);
    //     this.state_dialog.set('success');
    //   },
    //   error: () => {
    //     this.state_dialog.set('error');
    //   },
    // })
    this.loadClassSession();
  }

  loadClassSession(): void {
    const conditions: IctuConditionParam[] = [
      { conditionName: 'time_start', condition: IctuQueryCondition.greaterThanToEqualsTo, value: this.startDateClassSession(), orWhere: 'and' },
      { conditionName: 'time_end', condition: IctuQueryCondition.lessThanOrEqualsTo, value: this.endDateClassSession(), orWhere: 'and' },
      { conditionName: 'parent_id', condition: IctuQueryCondition.equal, value: '0', orWhere: 'and' },
      { conditionName: 'csdt_id', condition: IctuQueryCondition.equal, value: this.activeAgent().id.toString(), orWhere: 'and' },
      { conditionName: 'course_id', condition: IctuQueryCondition.equal, value: this.infoClassSession().course_id.toString(), orWhere: 'and' },
    ];
    const class_ids = this.infoClassSession().class_ids.length ? this.infoClassSession().class_ids.join(',') : '-1';
    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      order: 'ASC',
      orderby: 'created_at',
      include: this.donViID,
      include_by: 'donvi_id',
      exclude: class_ids,
      exclude_by: 'class_id',
      with: 'class'
    };
    this.classSessionService.query(conditions, queryParams).pipe(
      map((response: DtoObject<ClassSession[]>): ClassSessionRelative[] =>
        response.data.map((item: ClassSession): ClassSessionRelative => {
          return {
            ...item,
            assistants: item['assistants'] ?? null,
            course_lesson: item['course_lesson'] ?? null,
            class: item['class'] ?? null,
            room: item['room'] ?? null,
            teacher: item['teacher'] ?? null
          };
        })
      )
    ).subscribe({
      next: (res) => {
        this.dataTable_class_session_all.set(res);
        this.state_dialog.set('success');
      },
      error: () => {
        this.state_dialog.set('error');
      },
    })
  }

  submitDiemDanhCombined(class_session: ClassSessionRelative): void {
    this.state_dialog.set('assigned');
    let extra_student_ids: number[] = class_session.extra_student_ids || [];

    let extra_student_ids_old: number[] = [];
    const request$ = this.diemdanh_submit().map((item) => {
      return this.diemDanhService.update(item.id, { assigned_class_session_id: class_session.id, class_assigned_id: class_session.class_id });
    });
    from(request$).pipe(
      mergeMap(req =>
        req.pipe(
          catchError(() => of(null))
        )
      )
    ).subscribe({
      next: (res) => {
        if (res) {
          const diemdanh = this.diemdanh_submit().find((item) => item.id == Number(res));
          //chỉ chạy khi đã được phân lớp học ghép
          if (this.filterProgress() == 2 && class_session.id != this.activeDiemDanhCombined().assigned_class_session_id) {
            const class_session_assigned = Helper.cloneObject(this.activeDiemDanhCombined());
            extra_student_ids_old = class_session_assigned.class_session_assigned.extra_student_ids.filter(((item) => item != diemdanh.hocsinh_id));
          }
          extra_student_ids = [
            ...new Set([...extra_student_ids, diemdanh.hocsinh_id])
          ];
        }
      },
      complete: () => {
        const updateClassSession$ = this.filterProgress() == 2 ?
          forkJoin([
            this.classSessionService.update(this.activeDiemDanhCombined().assigned_class_session_id, { extra_student_ids: extra_student_ids_old }),
            this.classSessionService.update(class_session.id, { extra_student_ids: extra_student_ids })])
          : this.classSessionService.update(class_session.id, { extra_student_ids: extra_student_ids });
        updateClassSession$.subscribe({
          next: () => {
            this.closeDialog();
            this.loadData(this.dataTable.paginator.paged(), false);
            this.notification.toastSuccess('Cập nhật buổi học ghép thành công', 'Thông báo');
            this.state_dialog.set('success');
          },
          error: () => {
            this.notification.toastError('Cập nhật buổi học ghép không thành công', 'Thông báo');
            this.state_dialog.set('success');

          },
        })
      }
    });
  }


  nextOrPreviousClassSession(is_next: boolean): void {
    if (is_next) {
      this.currentDate.set(dayjs(this.startDateClassSession()).add(7, 'day').format('YYYY-MM-DD 00:00:00'));
    } else {
      this.currentDate.set(dayjs(this.startDateClassSession()).add(-7, 'day').format('YYYY-MM-DD 00:00:00'));
    }
    this.loadClassSession();
  }

  closeDialog(): void {
    this.visibleDialog = false;
    this.activeDiemDanhCombined.set(null);
    this.infoClassSession.set(null);
    this.diemdanh_submit.set([]);
  }


  setTypeViewClassSession(type: typeViewClassSesssion): void {
    this.typeViewClassSession.set(type);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();

  }
}
