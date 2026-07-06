import { Component, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { ClassesAssignmentSubmission } from '@app/models/classes-assignment-submissions';
import { IctuDataTable2 } from '@app/models/datatable';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassesAssignmentSubmissionService } from '@app/services/classes-assignment-submissions.service';
import { debounceTime, forkJoin, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { ClassAssignmentCommand, ClassesAssignment, ClassesAssignmentExtend, ClassesAssignmentScoring, ClassesAssignmentType, optionClassesAssignmentType } from '@app/models/classes-assignment';
import { ClassesAssignmentService } from '@app/services/classes-assignment.service';
import { DialogModule } from 'primeng/dialog';
import { NotificationService } from '@app/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IctuBasicFile } from '@app/models/file';
import { CommonModule } from '@angular/common';
import { IctuDropdownField, IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { TooltipModule } from 'primeng/tooltip';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession } from '@app/models/class-session';
import { IctuPaginatorComponent } from "@app/theme/components/ictu-paginator/ictu-paginator.component";
import { Router } from '@angular/router';
import { SysRoleName } from '@app/models/role';
import { PROVIDED_ROLE } from '@app/providers/admin-role.provider';
import { ClassesService } from '@app/services/classes.service';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-teacher-scoring',
  standalone: true,
  imports: [LoadingProgressComponent, DialogModule,
    CommonModule, TooltipModule, IctuPaginatorComponent, SelectModule, FormsModule],
  templateUrl: './teacher-scoring.component.html',
  styleUrl: './teacher-scoring.component.css',
})
export default class TeacherScoringComponent implements OnInit, OnDestroy {
  private onDestroy$: Subject<string> = new Subject<string>();

  public state: WritableSignal<AppState | 'invalid'> = signal<AppState | 'invalid'>('loading');

  public stateDialog: WritableSignal<AppState> = signal<AppState>('loading');

  private router: Router = inject(Router);

  private auth: AuthenticationService = inject(AuthenticationService);

  get user_id(): number {
    return this.auth.user.id;
  }

  private classesAssignmentService: ClassesAssignmentService = inject(ClassesAssignmentService);

  private classSessionService: ClassSessionService = inject<ClassSessionService>(ClassSessionService);

  private classesservice: ClassesService = inject(ClassesService);

  private classesAssignmentSubmissionservice: ClassesAssignmentSubmissionService = inject(ClassesAssignmentSubmissionService);

  private notification: NotificationService = inject(NotificationService);

  classesAssignment: ClassesAssignmentExtend;

  protected readonly optionListType: IctuDropdownOption<ClassesAssignmentType>[] = optionClassesAssignmentType;

  get donviId(): number {
    return this.auth.user.donvi_id;
  }

  classDropdownField: IctuDropdownField = new IctuDropdownField(this.classesservice.loadOptions(this.donviId, 'teacher', this.user_id), 'Lọc theo lớp');

  public dataTable: IctuDataTable2<ClassesAssignmentScoring> =
    new IctuDataTable2<ClassesAssignmentScoring>();

  private previewFileObserver$: Subject<IctuBasicFile> =
    new Subject<IctuBasicFile>();

  allClassesAssignmentSubmission: ClassesAssignmentSubmission[] = [];

  allClassSession: ClassSession[] = [];

  visibleDialog: boolean = false;

  visibleDialogStudentLate: boolean = false;

  private _temp: { paged: number; resetPaginator: boolean; } = {
    paged: 1,
    resetPaginator: true,
  };

  searchInfo: { class_id: number } = {
    class_id: null
  }

  private roleUsed: SysRoleName = inject(PROVIDED_ROLE);

  ngOnInit(): void {
    if (this.auth.userHasRole([
      'teacher',
    ])) {
      this.preload().subscribe({
        next: () => {
          this.loadData(1, true);
        },
        error: () => {
          this.state.set('error');
        },
      });
    } else {
      this.state.set('invalid');
    }
  }

  preload(): Observable<ClassSession[]> {
    this.state.set('loading');
    const searchConditions: IctuConditionParam[] = [
      {
        conditionName: 'teacher_id',
        condition: IctuQueryCondition.equal,
        value: this.user_id.toString(),
        orWhere: 'and',
      },
    ];
    const queryParams: IctuQueryParams = {
      include: this.donviId,
      include_by: 'donvi_id',
      limit: -1,
      paged: 1,
      with: 'room,class',
    };

    return this.allClassSession.length != 0 ? of(this.allClassSession) : this.classSessionService
      .query(searchConditions, queryParams)
      .pipe(
        takeUntil(this.onDestroy$),
        map(
          (response: DtoObject<ClassSession[]>): ClassSession[] => {
            this.allClassSession = response.data;
            return this.allClassSession;
          }
        )
      )
  }


  private loadData(paged: number, resetPaginator: boolean): void {
    this.state.set('loading');
    this._temp = {
      paged: paged,
      resetPaginator: resetPaginator
    }
    let ids;
    if (this.searchInfo.class_id == 0 || this.searchInfo.class_id == null) {
      ids = this.allClassSession.length != 0 ? this.allClassSession.map((t) => t.id).join(',') : '-1';
    } else {
      ids = this.allClassSession.filter((item) => item.class_id == this.searchInfo.class_id).length != 0 ? this.allClassSession.filter((item) => item.class_id == this.searchInfo.class_id).map((t) => t.id).join(',') : '-1';

    }
    forkJoin<[DtoObject<ClassesAssignment[]>, IctuDropdownOption<number>[]]>([
      this.classesAssignmentService.query([], {
        include: ids,
        include_by: 'class_session_id',
        limit: 20,
        paged: paged,
        with: 'course_lesson_test,class_session,class,submission',
        order: 'DESC',
        orderby: 'created_at'
      }),
      this.classDropdownField.load()
    ])
      .pipe(
        map(
          ([res, _]: [
            DtoObject<ClassesAssignmentScoring[]>,
            IctuDropdownOption<number>[],
          ]): ClassesAssignmentScoring[] => {
            if (resetPaginator) {
              return this.dataTable.paginator.setupPaginator(res);
            } else {
              this.dataTable.paginator.changePage(paged);
              return res.data;
            }
          }
        )
      ).subscribe({
        next: (data) => {
          let _value: ClassesAssignmentScoring[] = data;
          for (let item of _value) {
            const missingInLate = item.submission?.length ?? item.student_ids.length;
            const total_marked = item.submission?.filter((t) => t.score != -1).length ?? 0;
            item.total_student_pending = item.student_ids.length - missingInLate;
            item.total_student_submitted = missingInLate;
            item.total_marked = total_marked;
          }
          this.dataTable.fillData(_value);
          console.log(this.classDropdownField.options());
          this.state.set('success');
        },
        error: () => {
          this.state.set('error');
        },
      });
  }


  constructor() {
    this.previewFileObserver$
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe((file: IctuBasicFile): void => {
        this.notification.previewFile({ info: [file] });
      });
  }

  protected btnPreviewFile(file: IctuBasicFile): void {
    this.previewFileObserver$.next(file);
  }

  onChangePage(paged: number): void {
    this.loadData(paged, false);
  }


  reload(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.preload().subscribe({
      next: (res) => {
        this.loadData(1, true);
      },
      error: () => {
        this.state.set('error');
      },
    });
  }

  protected getToHomeWorkScore(classesAssignment: ClassesAssignmentExtend): void {
    const _hashcode: ClassAssignmentCommand = {
      class_session_id: classesAssignment.class_session_id,
      classes_assignment_id: classesAssignment.id,
      role: this.roleUsed,
      userId: this.auth.user.id,
    };
    void this.router.navigate(['scoring'], {
      queryParams: {
        hashcode: this.auth.encrypt(JSON.stringify(_hashcode)),
        viewer: 'by_'.concat(this.roleUsed),
      },
    });
  }

  getClassID(): number[] {
    const uniqueSessions = this.allClassSession.filter(
      (item, index, self) => index === self.findIndex(s => s.class_id === item.class_id)
    ).map((t) => t.class_id);
    return uniqueSessions;
  }

  onSearch(): void {
    this.loadData(1, true);
  }

  onClear(): void {
    this.searchInfo.class_id = 0;
    this.loadData(1, true);
  }

  ngOnDestroy(): void {
    this.onDestroy$.next('OnDestroy');
    this.onDestroy$.complete();
  }

}

