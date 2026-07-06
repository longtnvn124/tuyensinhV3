import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute } from '@angular/router';
import { AppState } from '@app/models/app-state';
import { Class } from '@app/models/class';
import { ClassSession } from '@app/models/class-session';
import { Course, CourseRoutingCommand, CourseWidthLessonsAndLessonsPlan } from '@app/models/course';
import { CourseLesson } from '@app/models/course-lesson';
import { CourseLessonPlan, CourseLessonPlanContentPageItem } from '@app/models/course-lesson-plan';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { SysRoleName } from '@app/models/role';
import { AuthenticationService } from '@app/services/authentication.service';
import { ClassSessionService } from '@app/services/class-session.service';
import { ClassesService } from '@app/services/classes.service';
import { CoursesService } from '@app/services/course.service';
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { TooltipModule } from 'primeng/tooltip';
import { forkJoin, map, Subject, switchMap, takeUntil } from 'rxjs';
export interface CourseRoutingOverview {
  userId: number;
  course_id: number;
  class_id: number;
}

interface CourseLessonOverview {
  unit: string;
  lesson: string;
  page: string;
}


interface CourseOverView extends CourseWidthLessonsAndLessonsPlan {
  linhvuc: string;
  bacdaotao: string;
  course_lesson?: CourseLessonOverview[];
}
@Component({
  selector: 'app-course-overview',
  imports: [LoadingProgressComponent, CommonModule, TooltipModule, MatButton],
  templateUrl: './course-overview.component.html',
  styleUrl: './course-overview.component.css',
})
export default class CourseOverviewComponent implements OnInit, OnDestroy {
  state: WritableSignal<AppState | 'unauthorized'> = signal<AppState | 'unauthorized'>('loading');

  private auth: AuthenticationService = inject(AuthenticationService);

  private coursesService: CoursesService = inject(CoursesService);

  private classService: ClassesService = inject(ClassesService);

  private classSessionService: ClassSessionService = inject(ClassSessionService);

  private _extractedInfo: WritableSignal<CourseRoutingOverview> = signal<CourseRoutingOverview>({ userId: 0, course_id: 0, class_id: 0 });

  protected readonly course_id: Signal<number> = computed((): number => this._extractedInfo().course_id);

  protected readonly class_id: Signal<number> = computed((): number => this._extractedInfo().class_id);

  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);


  readonly course: WritableSignal<CourseOverView> = signal(null);

  readonly class: WritableSignal<Class> = signal(null);

  readonly classSesion: WritableSignal<ClassSession[]> = signal([]);

  get donViID(): number {
    return this.auth.user.donvi_id;
  }

  private destroyed$: Subject<void> = new Subject();

  ngOnInit(): void {
    const extractedInfo: CourseRoutingOverview = this.activatedRoute.snapshot.queryParamMap.has('hashcode') ? this.decryptCode(this.activatedRoute.snapshot.queryParamMap.get('hashcode')) : null;
    if (
      extractedInfo?.userId
      && extractedInfo.userId === this.auth.user.id
      && typeof extractedInfo?.course_id === 'number'
    ) {
      const acceptedRoles: SysRoleName[] = ['ceo', 'training_management', 'teacher', 'teaching_assistant'];
      if (this.auth.userHasRole(acceptedRoles)) {
        this._extractedInfo.set(extractedInfo);
      }
      else {
        this.state.set('unauthorized');
      }
    }
    else {
      this.state.set('unauthorized');
    }
    if (this.class_id() !== 0) {
      this.loadClass();
    } else {
      this.loadData();
    }
  }
  loadData(): void {
    this.state.set('loading');

    const conditions: IctuConditionParam[] = [
      {
        conditionName: 'id',
        value: this.course_id().toString(),
        condition: IctuQueryCondition.equal
      },
      {
        conditionName: 'donvi_id',
        value: this.donViID.toString(),
        condition: IctuQueryCondition.equal,
        orWhere: 'and'
      }
    ];

    const queryParams: IctuQueryParams = {
      limit: 1,
      paged: 1,
      with: 'linhvuc,bacdaotao,lesson_plan,lessons'
    };

    this.coursesService.query(conditions, queryParams)
      .pipe(
        map((response: DtoObject<Course[]>): CourseOverView[] =>
          response.data.map((item: Course): CourseOverView => {
            const slug_EXCERPT_FROM_DOCUMENT = item.lecture_format.find((f) => f.type === 'EXCERPT_FROM_DOCUMENT')?.slug ?? '';
            const courseLessons = (item['lessons'] ?? [])
              .sort((a, b) => a.ordering - b.ordering);

            const courseLessonsPlan = item['lesson_plan'] ?? [];
            return {
              ...item,
              linhvuc: item['linhvuc']['ten'] ?? '',
              bacdaotao: item['bacdaotao']['ten'] ?? '',
              lesson_plan: courseLessonsPlan,
              lessons: courseLessons,
              course_lesson: courseLessons.filter((item) => item.parent_id != 0).map((plan): CourseLessonOverview => {
                const lesson_plan_item: CourseLessonPlan = courseLessonsPlan.find((l) => l.course_lessons_id === plan.id);
                const unit: string = courseLessons.find((itemz) => itemz.id == plan.parent_id)?.title ?? '';
                // console.log(unit);
                const page: CourseLessonPlanContentPageItem = lesson_plan_item ? lesson_plan_item.content.find((c) => c.slug === slug_EXCERPT_FROM_DOCUMENT)?.page : null;
                return {
                  unit: unit,
                  lesson: plan ? plan.title : '',
                  page: page && page.start != 0 ? page.start + '-' + page.end : 'Depended on Teachers'
                };
              })
            };
          })
        ),
        takeUntil(this.destroyed$)
      )
      .subscribe({
        next: (courses: CourseOverView[]): void => {
          this.course.set(courses[0]);
          // console.log(courses[0]);
          this.state.set('success');
        },

        error: (err): void => {
          this.state.set('error');
        }
      });
  }

  loadClass(): void {
    this.state.set('loading');
    const conditions: IctuConditionParam[] = [
      {
        conditionName: 'id',
        value: this.class_id().toString(),
        condition: IctuQueryCondition.equal,
        orWhere: 'and'
      },
      {
        conditionName: 'donvi_id',
        value: this.donViID.toString(),
        condition: IctuQueryCondition.equal,
        orWhere: 'and'
      }
    ];

    const queryParams: IctuQueryParams = {
      limit: 1,
      paged: 1,
    };
    forkJoin(
      {
        class: this.classService.query(conditions, queryParams),
        courseRes: this.coursesService.query([{
          conditionName: 'id',
          value: this.course_id().toString(),
          condition: IctuQueryCondition.equal
        }], {
          limit: 1,
          paged: 1,
          with: 'linhvuc,bacdaotao'
        }),
        classSession: this.classSessionService.query([{
          conditionName: 'class_id',
          value: this.class_id().toString(),
          condition: IctuQueryCondition.equal,
          orWhere: 'and'
        }, {
          conditionName: 'parent_id',
          value: '0',
          condition: IctuQueryCondition.equal,
          orWhere: 'and'
        }], {
          limit: -1,
          paged: 1,
          with: 'teacher,assistants'
        })
      }
    )
      .pipe(
        map((res: {
          class: DtoObject<Class[]>,
          courseRes: DtoObject<Course[]>,
          classSession: DtoObject<ClassSession[]>
        }) => {
          const course: CourseOverView[] = res.courseRes.data.map(
            (item: Course): CourseOverView => ({
              ...item,
              linhvuc: item['linhvuc']?.['ten'] ?? '',
              bacdaotao: item['bacdaotao']?.['ten'] ?? '',
              lesson_plan: [],
              lessons: []
            })
          );
          return {
            class: res.class.data,
            courseRes: course,
            classSession: res.classSession.data
          }
        })
      ).subscribe({
        next: (res) => {
          this.course.set(res.courseRes[0]);
          this.class.set(res.class[0]);
          const classSessions = res.classSession
            .sort((a, b) => a.ordering - b.ordering);
          this.classSesion.set(classSessions);
          this.state.set('success');
          // console.log(res);
        },
        error(err) {
          this.state.set('error');
        },
      });
  }

  private decryptCode(encrypted: string): CourseRoutingOverview {
    if (encrypted) {
      try {
        const decryptedText: string = this.auth.decrypt(encrypted);
        return decryptedText ? Object.assign<CourseRoutingOverview, any>({ userId: 0, class_id: 0, course_id: 0 }, JSON.parse(decryptedText)) : null;
      }
      catch (e) {
        return null;
      }
    }
    return null;
  }



  backRouter(): void {
    window.history.back();
  }

  ngOnDestroy(): void {
  }


  reload(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadData();
  }

}
