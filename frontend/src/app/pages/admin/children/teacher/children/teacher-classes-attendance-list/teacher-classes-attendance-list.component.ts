import { Component , OnDestroy , OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule , ReactiveFormsModule } from '@angular/forms';

import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';

type DiemDanhMode = 'listDF' | 'listDiemDanh';

@Component( {
	selector    : 'teacher-classes-attendance-list' ,
	standalone  : true ,
	imports: [
    ReactiveFormsModule,
    FormsModule,
    DatePickerModule,
    ButtonModule,
    MatDialogModule,
    CheckboxModule,
    DialogModule,
    MatMenuModule,
    MatIconModule,
    MatButtonModule
] ,
	templateUrl : './teacher-classes-attendance-list.component.html' ,
	styleUrl    : './teacher-classes-attendance-list.component.css'
} )
export default class TeacherClassesAttendanceListComponent
	implements OnInit , OnDestroy {
	// visibleDialog: boolean = false;
	// private auth: AuthenticationService = inject(AuthenticationService);
	// private notification: NotificationService = inject(NotificationService);
	// private hocSinhservice: HocSinhLopHocService = inject(HocSinhLopHocService);
	// private diemdanhService: DiemDanhService = inject(DiemDanhService);

	// get donviId(): number {
	//     return this.auth.user.donvi_id;
	// }

	// optionsTrangThai: IctuDropdownOption<string>[] = [
	//     { value: 'UNEXCUSED', label: 'Nghỉ không phép' },
	//     { value: 'LATE', label: 'Đi muộn' },
	//     { value: 'EXCUSED', label: 'Nghỉ có phép' },
	//     { value: 'PRESENT', label: 'Đi học' },
	// ];

	// @Output() modeUpdated = new EventEmitter<{
	//     mode: DiemDanhMode;
	// }>();

	// changeMode(mode: DiemDanhMode) {
	//     this.modeUpdated.emit({ mode });
	// }

	// state: WritableSignal<AppState> = signal<AppState>('loading');
	// private fb: FormBuilder = inject(FormBuilder);
	// @ViewChild('dialogTemplate') dialogTemplate!: TemplateRef<any>;
	// readonly drawer: Signal<Drawer> = viewChild<Drawer>('pDrawer');

	// formControl: IctuFormControl2<DiemDanh> = new IctuFormControl2<DiemDanh>({
	//     dropdownFields: [],
	//     formGroup: this.fb.group({
	//         calendar_id: [0],
	//         donvi_id: [0],
	//         csdt_id: [0],
	//         phuhuynh_id: [0],
	//         class_id: [0],
	//         hocsinh_id: [0, [Validators.required, Validators.min(1)]],
	//         content: [''],
	//         status: [0, [Validators.required, Validators.min(0)]],
	//     }),
	//     objectName: 'điểm danh',
	//     drawer: this.drawer,
	// });

	// private handelEvent: Record<DataTableEventName, (data: DiemDanh) => void> =
	//     {
	//         OPEN_FORM_ADD: (): void => {},
	//         OPEN_FORM_UPDATE: (data: DiemDanh): void => {},
	//         DELETE_SINGLE_ROW: ({ id }: DiemDanh): void => {
	//             this.notification.clearToast();
	//         },
	//         DELETE_SELECTED_ROWS: (): void => {},
	//         SUBMIT_FORM: (): void => {
	//             const info: Partial<DiemDanh> = {};
	//             const request: Observable<DiemDanh> = this.formControl.isFormAdd
	//                 ? this.diemdanhService.create(info)
	//                 : this.diemdanhService.update(
	//                       this.formControl.object.id,
	//                       info
	//                   );
	//             const message: string = this.formControl.isFormAdd
	//                 ? 'Thêm mới thành công'
	//                 : 'Cập nhật thành công';
	//             this.formControl.submit(request).subscribe({
	//                 next: (): void => {
	//                     this.openAndCloseDialog();
	//                     this.notification.toastSuccess(message, 'Thông báo');
	//                     this.loadData(1, true);
	//                 },
	//                 error: (): void => {
	//                     this.notification.toastError(message, 'Thông báo');
	//                 },
	//             });
	//             this.formControl.formGroup.reset({
	//                 giaovien: '',
	//                 trogiang: '',
	//                 donvi_id: [this.donviId],
	//                 phonghoc: '',
	//                 diadiem_phonghoc: '',
	//                 lophoc: '',
	//                 type: 0,
	//                 time_start: '',
	//                 content: '',
	//                 reason: '',
	//                 status: 0,
	//             });
	//         },
	//     };

	// private eventObserver$: Subject<DataTableEvent<DiemDanh>> = new Subject<
	//     DataTableEvent<DiemDanh>
	// >();

	// private onDestroy$: Subject<string> = new Subject<string>();

	// private _temp: { paged: number; resetPaginator: boolean } = {
	//     paged: 1,
	//     resetPaginator: true,
	// };

	// dataTable: IctuDataTable<HocSinhLopHoc> =
	//     new IctuDataTable<HocSinhLopHoc>();
	// listDiemDanh: DiemDanh[] = [];
	// permissionControl: Signal<IctuPermissionControl> =
	//     signal<IctuPermissionControl>(
	//         new IctuPermissionControl(
	//             this.auth.getUserPermission('teacher/calendar')
	//         )
	//     );

	// constructor() {
	//     this.eventObserver$
	//         .asObservable()
	//         .pipe(takeUntil(this.onDestroy$))
	//         .subscribe(({ name, data }: DataTableEvent<DiemDanh>): void =>
	//             this.handelEvent[name](data)
	//         );
	// }

	// formField(path: keyof LichHoc): AbstractControl {
	//     return this.formControl.formGroup.get(path);
	// }

	// today = new Date();

	ngOnInit () : void {
		// this.loadData(1, true);
	}

	// private requestDeletingData(ids: number[]): void {
	//     this.notification
	//         .confirmDelete(ids.length)
	//         .pipe(
	//             filter((confirm: boolean): boolean => confirm),
	//             map(
	//                 (): IctuDeletingAnimationControl<DiemDanh> =>
	//                     new IctuDeletingAnimationControl(
	//                         ids,
	//                         this.diemdanhService
	//                     )
	//             ),
	//             switchMap(
	//                 (
	//                     deleteController: IctuDeletingAnimationControl<DiemDanh>
	//                 ): Observable<boolean> => {
	//                     deleteController.run();
	//                     return this.notification.startDeleting(
	//                         deleteController.progress
	//                     );
	//                 }
	//             )
	//         )
	//         .subscribe({
	//             next: (success: boolean): void => {
	//                 if (success) {
	//                     this.notification.toastSuccess('Xóa thành công');
	//                 }
	//                 this.loadData(1, true);
	//             },
	//             error: (): void => {
	//                 this.notification.toastError('Xóa thất bại');
	//             },
	//         });
	// }

	// loadData(paged: number = 1, resetPaginator: boolean = true): void {
	//     this.state.set('loading');
	//     this._temp = { paged, resetPaginator };
	//     forkJoin([
	//         this.hocSinhservice.load(24, this.donviId, {
	//             limit: -1,
	//             paged: 1,
	//         }),
	//         this.diemdanhService.load(4, this.donviId, {
	//             limit: -1,
	//             paged,
	//         }),
	//     ])
	//         .pipe(
	//             map(
	//                 ([res1, res2]: [
	//                     DtoObject<HocSinhLopHoc[]>,
	//                     DtoObject<DiemDanh[]>
	//                 ]) => {
	//                     return {
	//                         listHS: res1.data,
	//                         listDiemDanh: res2.data,
	//                     };
	//                 }
	//             )
	//         )
	//         .subscribe({
	//             next: ({ listHS, listDiemDanh }) => {
	//                 this.dataTable.fillData(listHS);
	//                 this.listDiemDanh = listDiemDanh.map((item) => ({
	//                     ...item,
	//                 }));
	//                 for (let i = 0; i < this.dataTable.data().length; i++) {
	//                     const tam = this.listDiemDanh.find(
	//                         (item) =>
	//                             item.hocsinh_id ==
	//                             this.dataTable.data()[i].hocsinh_id
	//                     );
	//                     if (tam) {
	//                         this.dataTable.data()[i].diemdanh = tam;
	//                     } else {
	//                         this.dataTable.data()[i].diemdanh = {
	//                             hocsinh_id: 0,
	//                             status: 'PRESENT',
	//                         } as DiemDanh;
	//                     }
	//                 }
	//                 this.state.set('success');
	//             },
	//             error: () => {
	//                 this.state.set('error');
	//             },
	//         });
	// }

	// createReasonUpdateCalendar(
	//     reasonstring: string,
	//     reason: Reason[]
	// ): Reason[] {
	//     let result = [];
	//     if (reason) {
	//         for (let item of reason) {
	//             if (item.name == this.auth.employee.full_name) {
	//                 item.reason = reasonstring;
	//             }
	//         }
	//         result = reason;
	//     } else {
	//         result.push({
	//             name: this.auth.employee.full_name,
	//             reason: reasonstring,
	//         });
	//     }
	//     return result;
	// }

	// deleteRow(data: DiemDanh): void {
	//     this.eventObserver$.next({ name: 'DELETE_SINGLE_ROW', data });
	// }

	// deleteSelectedRows(): void {
	//     this.eventObserver$.next({ name: 'DELETE_SELECTED_ROWS', data: null });
	// }

	// editRow(data: DiemDanh): void {
	//     this.openAndCloseDialog();
	//     this.eventObserver$.next({ name: 'OPEN_FORM_UPDATE', data });
	// }

	// openAndCloseDialog(): void {
	//     this.visibleDialog = !this.visibleDialog;
	// }

	// reload(event: MouseEvent): void {
	//     this.loadData(this._temp.paged, this._temp.resetPaginator);
	//     event.preventDefault();
	//     event.stopPropagation();
	// }

	// addNewItem(): void {
	//     this.eventObserver$.next({ name: 'OPEN_FORM_ADD', data: null });
	// }

	// submitForm(): void {
	//     this.eventObserver$.next({ name: 'SUBMIT_FORM', data: null });
	// }

	// onChangePage(paged: number): void {
	//     this.loadData(paged, false);
	// }

	// onDrawerHide(): void {
	//     if (this.formControl.submitted) {
	//         this.loadData(1, true);
	//     }
	// }

	// @Output() modeUpdatedGV = new EventEmitter<{
	//     mode: DiemDanhMode;
	// }>();

	// changeModeGV(mode: DiemDanhMode) {
	//     this.modeUpdatedGV.emit({ mode });
	// }

	// shortenText(text: string): string {
	//     return text.length > 15 ? text.slice(0, 15) + '...' : text;
	// }

	// submitDiemDanh(row: HocSinhLopHoc): void {
	//     this.state.set('loading');
	//     let info: Partial<DiemDanh> = {
	//         class_session_id: 4,
	//         donvi_id: this.donviId,
	//         csdt_id: 1,
	//         phuhuynh_id: row.hocsinh.phuhuynh_id,
	//         class_id: 23,
	//         hocsinh_id: row.hocsinh.id,
	//         reason: row.diemdanh.reason,
	//         status: row.diemdanh.status,
	//         comment: row.diemdanh.comment,
	//     };
	//     const tam = this.dataTable
	//         .data()
	//         .find((item) => item.diemdanh.hocsinh_id == info.hocsinh_id);
	//     const request: Observable<DiemDanh> = !tam
	//         ? this.diemdanhService.create(info)
	//         : this.diemdanhService.update(row.diemdanh.id, info);
	//     const message: string = 'Cập nhật thành công';
	//     request.subscribe({
	//         next: (): void => {
	//             this.notification.toastSuccess(message, 'Thông báo');
	//             this.loadData(1, true);
	//             this.state.set('success');
	//         },
	//         error: (): void => {
	//             this.notification.toastError(
	//                 'Cập nhật không thành công',
	//                 'Thông báo'
	//             );
	//             this.state.set('success');
	//         },
	//     });
	// }

	// updateStatusDiemDanh(
	//     status: 'PRESENT' | 'UNEXCUSED' | 'EXCUSED' | 'LATE',
	//     index: number
	// ): void {
	//     this.dataTable.data()[index].diemdanh.status = status;
	//     if (status == 'PRESENT') {
	//         this.dataTable.data()[index].diemdanh.reason = '';
	//     }
	//     this.submitDiemDanh(this.dataTable.data()[index]);
	// }

	ngOnDestroy () : void {
		// this.onDestroy$.next('OnDestroy');
		// this.onDestroy$.complete();
	}
}
