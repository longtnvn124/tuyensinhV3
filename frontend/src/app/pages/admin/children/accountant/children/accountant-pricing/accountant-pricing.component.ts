import { Component, computed, inject, OnDestroy, OnInit, Signal, signal, viewChild, WritableSignal } from '@angular/core';
import { AppState } from '@app/models/app-state';
import { CoSoDaoTao } from '@app/models/co-so-dao-tao';
import { CoSoDaoTaoService } from '@app/services/co-so-dao-tao.service';
import { filter, forkJoin, map, merge, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { IctuPaginatorComponent } from "@app/theme/components/ictu-paginator/ictu-paginator.component";
import { LoadingProgressComponent } from "@app/theme/components/loading-progress/loading-progress.component";
import { AuthenticationService } from '@app/services/authentication.service';
import { DataTableEvent, DataTableEventName, IctuDataTable2 } from '@app/models/datatable';
import { Class } from '@app/models/class';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams } from '@app/models/dto';
import { ClassesService } from '@app/services/classes.service';
import { ClassExtended } from '@app/components/classes/classes';
import { EmployeePhotoPipe } from '@app/pipes/employee-photo.pipe';
import { MatTooltipModule } from "@angular/material/tooltip";
import { Employee } from '@app/models/employee';
import { Course } from '@app/models/course';
import { Pricing, PricingPlan, PricingPlanOptions, PricingPlanSession, PricingPlanSessionItem, PricingPlanSessionItemTiered, PricingPlanType, PricingType, PricingTypeOptions, TeacherPricingType } from '@app/models/pricing';
import { MatButton } from '@angular/material/button';
import { Drawer } from "primeng/drawer";
import { IctuFormControl2 } from '@app/models/ictu-form-control';
import { HelperClass } from '@app/utilities/helper';
import { PricingSearchInfo, PricingService } from '@app/services/pricing.service';
import { NotificationService } from '@app/services/notification.service';
import { DatePicker } from "primeng/datepicker";
import { IctuDropdownOption } from '@app/models/ictu-dropdown-option';
import { Select } from "primeng/select";
import { InputText } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CoursesService } from '@app/services/course.service';
import { TextareaModule } from 'primeng/textarea';
import { IctuDeletingAnimationControl } from '@app/models/ictu-deleting-animation-control';
import { CardComponent } from "@app/theme/components/card/card.component";
import { CollapsePanelComponent } from "@app/theme/components/collapse-panel.component";
import { DividerModule } from 'primeng/divider';
import { FormatVndPipe } from '@app/pipes/format-vnd.pipe';
type LearingStatisticMode = 'default' | 'pricing';


@Component({
  selector: 'app-accountant-pricing',
  imports: [
    IctuPaginatorComponent,
    LoadingProgressComponent,
    FormsModule,
    CommonModule,
    TooltipModule,
    MatMenuModule,
    EmployeePhotoPipe,
    MatTooltipModule,
    MatButton,
    Drawer,
    ReactiveFormsModule,
    DatePicker,
    Select,
    InputText,
    InputNumberModule,
    TextareaModule,
    DividerModule,
    CollapsePanelComponent,
    FormatVndPipe
  ],
  templateUrl: './accountant-pricing.component.html',
  styleUrl: './accountant-pricing.component.css',
})
export default class AccountantPricingComponent implements OnInit, OnDestroy {
  state: WritableSignal<AppState> = signal<AppState>('loading');

  private destroyed$: Subject<void> = new Subject<void>();

  readonly listAgent: WritableSignal<CoSoDaoTao[]> = signal<CoSoDaoTao[]>([]);

  readonly activeAgent: WritableSignal<CoSoDaoTao> = signal<CoSoDaoTao>(null);

  readonly activeAgentName: Signal<string> = computed((): string => this.activeAgent() ? this.activeAgent().ten : 'Chọn cơ sở đào tạo');

  private coSoDaoTaoService: CoSoDaoTaoService = inject(CoSoDaoTaoService);

  private classService: ClassesService = inject(ClassesService);

  private pricingService: PricingService = inject(PricingService);

  private courseService: CoursesService = inject(CoursesService);

  private notification: NotificationService = inject(NotificationService);

  mode: WritableSignal<LearingStatisticMode> = signal<LearingStatisticMode>('pricing');

  private readonly loadDataObserver: Subject<void> = new Subject<void>();

  public dataTable: IctuDataTable2<Pricing> = new IctuDataTable2<Pricing>();

  private auth: AuthenticationService = inject(AuthenticationService);

  private helper = new HelperClass();

  private eventObserver$: Subject<DataTableEvent<Pricing>> = new Subject<DataTableEvent<Pricing>>();

  allCourse: WritableSignal<Course[]> = signal<Course[]>([]);

  allClass: WritableSignal<Class[]> = signal<Class[]>([]);



  setMode(mode: LearingStatisticMode) {
    switch (mode) {
      case 'default':
        this.mode.set('default');
        break;
      case 'pricing':
        this.mode.set('pricing');
        break;
    }
  }

  constructor() {
    this.eventObserver$
      .asObservable()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(
        ({
          name,
          data,
        }: DataTableEvent<Pricing>): void =>
          this.handelEvent[name](data)
      );
  }

  get donViID(): number {
    return this.auth.user.donvi_id;
  }

  private fb: FormBuilder = inject(FormBuilder);

  readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

  formField(path: keyof Pricing): AbstractControl {
    return this.formControl.formGroup.get(path);
  }
  searchInfo: PricingSearchInfo = {
    type: 'COURSE'
  }

  pricingPlanOptions: IctuDropdownOption<TeacherPricingType>[] = PricingPlanOptions;
  pricingtypeOptions: IctuDropdownOption<PricingType>[] = PricingTypeOptions;

  pricingPlans: WritableSignal<PricingPlan[]> = signal<PricingPlan[]>([]);

  formControl: IctuFormControl2<Pricing> =
    new IctuFormControl2<Pricing>({
      dropdownFields: [],
      formGroup: this.fb.group({
        id: [0],
        donvi_id: [this.donViID],
        title: ['', [Validators.required]],
        note: ['',],
        csdt_id: [0],
        course_id: [0],
        class_id: [0],
        effective_date: ['', [Validators.required]],
        unit: ['PER_SESSION', [Validators.required]],
        type: ['COURSE', [Validators.required]],
        plans: []
      }),
      objectName: 'bảng giá',
      drawer: this.drawer,
    });

  private handelEvent: Record<
    DataTableEventName,
    (data: Pricing) => void
  > = {
      OPEN_FORM_ADD: (): void => {
        // const tam: PricingPlan[] = [
        //   { role: 'teacher', sessions: [{ price: 0, type: 'OFFICIAL', pricing_plan_items: [] }, { price: 0, type: 'REMEDIAL', pricing_plan_items: [] }] },
        //   { role: 'teaching_assistant', sessions: [{ price: 0, type: 'OFFICIAL', pricing_plan_items: [] }, { price: 0, type: 'REMEDIAL', pricing_plan_items: [] }] }
        // ];
        const tam: PricingPlan[] = [
          { type: 'OFFICIAL', sessions: [{ price: 0, role: 'teacher', pricing_plan_items: [] }, { price: 0, role: 'teaching_assistant', pricing_plan_items: [] }] },
          { type: 'REMEDIAL', sessions: [{ price: 0, role: 'teacher', pricing_plan_items: [] }, { price: 0, role: 'teaching_assistant', pricing_plan_items: [] }] }
        ];
        this.formControl.formGroup.reset({
          id: 0,
          donvi_id: this.donViID,
          title: '',
          note: '',
          course_id: 0,
          csdt_id: this.activeAgent().id.toString(),
          class_id: 0,
          effective_date: new Date(),
          unit: 'TIERED',
          type: 'COURSE',
          plans: tam
        });
        this.pricingPlans.set(tam);
        this.formControl.openFormAdd();
      },
      OPEN_FORM_UPDATE: (data: Pricing): void => {
        this.formControl.formGroup.reset({
          id: data.id,
          donvi_id: data.donvi_id,
          title: data.title,
          note: data.note,
          // csdt_id: data.csdt_id,
          course_id: data.course_id,
          class_id: data.class_id,
          effective_date: new Date(data.effective_date),
          unit: data.unit,
          type: data.type,
          plans: data.plans || []
        });
        const plan = this.helper.cloneObject(data.plans);
        this.pricingPlans.set(plan);
        this.formControl.openFormEdit(data);
      },
      DELETE_SINGLE_ROW: ({ id }: Pricing): void => {
        this.requestDeletingData([id]);
      },
      DELETE_SELECTED_ROWS: (): void => {
      },
      SUBMIT_FORM: (): void => {
        this.formField('plans').setValue(this.pricingPlans());
        let info: Partial<Pricing> = {
          donvi_id: this.formField('donvi_id').value,
          course_id: this.formField('course_id').value,
          title: this.formField('title').value,
          note: this.formField('note').value,
          // csdt_id: this.formField('csdt_id').value,
          class_id: this.formField('class_id').value,
          effective_date: this.helper.formatSQLDate(this.formField('effective_date').value),
          unit: this.formField('unit').value,
          type: this.formField('type').value,
          plans: this.formField('plans').value
        };
        const message: string = this.formControl.isFormAdd
          ? 'Thêm mới thành công'
          : 'Cập nhật thành công';
        const messageError: string = this.formControl.isFormAdd
          ? 'Thêm mới không thành công'
          : 'Cập nhật không thành công';
        const request: Observable<any> = this.formControl.isFormAdd
          ? this.pricingService.create(info)
          : this.pricingService.update(this.formControl.object.id, info);
        this.formControl.submit(request).subscribe({
          next: (): void => {
            this.notification.toastSuccess(
              message,
              'Thông báo'
            );
            if (this.formControl.isFormAdd) {
              const tam: PricingPlan[] = [
                { type: 'OFFICIAL', sessions: [{ price: 0, role: 'teacher', pricing_plan_items: [] }, { price: 0, role: 'teaching_assistant', pricing_plan_items: [] }] },
                { type: 'REMEDIAL', sessions: [{ price: 0, role: 'teacher', pricing_plan_items: [] }, { price: 0, role: 'teaching_assistant', pricing_plan_items: [] }] }
              ];
              this.formControl.formGroup.reset({
                id: 0,
                donvi_id: this.donViID,
                title: '',
                note: '',
                csdt_id: this.activeAgent().id.toString(),
                course_id: 0,
                class_id: 0,
                effective_date: new Date(),
                unit: 'TIERED',
                type: 'COURSE',
                plans: tam
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

  addNewItemPricing(): void {
    this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
  }

  editRowItemPricing(data: Pricing): void {
    this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
  }

  deleteRow(data: Pricing): void {
    this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
  }

  private requestDeletingData(ids: number[]): void {
    this.notification.confirmDelete(ids.length).pipe(
      filter((confirm: boolean): boolean => confirm),
      map((): IctuDeletingAnimationControl<Pricing> => new IctuDeletingAnimationControl(ids, this.pricingService)),
      switchMap((deleteController: IctuDeletingAnimationControl<Pricing>): Observable<boolean> => {
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

  submitFormItemPricing(): void {
    this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
  }

  private _changeActiveAgent(agent: CoSoDaoTao): void {
    this.activeAgent.set(agent);
  }

  protected btnChangeAgent(agent: CoSoDaoTao): void {
    if (!this.activeAgent() || this.activeAgent().id !== agent.id) {
      this._changeActiveAgent(agent);
      this.loadData(1, true);
    }
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
      switchMap(() => forkJoin({
        course: !this.allCourse().length ? this.courseService.load({ search: '' }, this.donViID, { limit: -1, paged: 1 }) : of({ data: this.allCourse() }),
        classes: this.classService.query([
          {
            conditionName: 'status',
            value: '1',
            condition: IctuQueryCondition.equal,
            orWhere: 'and',
          },
          {
            conditionName: 'parent_id',
            value: '0',
            condition: IctuQueryCondition.equal,
            orWhere: 'and',
          },
        ], { limit: -1, paged: 1, include: this.donViID, include_by: 'donvi_id' }),
        pricing: this.loadPricing(paged, resetPaginator)
      }))).pipe(map(
        ({ course, classes, pricing }) => {
          return { course, classes, pricing };
        }
      ))
      .subscribe({
        next: (res) => {
          this.allCourse.set(res.course.data.filter((item) => item.status == 1));
          this.allClass.set(res.classes.data);
          this.dataTable.fillData(res.pricing);
          this.state.set('success');
        },
        error: (): void => {
          this.state.set('error');
        }
      })
  }

  loadPricing(paged: number, resetPaginator: boolean): Observable<Pricing[]> {
    this.state.set('loading');
    return this.pricingService.load(this.searchInfo, this.donViID, { limit: 20, paged, include: this.donViID, include_by: 'donvi_id', order: 'DESC', orderby: 'created_at' }).pipe(
      map((response: DtoObject<Pricing[]>): Pricing[] => {
        if (resetPaginator) {
          this.dataTable.paginator.setupPaginator(response);
        } else {
          this.dataTable.paginator.changePage(paged);
        }
        return response.data;
      })
    );
  }



  protected avoidCloseMenuByClicking(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  ngOnInit(): void {

    this.loadData(1, true);
  }

  onChangePage(paged: number): void {
    this.loadData(paged, false);
  }

  reload(event: MouseEvent): void {
    this.loadData(this.dataTable.paginator.paged(), false);
    event.preventDefault();
    event.stopPropagation();
  }

  onDrawerHide(): void {
    if (this.formControl.submitted) {
      this.loadData(this.dataTable.paginator.paged(), false);
    }
  }

  buildRows(plan: PricingPlan): PricingPlanSessionItemTiered[] {
    const teacher = plan.sessions.find(s => s.role === 'teacher');
    const teaching_assistant = plan.sessions.find(s => s.role === 'teaching_assistant');
    const teacherItems = teacher?.pricing_plan_items || [];
    const teaching_assistantItems = teaching_assistant?.pricing_plan_items || [];
    return teacherItems.map(item => {
      let assistantItem = teaching_assistantItems.find(i => i.ordering === item.ordering);
      if (!assistantItem) {
        assistantItem = {
          ordering: item.ordering,
          price: 0,
          student_count: item.student_count
        };
        teaching_assistantItems.push(assistantItem);
      }
      assistantItem.student_count = item.student_count;
      return {
        ordering: item.ordering,
        teacherItem: item,
        teaching_assistantItem: assistantItem,
        student_count: item.student_count
      };
    });
  }

  addTier(plan: PricingPlan) {
    const teacher = plan.sessions.find(s => s.role === 'teacher');
    const teaching_assistant = plan.sessions.find(s => s.role === 'teaching_assistant');
    const lastOrdering =
      Math.max(0, ...(teacher?.pricing_plan_items?.map(i => i.ordering) || [])) + 1;
    const newItem: PricingPlanSessionItem = {
      ordering: lastOrdering,
      price: 0,
      student_count: 0
    };
    teacher.pricing_plan_items = [
      ...(teacher?.pricing_plan_items || []),
      { ...newItem }
    ];
    teaching_assistant.pricing_plan_items = [
      ...(teaching_assistant?.pricing_plan_items || []),
      { ...newItem }
    ];
    this.touchedFormFieldPlan();
  }

  removeTier(plan: PricingPlan, ordering: number) {
    plan.sessions.forEach(session => {
      session.pricing_plan_items =
        (session.pricing_plan_items || []).filter(i => i.ordering !== ordering);

      session.pricing_plan_items.forEach((item, index) => {
        item.ordering = index + 1;
      });
    });

    this.pricingPlans.update(p => [...p]);
    this.touchedFormFieldPlan();
  }

  touchedFormFieldPlan(): void {
    this.formField('plans').markAsTouched();
  }

  allClassApply(course_id: number): Class[] {
    const result = this.allClass().filter((item) => item.course_id == course_id);
    return result;
  }

  getCourseActive(course_id: number): string {
    return this.allCourse().find((item) => item.id == course_id).title ?? '';
  }

  getClassActive(class_id: number): string {
    return this.allClass().find((item) => item.id == class_id).name ?? '';
  }

  isViewPlan(sessions: PricingPlanSession): boolean {
    let result: boolean = false;
    if (sessions.pricing_plan_items.length != 0) {
      result = true
    }
    return result;
  }


  isEmptyPlan(plans: PricingPlan[]): boolean {
    let result: boolean = false;
    plans.forEach(item => {
      if (item.sessions[1].pricing_plan_items.length != 0) {
        result = true;
      }
    });
    return result;
  }

  onSearch(): void {
    this.loadData(1, true);
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

}
