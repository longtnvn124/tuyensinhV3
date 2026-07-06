import { Component, inject, input, InputSignal, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { AuthenticationService } from '@app/services/authentication.service';
import { DiemDanhService } from '@app/services/diem-danh.service';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { MatMenu, MatMenuItem, MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { IctuDataTable, IctuDataTable2 } from '@app/models/datatable';
import { AttendanceSocKet, DiemDanh, DiemDanhStatus } from '@app/models/diem-danh';
import { forkJoin, map, switchMap } from 'rxjs';
import { Helper, HelperClass } from '@app/utilities/helper';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession, ClassSessionRelative } from '@app/models/class-session';
import { PhuHuynh } from '@app/models/phu-huynh';
import { PhuHuynhService } from '@app/services/phu-huynh.service';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { CommonModule } from '@angular/common';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationService } from '@app/services/notification.service';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { ClassActivityParams } from '@app/models/class-activities';
import { MatButton } from '@angular/material/button';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IctuPaginatorComponent } from "@app/theme/components/ictu-paginator/ictu-paginator.component";
type Mode = 'default' | 'session';
interface DiemDanhExtend extends DiemDanh {
  attendance_socet?: AttendanceSocKet,
  class_session: ClassSessionRelative,
  isUpdate: boolean;
}

@Component({
  selector: 'app-attendance-absent',
  imports: [LoadingProgressComponent, MatMenuModule, MatMenuTrigger, FormsModule, DialogModule, CommonModule, TextareaModule, TooltipModule, MatButton, IctuPaginatorComponent],
  templateUrl: './attendance-absent.component.html',
  styleUrl: './attendance-absent.component.css',
})
export class AttendanceAbsentComponent implements OnInit, OnDestroy {
  private diemdanhService: DiemDanhService = inject(DiemDanhService);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  private activitiesService: ClassActivitiesService = inject(ClassActivitiesService);

  state: WritableSignal<AppState | 'update'> = signal<AppState | 'update'>('loading');

  private destroy$: Subject<void> = new Subject<void>();

  private notification: NotificationService = inject(NotificationService);

  private auth: AuthenticationService = inject(AuthenticationService);

  modeState: WritableSignal<Mode> = signal<Mode>('default');

  setMode(mode: Mode, row?: DiemDanhExtend): void {
    switch (mode) {
      case 'default':
        this.modeState.set('default');
        break;
      case 'session':
        this.attendance_selected.set(row);
        this.modeState.set('session');
        this.loadDataTableAttendanceStudent(this.attendance_selected().hocsinh_id, 1, true);
        break;
    }
  }

  get csdtId(): number {
    return this.auth.employee?.csdt_id ?? 0;
  }

  dataTable: IctuDataTable<DiemDanhExtend> = new IctuDataTable<DiemDanhExtend>();


  dataTableAttendanceStudent: IctuDataTable2<DiemDanh> = new IctuDataTable2<DiemDanh>();

  private helper = new HelperClass();

  get donviId(): number {
    return this.auth.user.donvi_id;
  }

  diemdanhSelect: DiemDanhExtend;

  class_session_all: WritableSignal<ClassSessionRelative[]> = signal<ClassSessionRelative[]>(null);

  statePagePhuHuynh: WritableSignal<AppState> = signal<AppState>('loading');


  visibleDialogAttendanceSocet: boolean = false;

  visibleDialogteacherTA: boolean = false;

  attendance_selected: WritableSignal<DiemDanhExtend> = signal<DiemDanhExtend>(null);

  private phuHuynhservice: PhuHuynhService = inject(PhuHuynhService);


  listPhuHuynh: PhuHuynh[] = [];

  phuHuynhManager: PhuHuynh;

  visibleDialogPhuHuynh: boolean = false;

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
      }
    });
    this.state.set('loading');
    this.loadData();
    interval(5 * 60 * 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadData();
      });
  }

  loadData(): void {
    const start_date = new Date();
    const end_date = new Date()
    start_date.setHours(start_date.getHours() - 4);
    end_date.setHours(end_date.getHours() + 4);

    const conditions: IctuConditionParam[] = [
      {
        conditionName: 'donvi_id',
        condition: IctuQueryCondition.equal,
        value: this.donviId.toString()
      },
      {
        conditionName: 'csdt_id',
        condition: IctuQueryCondition.equal,
        value: this.csdtId.toString(),
        orWhere: 'and'
      }, {
        conditionName: 'time_start',
        condition: IctuQueryCondition.greaterThanToEqualsTo,
        value: this.helper.formatSQLDateTime(start_date),
        orWhere: 'and'
      },
      {
        conditionName: 'time_end',
        condition: IctuQueryCondition.lessThanOrEqualsTo,
        value: this.helper.formatSQLDateTime(end_date),
        orWhere: 'and'
      }
    ];
    const queryParams: IctuQueryParams = {
      limit: -1,
      paged: 1,
      with: 'class,room,teacher,assistants,parent_class'
    };
    this.classSessionService.query(conditions, queryParams).pipe(
      map(res => res.data),
      map((response: ClassSession[]): ClassSessionRelative[] => response.map((item: ClassSession): ClassSessionRelative => {
        return {
          ...item,
          assistants: item['assistants'] ?? null,
          course_lesson: item['course_lesson'] ?? null,
          class: item['class'] ?? null,
          room: item['room'] ?? null,
          teacher: item['teacher'] ?? null
        }
      })),
      switchMap((classSessions) => {
        this.class_session_all.set(classSessions);
        const ids = classSessions.map((item) => item.id).length ? classSessions.map((item) => item.id).join(',') : '-1';
        return this.diemdanhService.query([
          {
            conditionName: 'status',
            value: 'PRESENT',
            condition: IctuQueryCondition.notEqual,
            orWhere: 'and'
          }, {
            conditionName: 'status',
            value: 'LATE',
            condition: IctuQueryCondition.notEqual,
            orWhere: 'and'
          }], {
          limit: -1,
          paged: 1,
          include: ids,
          include_by: 'class_session_id',
          order: 'DESC',
          with: 'hocsinh'
        })
      })).subscribe({
        next: (res) => {
          const data = res.data.map((item: DiemDanh): DiemDanhExtend => {
            return {
              ...item,
              class_session: this.class_session_all().find((item1) => item1.id == item.class_session_id),
              isUpdate: false
            }
          });
          this.dataTable.fillData(data);
          this.state.set('success');
        },
        error: (err) => {
          this.state.set('error');
        },
      })
  }

  reload(event: MouseEvent): void {
    this.setMode('default');
    this.state.set('loading');
    this.loadData();
    event.preventDefault();
    event.stopPropagation();
  }

  updateStatusDiemDanh(status: DiemDanhStatus, index: number): void {
    let dataTableOld = this.dataTable.data();
    if (status == 'PRESENT') {
      dataTableOld[index].reason = '';
    }
    dataTableOld[index].status = status;
    this.dataTable.fillData(dataTableOld);
    this.submitDiemDanh(this.dataTable.data()[index]);
  }

  loadPhuHuynh(row: DiemDanhExtend) {
    this.statePagePhuHuynh.set('loading');
    this.listPhuHuynh = [];
    this.phuHuynhservice.load({
      search: ''
    }, row.phuhuynh_id ?? 0, 0, {
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
            {
              search: ''
            },
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

  submitDiemDanh(row: DiemDanhExtend) {
    this.state.set('update');
    const info: Partial<DiemDanh> = {
      reason: row.reason ?? '',
      status: row.status,
      course_id: row.class_session?.course_id,
    };
    this.diemdanhService.update(row.id, info).subscribe({
      next: () => {
        this.state.set('success');
        this.notification.toastSuccess('Cập nhật thành công', 'Thông báo');
      },
      error: () => {
        this.state.set('success');
        this.notification.toastError('Cập nhật không thành công', 'Thông báo');
      },
    })
  }


  selectAttendance(row: DiemDanhExtend): void {
    this.attendance_selected.set(row);
    this.visibleDialogAttendanceSocet = true;
  }

  updateActivities(
    data: ClassActivityParams,
    id: number,
    status: DiemDanhStatus
  ) {
    data.dihoc = data.dihoc.filter(x => x !== id);
    data.nghihoc = data.nghihoc.filter(x => x !== id);
    data.dimuon = data.dimuon.filter(x => x !== id);
    if (status === 'PRESENT') {
      data.dihoc.push(id);
    } else if (status === 'LATE') {
      data.dimuon.push(id);
    } else {
      data.nghihoc.push(id);
    }

    return data;
  }


  opendialogPhuHuynh(row: DiemDanhExtend): void {
    this.loadPhuHuynh(row);
    this.diemdanhSelect = row;
    this.visibleDialogPhuHuynh = true;
  }

  opendialogteacherTA(row: DiemDanhExtend): void {
    this.diemdanhSelect = row;
    this.visibleDialogteacherTA = true;
  }

  loadDataTableAttendanceStudent(student_id: number, paged: number, resetPaginator: boolean): void {
    this.state.set('loading');
    this.diemdanhService.loadAttendanceStudent(student_id, this.donviId, {
      limit: 20,
      paged,
      order: 'DESC',
      orderby: 'created_at',
      with: 'class_session'
    }).pipe(
      map((res): DiemDanh[] => {
        if (resetPaginator) {
          this.dataTableAttendanceStudent.paginator.setupPaginator(res);
        } else {
          this.dataTableAttendanceStudent.paginator.changePage(paged);
        }
        return res.data;
      })
    ).subscribe({
      next: (data) => {
        this.dataTableAttendanceStudent.fillData(data);
        this.state.set('success');
      },

      error: () => {
        this.state.set('error');
      }
    });
  }

  onChangePage(paged: number): void {
    this.loadDataTableAttendanceStudent(this.attendance_selected().hocsinh_id, paged, false);
  }



  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
