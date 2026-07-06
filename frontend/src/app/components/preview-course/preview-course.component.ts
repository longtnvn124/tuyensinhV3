import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppState } from '@app/models/app-state';
import { Course, CourseCommand } from '@app/models/course';
import { CourseLesson } from '@app/models/course-lesson';
import { DtoObject } from '@app/models/dto';
import { AuthenticationService } from '@app/services/authentication.service';
import { CourseLessonSearchInfo, CoursesLessonService } from '@app/services/course-lesson.service';
import { debounceTime, map, Subject } from 'rxjs';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { CommonModule } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { TooltipModule } from 'primeng/tooltip';
import { CourseLessonScormComponent } from '@app/pages/edit-course/children/edit-course-lessons/children/course-lesson-scorm/course-lesson-scorm.component';
import { IctuFileService } from '@app/services/ictu-file.service';
import { tokenGetter } from '@app/app.config';
import { ViewDocument } from "@app/components/view-document/view-document";
import { SafeHtmlPipe } from '@app/pipes/safe-html.pipe';
import { FileIconPipe } from "@app/pipes/file-icon.pipe";
import { FormatBytesPipe } from "@app/pipes/format-bytes.pipe";
import { IctuBasicFile } from '@app/models/file';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@app/services/notification.service';
interface CourseLessonPreview extends CourseLesson {
  urlScorm?: string;
}
@Component({
  selector: 'app-preview-course',
  imports: [LoadingProgressComponent, CommonModule, MatButton, TooltipModule, CourseLessonScormComponent, ViewDocument, SafeHtmlPipe, FileIconPipe, FormatBytesPipe],
  templateUrl: './preview-course.component.html',
  styleUrl: './preview-course.component.css',
})
export default class PreviewCourseComponent implements OnInit, OnDestroy {
  private auth: AuthenticationService = inject(AuthenticationService);

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);

  private courseLessonService: CoursesLessonService = inject(CoursesLessonService);

  private fileService: IctuFileService = inject<IctuFileService>(IctuFileService);

  private notification: NotificationService = inject(NotificationService);

  private router: Router = inject(Router);

  private destroy$: Subject<void> = new Subject<void>();

  private readonly extractedInfo: WritableSignal<CourseCommand> =
    signal(null);

  courseLessonSearchinfo: CourseLessonSearchInfo = {
    search: null
  }

  listCourseLessons: WritableSignal<CourseLesson[]> = signal<CourseLesson[]>([]);

  protected readonly courseLessonChapter: Signal<CourseLesson[]> = computed(
    (): CourseLesson[] => this.listCourseLessons()?.filter((t) => t.parent_id == 0)
  );

  private previewFileObserver$: Subject<IctuBasicFile> = new Subject<IctuBasicFile>();

  protected readonly listCourseLessonModule: Signal<CourseLesson[]> = computed(
    (): CourseLesson[] => this.listCourseLessons()?.filter((t) => t.parent_id != 0)
  );

  protected readonly courseID: Signal<number> = computed(
    (): number => this.extractedInfo()?.course.id ?? 0
  );

  protected readonly courseObject: Signal<Course> = computed(
    (): Course => this.extractedInfo()?.course ?? null
  );

  courseLessonModuleSelect: WritableSignal<Partial<CourseLessonPreview>> = signal<Partial<CourseLessonPreview>>({ id: 0 });

  readonly state: WritableSignal<
    AppState | 'unauthorized' | 'invalid' | 'notFound'
  > = signal<AppState | 'unauthorized' | 'invalid' | 'notFound'>('loading');
  ngOnInit(): void {
    if (
      !this.auth.userHasRole([
        'training_management', 'ceo'
      ])
    ) {
      this.state.set('unauthorized');
    } else {
      const extractedInfo: CourseCommand =
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
          'training_management', 'ceo'
        ].includes(extractedInfo.role) &&
        extractedInfo.userId === this.auth.user.id
      ) {
        this.extractedInfo.set(extractedInfo);
        this.loadData();
      } else {
        this.state.set('invalid');
      }
    }
  }

  private loadData(): void {
    this.state.set('loading');
    this.courseLessonService.load(this.courseLessonSearchinfo, this.auth.user.donvi_id, this.courseID(), -1).pipe(map((res: DtoObject<CourseLesson[]>): CourseLesson[] => {
      return res.data;
    })).subscribe({
      next: (data) => {
        this.listCourseLessons.set(data);
        this.state.set('success');
      },
      error: (err) => {
        this.state.set('error');
      },
    })
  }

  constructor() {
    this.previewFileObserver$
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe((file: IctuBasicFile): void => {
        this.notification.previewFile({ info: [file] });
      });
  }

  private decryptCode(encrypted: string): CourseCommand {
    if (encrypted) {
      try {
        const str: string = this.auth.decrypt(encrypted);
        return str
          ? Object.assign<CourseCommand, any>(
            {
              userId: 0,
              course: null,
              role: 'training_management',
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

  selectLesson(item: CourseLessonPreview): void {
    this.courseLessonModuleSelect.set(item);
    // console.log(this.courseLessonModuleSelect());
    if (item.type === 'SCORM') {
      this.state.set('loading');
      this.courseLessonService.unzipScorm(item.id, false).subscribe({
        next: (res) => {
          this.courseLessonModuleSelect.update(current =>
            current
              ? { ...current, urlScorm: `${res}/index.html` }
              : current
          );
          this.state.set('success');
        },
        error: () => {
          this.state.set('error');
        }
      });
    }

  }

  backToCourseList(): void {
    void this.router.navigate(['admin/training-management/courses']);
  }

  setSrcMedia(file: any): string {
    const result = !file
      ? ''
      : this.fileService.fileHostingServiceApi +
      'file/' +
      file.id +
      '?token=' +
      tokenGetter();
    return result;
  }

  reload(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadData();
  }

  protected btnPreviewFile(file: IctuBasicFile): void {
    this.previewFileObserver$.next(file);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
