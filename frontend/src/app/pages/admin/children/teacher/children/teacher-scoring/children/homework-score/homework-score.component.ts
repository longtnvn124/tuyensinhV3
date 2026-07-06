import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { ClassesAssignmentSubmission, ClassesAssignmentSubmissionExtend } from '@app/models/classes-assignment-submissions';
import { DataTableEvent, DataTableEventName, IctuDataTable2 } from '@app/models/datatable';
import { DtoObject, IctuQueryCondition } from '@app/models/dto';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassesAssignmentSubmissionService } from '@app/services/classes-assignment-submissions.service';
import { debounceTime, forkJoin, map, Observable, of, Subject, takeUntil } from 'rxjs';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { MatButton } from '@angular/material/button';
import { ClassAssignmentCommand, ClassesAssignmentExtend, ClassesAssignmentType, optionClassesAssignmentType } from '@app/models/classes-assignment';
import { ClassesAssignmentService } from '@app/services/classes-assignment.service';
import { DialogModule } from 'primeng/dialog';
import { NotificationService } from '@app/services/notification.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IctuBasicFile } from '@app/models/file';
import { FileIconPipe } from '@app/pipes/file-icon.pipe';
import { SafeHtmlPipe } from '@app/pipes/safe-html.pipe';
import { FormatBytesPipe } from '@app/pipes/format-bytes.pipe';
import { CommonModule } from '@angular/common';
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { IctuDropdownOptionMapPipe } from '@app/pipes/ictu-dropdown-option-map.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { HocSinh } from '@app/models/hoc-sinh';
import { HocSinhService } from '@app/services/hoc-sinh.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassSession } from '@app/models/class-session';
import { MatMenuModule } from "@angular/material/menu";
import { IctuFormControl2 } from '@app/models/ictu-form-control';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Drawer } from 'primeng/drawer';
import { TextareaModule } from 'primeng/textarea';
import { InputText } from 'primeng/inputtext';
@Component({
  selector: 'app-homework-score',
  imports: [LoadingProgressComponent, MatButton, DialogModule,
    FileIconPipe,
    SafeHtmlPipe,
    FormatBytesPipe,
    CommonModule, IctuDropdownOptionMapPipe, TooltipModule, MatMenuModule, FormsModule, Drawer, ReactiveFormsModule, TextareaModule, InputText],
  templateUrl: './homework-score.component.html',
  styleUrl: './homework-score.component.css',
})
export default class HomeworkScoreComponent implements OnInit, OnDestroy {
  public stateDialog: WritableSignal<AppState> = signal<AppState>('loading');

  private HSservice: HocSinhService = inject(HocSinhService);

  private auth: AuthenticationService = inject(AuthenticationService);

  private service: ClassesAssignmentSubmissionService = inject(ClassesAssignmentSubmissionService);

  private classesAssignmentService: ClassesAssignmentService = inject(ClassesAssignmentService);

  private notification: NotificationService = inject(NotificationService);

  classesAssignment: ClassesAssignmentExtend;

  classSession: ClassSession;

  protected readonly optionListType: IctuDropdownOption<ClassesAssignmentType>[] = optionClassesAssignmentType;

  get donviId(): number {
    return this.auth.user.donvi_id;
  }
  public dataTable: IctuDataTable2<ClassesAssignmentSubmissionExtend> =
    new IctuDataTable2<ClassesAssignmentSubmissionExtend>();

  private previewFileObserver$: Subject<IctuBasicFile> =
    new Subject<IctuBasicFile>();

  studentpending: WritableSignal<HocSinh[]> = signal<HocSinh[]>([]);

  visibleDialog: boolean = false;

  visibleDialogStudentpending: boolean = false;

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  private router: Router = inject(Router);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  private onDestroy$: Subject<void> = new Subject<void>();

  private eventObserver$: Subject<DataTableEvent<ClassesAssignmentSubmissionExtend>> =
    new Subject<DataTableEvent<ClassesAssignmentSubmissionExtend>>();

  private readonly extractedInfo: WritableSignal<ClassAssignmentCommand> =
    signal(null);

  protected readonly classSessionID: Signal<number> = computed(
    (): number => this.extractedInfo()?.class_session_id ?? 0
  );
  protected readonly classAssignmentID: Signal<number> = computed(
    (): number => this.extractedInfo()?.classes_assignment_id ?? 0
  );

  readonly state: WritableSignal<
    AppState | 'unauthorized' | 'invalid' | 'notFound'
  > = signal<AppState | 'unauthorized' | 'invalid' | 'notFound'>('loading');

  private fb: FormBuilder = inject(FormBuilder);

  readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

  private formField(path: keyof ClassesAssignmentSubmissionExtend): AbstractControl {
    return this.formControl.formGroup.get(path);
  }



  formControl: IctuFormControl2<ClassesAssignmentSubmissionExtend> =
    new IctuFormControl2<ClassesAssignmentSubmissionExtend>({
      dropdownFields: [],
      formGroup: this.fb.group({
        id: [0],
        donvi_id: [this.donviId],
        classes_assignments_id: [0],
        class_session_id: [0],
        student_id: [0],
        files: [[]],
        score: [0],
        comment: ['', [Validators.required]],
        content: [''],
        student: [{}]
      }),
      objectName: '',
      drawer: this.drawer,
    });

  private handelEvent: Record<
    DataTableEventName,
    (data: ClassesAssignmentSubmissionExtend) => void
  > = {
      OPEN_FORM_ADD: (): void => {
        this.formControl.formGroup.reset({
          id: 0,
          donvi_id: this.donviId,
          classes_assignments_id: 0,
          class_session_id: 0,
          student_id: 0,
          files: [],
          score: 0,
          comment: '',
          content: '',
          student: {}
        });
        this.formControl.openFormAdd();
      },
      OPEN_FORM_UPDATE: (data: ClassesAssignmentSubmissionExtend): void => {
        this.formControl.formGroup.reset({
          id: data.id,
          donvi_id: this.donviId,
          classes_assignments_id: data.classes_assignments_id,
          class_session_id: data.class_session_id,
          student_id: data.student_id,
          files: data.files,
          score: data.score == -1 ? null : data.score,
          comment: data.comment,
          content: data.content,
          student: data.student
        });
        this.formControl.openFormEdit(data);
      },
      DELETE_SINGLE_ROW: ({ id }: ClassesAssignmentSubmissionExtend): void => {
      },
      DELETE_SELECTED_ROWS: (): void => {

      },
      SUBMIT_FORM: (): void => {
        if (
          this.formControl.canSubmit
        ) {
          const info: Partial<ClassesAssignmentSubmissionExtend> = {
            id: this.formField('id').value,
            donvi_id: this.donviId,
            // classes_assignments_id: this.formField('classes_assignments_id').value,
            // class_session_id: this.formField('class_session_id').value,
            // student_id: this.formField('student_id').value,
            // files: this.formField('files').value,
            score: this.formField('score').value,
            comment: this.formField('comment').value,
            // content: this.formField('content').value,
          };
          const message: string = this.formControl.isFormAdd
            ? 'Giao bài tập thành công'
            : 'Cập nhật thành công';
          const messageError: string = this.formControl.isFormAdd
            ? 'Giao bài không tập thành công'
            : 'Cập nhật không thành công';
          const request: Observable<any> = this.formControl.isFormAdd
            ? this.service.create(info)
            : this.service.update(this.formControl.object.id, info);
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
                  classes_assignments_id: 0,
                  class_session_id: 0,
                  student_id: 0,
                  files: [],
                  score: 0,
                  comment: '',
                  content: '',
                  student: {}
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
      },
    };

  public getControl<K extends keyof ClassesAssignmentSubmissionExtend>(key: K): FormControl<ClassesAssignmentSubmissionExtend[K]> {
    return this.formControl.formGroup.get(key as string) as FormControl<ClassesAssignmentSubmissionExtend[K]>;
  }

  ngOnInit(): void {
    if (
      !this.auth.userHasRole([
        'teaching_assistant',
        'teacher',
      ])
    ) {
      this.state.set('unauthorized');
    } else {
      const extractedInfo: ClassAssignmentCommand =
        this.activatedRoute.snapshot.queryParamMap.has('hashcode')
          ? this.decryptCode(
            this.activatedRoute.snapshot.queryParamMap.get(
              'hashcode'
            )
          )
          : null;
      if (
        extractedInfo.role &&
        [
          'teaching_assistant',
          'teacher',
        ].includes(extractedInfo.role) &&
        extractedInfo.userId === this.auth.user.id
      ) {
        this.extractedInfo.set(extractedInfo);
        this.preload().subscribe({
          next: () => {
            this.loadData();
          },
          error: () => {
            this.state.set('error');
          },
        });
      } else {
        this.state.set('invalid');
      }
    }

  }

  preload(): Observable<ClassesAssignmentExtend> {
    this.state.set('loading');
    const classSession$ = this.classSession
      ? of(this.classSession)
      : this.classSessionService.query(
        [
          {
            conditionName: 'id',
            value: this.classSessionID().toString(),
            condition: IctuQueryCondition.equal,
          },
        ],
        { with: 'course' }
      );
    const classesAssignment$ = this.classesAssignment
      ? of(this.classesAssignment)
      : this.classesAssignmentService.getOne(
        this.classAssignmentID().toString(),
        { with: 'course_lesson_test' }
      );

    return forkJoin({
      classSession: classSession$,
      classesAssignment: classesAssignment$,
    }).pipe(
      map(
        ({
          classSession,
          classesAssignment,
        }: {
          classSession: DtoObject<ClassSession[]>;
          classesAssignment: DtoObject<ClassesAssignmentExtend>;
        }): ClassesAssignmentExtend => {
          this.classesAssignment = classesAssignment.data;
          this.classSession = classSession[0];
          if (!this.classSession) {
            this.state.set('notFound');
          } else if (this.classSession.teacher_id != this.auth.user.id) {
            this.state.set('invalid');
          }

          console.log(this.classesAssignment);
          return this.classesAssignment;
        }
      )
    );
  }

  loadData(): void {
    this.state.set('loading');
    this.service
      .load(this.classAssignmentID(), this.donviId, { limit: -1, paged: 1 })
      .pipe(
        map(
          (
            res: DtoObject<ClassesAssignmentSubmissionExtend[]>
          ): ClassesAssignmentSubmissionExtend[] => {
            return res.data;
          }
        )
      )
      .subscribe({
        next: (data: ClassesAssignmentSubmissionExtend[]) => {
          this.dataTable.fillData(data);
          this.state.set('success');
        },
        error: (err) => {
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
    this.eventObserver$
      .asObservable()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(
        ({
          name,
          data,
        }: DataTableEvent<ClassesAssignmentSubmissionExtend>): void =>
          this.handelEvent[name](data)
      );
  }

  protected btnPreviewFile(file: IctuBasicFile): void {
    this.previewFileObserver$.next(file);
  }

  getAllStudentpending(): void {
    this.visibleDialogStudentpending = true;
    this.stateDialog.set('loading');
    const missingInpending = this.classesAssignment.student_ids.filter((id) => !this.dataTable.data().map((item) => item.student_id).includes(id));
    this.HSservice.query([
      {
        conditionName: 'donvi_id',
        value: this.donviId.toString(),
        condition: IctuQueryCondition.equal,
      },
    ],
      {
        include: missingInpending.length ? missingInpending.join(',') : -1
      }).pipe(
        map(
          (
            res: DtoObject<HocSinh[]>
          ): HocSinh[] => {
            return res.data;
          }
        )
      ).subscribe({
        next: (res) => {
          this.studentpending.set(res);
          this.stateDialog.set('success');
        },
        error: () => {
          this.stateDialog.set('error');
        },
      });

  }

  reload(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.preload().subscribe({
      next: () => {
        this.loadData();
      },
      error: () => {
        this.state.set('error');
      },
    });
  }

  private decryptCode(encrypted: string): ClassAssignmentCommand {
    if (encrypted) {
      try {
        const str: string = this.auth.decrypt(encrypted);
        return str
          ? Object.assign<ClassAssignmentCommand, any>(
            {
              userId: 0,
              class_session_id: 0,
              classes_assignment_id: 0,
              role: 'teacher',
            },
            JSON.parse(str)
          )
          : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  onDrawerHide(): void {
    if (this.formControl.submitted) {
      this.loadData();
    }
  }

  backToOldRouter(): void {
    void this.router.navigate(['admin/teacher/assignment']);
  }


  editRow(data: ClassesAssignmentSubmissionExtend): void {
    this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
  }

  submitForm(): void {
    this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
  }

  ngOnDestroy(): void {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

}
