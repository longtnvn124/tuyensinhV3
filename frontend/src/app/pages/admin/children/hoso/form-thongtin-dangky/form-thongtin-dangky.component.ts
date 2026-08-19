import {Component, computed, DestroyRef, Inject, inject, input, OnInit, output, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {forkJoin} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {FormsModule} from '@angular/forms';
import {InputMaskModule} from 'primeng/inputmask';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputTextModule} from 'primeng/inputtext';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {Select} from 'primeng/select';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {SharedModule} from '@shared/shared.module';
import {AuthenticationService} from '@app/services/authentication.service';
import {HosoThisinhService} from '@app/services/tuyensinh/hoso-thisinh.service';
import {TuyensinhStatusService} from '@app/services/tuyensinh/tuyensinh-status.service';
import {NganhhocService} from '@app/services/tuyensinh/nganhhoc.service';
import {ChuongtrinhDaotaoService} from '@app/services/tuyensinh/chuongtrinh-daotao.service';
import {NotificationService} from '@app/services/notification.service';
import {DanToc, GENDER, VBTN, VBCM, DANHHIEU_TOTNGHIEP, DOI_TUONG, TH_XETTUYEN} from '@app/utilities/syscats';
import {User} from '@app/models/user';
import {Textarea} from 'primeng/textarea';
import {IctuDropdownOption} from '@models/ictu-dropdown-option';
import {UserService} from '@app/services/user.service';
import {LocationService} from '@app/services/location.service';
import {Locations} from '@app/models/location';
import {IctuConditionParam, IctuQueryCondition, IctuQueryParams} from '@models/dto';
import {HosoThisinh} from '@app/models/tuyensinh/hoso-thisinh';
import {TuyensinhStatus} from '@app/models/tuyensinh/tuyensinh-status';
import {ParentsService} from '@services/tuyensinh/parents';
import {Parents} from '@app/models/tuyensinh/parents';
import {OvicImgCropV2Component} from '@app/components/ovic-img-crop-v2/ovic-img-crop-v2.component';
import { OvicAvataTypeMultipleComponent } from "@app/components/ovic-avata-type-multiple/ovic-avata-type-multiple.component";
import { DotXettuyenService } from '@app/services/tuyensinh/dot-xettuyen.service';
import { DotXettuyen } from '@app/models/tuyensinh/dot-xettuyen';

type ViewState = 'loading' | 'error' | 'cccd_check' | 'existing' | 'form';

@Component({
    selector: 'app-form-thongtin-dangky',
    standalone: true,
    imports: [
    FormsModule,
    InputMaskModule,
    InputNumberModule,
    InputTextModule,
    ProgressSpinnerModule,
    ButtonModule,
    RippleModule,
    Select,
    Textarea,
    ReactiveFormsModule,
    SharedModule,
    OvicImgCropV2Component,
    OvicAvataTypeMultipleComponent,
    DatePipe
],
    templateUrl: './form-thongtin-dangky.component.html',
    styleUrl: './form-thongtin-dangky.component.css',
})

export class FormThongtinDangkyComponent implements OnInit {
    /* ------------------------------------------------------------------ */
    /*  DI                                                                 */
    /* ------------------------------------------------------------------ */
    private readonly fb                  = inject(FormBuilder);
    private readonly auth                = inject(AuthenticationService);
    private readonly hosoService         = inject(HosoThisinhService);
    private readonly statusService       = inject(TuyensinhStatusService);
    private readonly nganhHocService      = inject(NganhhocService);
    private readonly ctdtService          = inject(ChuongtrinhDaotaoService);
    private readonly locationSvc         = inject(LocationService);
    private readonly notification        = inject(NotificationService);
    private readonly userService         = inject(UserService);
    private readonly parentsService      = inject(ParentsService);
    private readonly destroyRef          = inject(DestroyRef);
    private readonly dotXettuyenService  = inject(DotXettuyenService);

    /* ------------------------------------------------------------------ */
    /*  Inputs / Outputs                                                   */
    /* ------------------------------------------------------------------ */
    readonly data       = input<HosoThisinh | null>(null);
    readonly majorId    = input<number | null>(null);
    readonly programId  = input<number | null>(null);
    readonly saved      = output<void>();
    readonly cancel     = output<void>();

    /* ------------------------------------------------------------------ */
    /*  View state                                                        */
    /* ------------------------------------------------------------------ */
    readonly viewState    = signal<ViewState>('loading');
    readonly cccdInput    = signal<string>('');
    readonly phoneInput   = signal<string>('');
    readonly cccdLoading  = signal(false);
    readonly submitting   = signal(false);
    readonly showDiemTb    = signal(true);
    readonly listUserTuvan = signal<User[]>([]);
    readonly showNguoiTuvan = computed(() => this.isAdmin() || this.isDoitac());
    dataId: number | null = null;

    /* ------------------------------------------------------------------ */
    /*  CCCD check                                                        */
    /* ------------------------------------------------------------------ */
    private readonly cccdResult = signal<HosoThisinh | null>(null);
    readonly existingRecord     = computed(() => this.cccdResult());
    readonly cccdValid          = computed(() => this.viewState() === 'form');

    /* ------------------------------------------------------------------ */
    /*  Role flags (temporary — user will add details later)               */
    /* ------------------------------------------------------------------ */
    readonly isManager     = computed(() => this.auth.userHasRole(['admin', 'manager']));
    readonly isLanhDaoKhoa = computed(() => this.auth.userHasRole(['direction']));
    readonly canCheckByPhone = computed(() => this.auth.userHasRole(['admin', 'direction', 'manager']));
    readonly canUpdateStatus = computed(() => this.auth.userHasRole(['admin', 'manager', 'direction']));
    readonly canEdit       = computed(() => this.auth.userHasRole(['admin', 'manager', 'staff']));
    readonly canAdd        = computed(() => this.auth.userHasRole(['admin', 'manager', 'staff', 'doi-tac']));
    readonly duyetHoso     = computed(() => this.auth.userHasRole(['reviewer']));

    /* ------------------------------------------------------------------ */
    /*  Lookup data – signals                                              */
    /* ------------------------------------------------------------------ */

    readonly  isAdmin  = signal<boolean>(false);
    readonly isDoitac  = signal<boolean>(false);
    readonly isNhanVien  = signal<boolean>(false);
    readonly isDoitacNhanvien  = signal<boolean>(false);


    readonly listDantoc        = signal<any[]>(DanToc);
    readonly genderOption      = signal(GENDER);
    readonly listVBTN          = signal(VBTN);
    readonly listVBCM          = signal(VBCM);
    readonly listDoituong      = signal(DOI_TUONG);
    readonly listTinh          = signal<Locations[]>([]);
    readonly listXa            = signal<Locations[]>([]);
    readonly listUser          = signal<User[]>([]);
    readonly listNganh         = signal<IctuDropdownOption<number>[]>([]);
    readonly listChuongtrinh   = signal<IctuDropdownOption<number>[]>([]);
    readonly statusOptions: IctuDropdownOption<number>[] = TH_XETTUYEN.map(({label, value}) => ({label, value}));

    readonly listDotXetTuyen   = signal<DotXettuyen[]>([]);


    readonly typeDiemXettuyen  = signal([
        {label: 'THPT'},
        {label: 'Trung cấp, Cao đẳng, Đại học'},
    ]);
    readonly noicapCCCD: {value: string, label: string}[] = [
        {label: 'CQLHCVTTXH', value: 'CQLHCVTTXH'},
        {label: 'Bộ công an', value: 'Bộ công an'},
    ];

    private rawProvinces: Locations[] = [];


   


    /* ------------------------------------------------------------------ */
    /*  Form                                                               */
    /* ------------------------------------------------------------------ */
    formData!: FormGroup;

    readonly errorMessages: Record<string, string> = {
        ho_va_ten          : 'Vui lòng nhập họ và tên.',
        ngay_sinh          : 'Vui lòng nhập ngày sinh.',
        dien_thoai         : 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số).',
        email              : 'Vui lòng nhập địa chỉ email hợp lệ.',
        gioi_tinh          : 'Vui lòng chọn giới tính.',
        cccd               : 'Vui lòng nhập đúng CCCD.',
        ngay_cap_cccd      : 'Vui lòng nhập ngày cấp CCCD.',
        noi_cap_cccd       : 'Vui lòng nhập nơi cấp CCCD.',
        van_bang_tn        : 'Vui lòng chọn văn bằng/tốt nghiệp.',
        nam_tn             : 'Vui lòng nhập năm tốt nghiệp.',
        sohieu_vb          : 'Vui lòng nhập số hiệu văn bằng tốt nghiệp.',
        nganh_id           : 'Vui lòng chọn ngành đăng ký.',
        doituong           : 'Vui lòng chọn đối tượng tuyển sinh.',
        anh_the            : 'Vui lòng nhập ảnh thẻ.',
        anh_phieu_dang_ky  : 'Vui lòng nhập ảnh phiếu đăng ký.',
        anh_cmnd_truoc     : 'Vui lòng nhập ảnh CCCD mặt trước.',
        anh_cmnd_sau       : 'Vui lòng nhập ảnh CCCD mặt sau.',
        anh_thpt           : 'Vui lòng nhập ảnh bằng THPT/BTVH.',
        anh_soyeulylich    : 'Vui lòng nhập ảnh sơ yếu lý lịch.',
    };

    danhhieu_totnghiep = DANHHIEU_TOTNGHIEP;

    /* ------------------------------------------------------------------ */
    /*  Accessors                                                          */
    /* ------------------------------------------------------------------ */
    get f() {
        return this.formData?.controls;
    }


    constructor(){
        this.formData = this.fb.group({
            ho_va_ten: ['', [Validators.required, Validators.minLength(2)]],
            ngay_sinh: ['', Validators.required],
            dien_thoai: ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
            email: ['', Validators.email],
            gioi_tinh: ['', Validators.required],
            dan_toc: ['', Validators.required],
            noi_sinh: [null],
            dia_chi_tinh: [null],
            dia_chi_xa: [null],
            dia_chi_nha: [''],
            cccd: ['', [Validators.required, Validators.pattern('[0-9]{12}')]],
            ngay_cap_cccd: [''],
            noi_cap_cccd: [''],
            van_bang_tn: [''],
            nam_tn: [''],
            tn_noicap: [''],
            sohieu_vb: [''],
            vb_chuyenmon: [''],
            vb_chuyenmon_nganh: [''],
            vb_chuyenmon_namtn: [''],
            vb_chuyenmon_noicap: [''],
            vb_chuyenmon_sohieu: [''],
            nganh_id: [''],
            ctdt_id: [null],
            doituong: [''],
            type_diem: [null],
            diem_xettuyen: [null],
            content: [''],
            nguoi_tuvan: [this.getDefaultNguoiTuvan()],
            dotxettuyen_id: [0],
            status: [0],
            status_connent: [0],
            owner_by: [this.auth.user?.id],
            submit_from: ['website'],
            anh_the: [''],
            anh_cmnd_truoc: [''],
            anh_cmnd_sau: [''],
            anh_phieu_dang_ky: [''],
            anh_thpt: [''],
            anh_hoc_ba_uploads: [[]],
            anh_soyeulylich: [''],
            diem_cong: [0],
            diem_uutien: [0],
        });
        this.isAdmin.set(this.auth.userHasRole(['admin','direction','manager']));
        this.isDoitac.set(this.auth.userHasRole(['doi-tac']));
        this.isNhanVien.set(this.auth.userHasRole(['staff']));
        this.isDoitacNhanvien.set(this.auth.userHasRole(['doi-tac-cv']));
    }


    /* ------------------------------------------------------------------ */
    /*  Lifecycle                                                          */
    /* ------------------------------------------------------------------ */
    ngOnInit(): void {
        this.initForm();
        this.loadLookups();
    }

    /* ------------------------------------------------------------------ */
    /*  Form init                                                          */
    /* ------------------------------------------------------------------ */
    private initForm(): void {
        this.formData.reset({
            ho_va_ten: '',
            ngay_sinh: '',
            dien_thoai: '',
            email: '',
            gioi_tinh: '',
            dan_toc: '',
            noi_sinh: null,
            dia_chi_tinh: null,
            dia_chi_xa: null,
            dia_chi_nha: '',
            cccd: '',
            ngay_cap_cccd: '',
            noi_cap_cccd: '',
            van_bang_tn: '',
            nam_tn: '',
            tn_noicap: '',
            sohieu_vb: '',
            vb_chuyenmon: '',
            vb_chuyenmon_nganh: '',
            vb_chuyenmon_namtn: '',
            vb_chuyenmon_noicap: '',
            vb_chuyenmon_sohieu: '',
            nganh_id: '',
            ctdt_id: null,
            doituong: '',
            type_diem: null,
            diem_xettuyen: null,
            content: '',
            nguoi_tuvan: this.getDefaultNguoiTuvan(),
            dotxettuyen_id: 0,
            status: 0,
            status_connent: 0,
            owner_by: this.auth.user?.id,
            submit_from: 'website',
            anh_the: '',
            anh_cmnd_truoc: '',
            anh_cmnd_sau: '',
            anh_phieu_dang_ky: '',
            anh_thpt: '',
            anh_hoc_ba_uploads: [],
            anh_soyeulylich: '',
            diem_cong:0,
            diem_uutien: 0,
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Data loading                                                       */
    /* ------------------------------------------------------------------ */
    loadLookups(): void {
        const qp: IctuQueryParams = {limit: -1};
        const userCond: IctuConditionParam[] = [
            {conditionName: 'status', condition: IctuQueryCondition.notEqual, value: '-1', orWhere: 'and'},
        ];
        const dotCon:IctuConditionParam[] = [
            {conditionName: 'status', condition: IctuQueryCondition.equal, value: 'dang_mo', orWhere: 'and'},

        ]

        forkJoin({
            tinh:    this.locationSvc.queryLocation([], qp, 'regions'),
            provinces: this.locationSvc.queryLocation([], qp, 'provinces'),
            users:   this.userService.query(userCond, {limit: -1}),
            nganh:   this.nganhHocService.load({search: ''}, {limit: -1}),
            dotxet: this.dotXettuyenService.query(dotCon,{limit:1,paged:1})
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({tinh, provinces, users, nganh, dotxet}) => {
                    this.listTinh.set((tinh.data ?? []).map((l) => ({...l, name: l.name})));
                    this.rawProvinces = provinces.data ?? [];

                    const userList = users.data ?? [];
                    userList.forEach((u: any) => u.name_email = `${u.display_name} (${u.email})`);
                    this.listUser.set(userList);

                    this.listDotXetTuyen.set(dotxet.data ?? []);
                    const firstDot = (dotxet.data ?? [])[0];
                    if (firstDot) {
                        this.formData.patchValue({ dotxettuyen_id: firstDot.id });
                    }

                    // Load danh sách người tư vấn theo quyền
                    if (this.isAdmin()) {
                        this.listUserTuvan.set(userList);
                    } else if (this.isDoitac()) {
                        this.parentsService.query([{
                            conditionName: 'parent_id',
                            condition: IctuQueryCondition.equal,
                            value: this.auth.user!.id.toString(),
                            orWhere: 'and',
                        }]).subscribe({
                            next: (res) => {
                                const parentUserIds = (res.data ?? []).map((p: Parents) => p.user_id);
                                this.listUserTuvan.set(userList.filter((u: User) => parentUserIds.includes(u.id)));
                            },
                            error: () => this.listUserTuvan.set([]),
                        });
                    }

                    this.listNganh.set(
                        (nganh.data ?? [])
                            .filter((major) => major.is_active !== false)
                            .map((major) => ({value: major.id, label: major.name})),
                    );

                    // Nếu có data input từ parent → edit mode
                    const editData = this.data();
                    if (editData) {
                        this.getFormData(editData);
                        if (editData.nganh_id) {
                            this.loadChuongtrinh(editData.nganh_id, editData.ctdt_id ?? null);
                        }
                        this.viewState.set('form');
                    } else {
                        this.viewState.set('cccd_check');
                    }
                },
                error: () => {
                    this.notification.toastError('Không tải được dữ liệu danh mục');
                    this.viewState.set('error');
                },
            });
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */
    private getDefaultNguoiTuvan(): number | null {
        return (this.isAdmin() || this.isDoitac()) ? null : (this.auth.user?.id ?? null);
    }

    onNganhChange(majorId: number | null): void {
        this.formData.patchValue({ctdt_id: null});
        this.listChuongtrinh.set([]);
        if (majorId) {
            this.loadChuongtrinh(majorId);
        }
    }

    private loadChuongtrinh(majorId: number, selectedProgramId: number | null = null): void {
        this.ctdtService.load({search: ''}, majorId, {limit: -1})
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.listChuongtrinh.set(
                        (res.data ?? [])
                            .filter((program) => program.is_active !== false)
                            .map((program) => ({
                                value: program.id,
                                label: `${program.code} — ${program.name}`,
                            })),
                    );
                    if (selectedProgramId) {
                        this.formData.patchValue({ctdt_id: selectedProgramId});
                    }
                },
                error: () => this.listChuongtrinh.set([]),
            });
    }

    /* ------------------------------------------------------------------ */
    /*  Location cascade                                                   */
    /* ------------------------------------------------------------------ */
    onTinhChange(event: any): void {

        this.formData.patchValue({dia_chi_xa: null});
        this.listXa.set([]);
        if (!event) return;
        const condition: IctuConditionParam[] = [{
            conditionName: 'parent_id',
            condition: IctuQueryCondition.equal,
            value: event.toString(),
            orWhere: 'and',
        }];

        this.locationSvc.queryLocation(condition, {limit: -1}, 'provinces')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.listXa.set((res.data ?? []).map((l) => ({...l, name: l.name})))
                },
                error: () => this.listXa.set([]),
            });
    }

    /* ------------------------------------------------------------------ */
    /*  CCCD check                                                        */
    /* ------------------------------------------------------------------ */
    onCccdInputChange(value: string): void {
        this.cccdInput.set(value.replace(/\D/g, ''));
    }

    onPhoneInputChange(value: string): void {
        this.phoneInput.set(value.replace(/\D/g, ''));
    }

    runCccdCheck(): void {
        const cccd = this.cccdInput().trim();
        const phone = this.phoneInput().trim();
        if (this.canCheckByPhone() && !cccd && !phone) {
            this.notification.toastWarning('Vui lòng nhập số CCCD hoặc số điện thoại');
            return;
        }
        if (!this.canCheckByPhone() && !cccd) {
            this.notification.toastWarning('Vui lòng nhập số CCCD');
            return;
        }
        if (cccd && cccd.length !== 12) {
            this.notification.toastWarning('Số CCCD phải gồm đúng 12 chữ số');
            return;
        }
        if (phone && !/^(0[35789])(\d{8})$/.test(phone)) {
            this.notification.toastWarning('Số điện thoại không hợp lệ');
            return;
        }

        this.cccdLoading.set(true);
        this.hosoService.checkpointHoso(cccd, phone)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => {
                    this.cccdLoading.set(false);
                    if (res) {
                        this.cccdResult.set(res);
                        this.viewState.set('existing');
                        return;
                    }

                    this.cccdResult.set(null);
                    this.formData.patchValue({
                        cccd,
                        ...(this.canCheckByPhone() && phone ? {dien_thoai: phone} : {}),
                        nganh_id: this.majorId(),
                        ctdt_id: this.programId(),
                    });
                    if (this.majorId()) {
                        this.loadChuongtrinh(this.majorId()!, this.programId());
                    }
                    this.viewState.set('form');
                },
                error: () => {
                    this.cccdLoading.set(false);
                    this.notification.toastError('Kiểm tra CCCD thất bại');
                },
            });
    }

    backToCccdCheck(): void {
        this.cccdResult.set(null);
        this.viewState.set('cccd_check');
    }

    getStatusLabel(status: number): string {
        return TH_XETTUYEN.find((item) => item.value === status)?.label ?? `${status}`;
    }

    getNganhLabel(majorId: number | null | undefined): string {
        if (!majorId) return 'Chưa có';
        const found = this.listNganh().find(n => n.value === majorId);
        return found ? found.label : `Mã ngành #${majorId}`;
    }

    /* ------------------------------------------------------------------ */
    /*  Keyboard helpers                                                   */
    /* ------------------------------------------------------------------ */
    onTypeDiemChange(event: any): void {
        const isTHPT = event?.value === 'THPT';
        this.showDiemTb.set(isTHPT);
        if (!isTHPT) {
            this.formData.patchValue({diem_xettuyen: null});
        }
    }
    keyupCheckFirstCode(event: KeyboardEvent): boolean {
        if (!event) return true;
        if (event.key === 'v' && event.ctrlKey) return true;
        return /[0-9]/.test(event.key) || event.key === 'Backspace';
    }

    /* ------------------------------------------------------------------ */
    /*  Submit                                                             */
    /* ------------------------------------------------------------------ */
    submitData(): void {
        if (this.formData.invalid) {
            for (const key of Object.keys(this.errorMessages)) {
                if (this.formData.get(key)?.invalid) {
                    this.notification.toastError(this.errorMessages[key]);
                    break;
                }
            }
            return;
        }

        this.submitting.set(true);
        this.notification.isProcessing(true);

        const raw: any = {...this.formData.getRawValue()};
        raw.diem_xettuyen = raw.diem_xettuyen == null || raw.diem_xettuyen === ''
            ? null
            : Number(raw.diem_xettuyen);
        raw.anh_hoc_ba = JSON.stringify(raw.anh_hoc_ba_uploads ?? []);
        delete raw.type_diem;
        delete raw.anh_hoc_ba_uploads;
        if (!this.canUpdateStatus()) {
            if (this.dataId) {
                delete raw.status;
            } else {
                raw.status = 0;
            }
        }

        if (this.dataId) {
            // UPDATE
            this.hosoService.updateTuyensinh(this.dataId, raw).subscribe({
                next: () => this.onSuccess(), 
                error: () => this.onError()
            });
        } else {
            // CREATE
            delete raw.content;
            // return;
            this.hosoService.addTuyensinh(raw).subscribe({
                next: () => this.onSuccess(), 
                error: () => {
                    this.onError()
                }
            });
        }
    }

    private onSuccess(): void {
        this.submitting.set(false);
        this.notification.isProcessing(false);
        this.notification.toastSuccess(this.dataId ? 'Cập nhật thành công' : 'Đã thêm hồ sơ thành công');
        const isCreate = !this.dataId;
        this.formReset();
        if (isCreate) {
            this.cccdInput.set('');
            this.phoneInput.set('');
            this.viewState.set('cccd_check');
        }
        this.saved.emit();
    }

    private onError(): void {
        this.submitting.set(false);
        this.notification.isProcessing(false);
        this.notification.toastError(this.dataId ? 'Cập nhật thất bại' : 'Thêm hồ sơ thất bại');
    }

    /* ------------------------------------------------------------------ */
    /*  Form management                                                    */
    /* ------------------------------------------------------------------ */
    closeForm(): void {
        // this.initForm();
        this.formData.patchValue({
            status: 0,
            owner_by: this.auth.user?.id,
            submit_from: 'website',
        });
        this.viewState.set('cccd_check');
    }

    resetForm(): void {
        this.dataId = null;
        this.cccdResult.set(null);
        this.initForm();
        this.formData.patchValue({
            status: 0,
            owner_by: this.auth.user?.id,
            submit_from: 'website',
        });
    }

    formReset(): void {
        this.initForm();
        this.formData.patchValue({
            submit_from: 'website',
            status: 0,
            owner_by: this.auth.user?.id,
        });
        this.cccdResult.set(null);
        this.dataId = null;
    }

    getFormData(object: HosoThisinh): void {
        this.dataId = object.id;
        this.formData.patchValue({
            ho_va_ten: object.ho_va_ten,
            ngay_sinh: object.ngay_sinh || '',
            dien_thoai: object.dien_thoai,
            email: object.email || '',
            gioi_tinh: object.gioi_tinh || '',
            dan_toc: object.dan_toc || '',
            noi_sinh: object.noi_sinh ?? null,
            dia_chi_tinh: object.dia_chi_tinh ?? null,
            dia_chi_xa: object.dia_chi_xa ?? null,
            dia_chi_nha: object.dia_chi_nha || '',
            cccd: object.cccd || '',
            ngay_cap_cccd: object.ngay_cap_cccd || '',
            noi_cap_cccd: object.noi_cap_cccd || '',
            van_bang_tn: object.van_bang_tn || '',
            nam_tn: object.nam_tn || '',
            tn_noicap: object.tn_noicap || '',
            sohieu_vb: object.sohieu_vb || '',
            vb_chuyenmon: object.vb_chuyenmon || '',
            vb_chuyenmon_nganh: object.vb_chuyenmon_nganh || '',
            vb_chuyenmon_namtn: object.vb_chuyenmon_namtn || '',
            vb_chuyenmon_noicap: object.vb_chuyenmon_noicap || '',
            vb_chuyenmon_sohieu: object.vb_chuyenmon_sohieu || '',
            nganh_id: object.nganh_id ?? null,
            ctdt_id: object.ctdt_id ?? null,
            doituong: object.doituong,
            diem_xettuyen: object.diem_xettuyen ?? null,
            dotxettuyen_id: object.dotxettuyen_id ?? 0,
            nguoi_tuvan: object.nguoi_tuvan ?? this.getDefaultNguoiTuvan(),
            status: object.status ?? 0,
            status_connent: object.status_connent ?? 0,
            owner_by: object.owner_by || this.auth.user?.id,
            submit_from: object.submit_from || 'website',
            content: object.content || '',
            anh_the: object.anh_the || '',
            anh_cmnd_truoc: object.anh_cmnd_truoc || '',
            anh_cmnd_sau: object.anh_cmnd_sau || '',
            anh_phieu_dang_ky: object.anh_phieu_dang_ky || '',
            anh_thpt: object.anh_thpt || '',
            anh_hoc_ba_uploads: this.parseAnhHocBa(object.anh_hoc_ba),
            anh_soyeulylich: object.anh_soyeulylich || '',
            diem_cong: object.diem_cong || 0,
            diem_uutien: object.diem_uutien || 0,

        });
        this.showDiemTb.set(true);

        if (object.dia_chi_tinh) {
            this.onTinhChange(object.dia_chi_tinh);
        }
        if (object.dia_chi_xa != null) {
            this.formData.patchValue({dia_chi_xa: object.dia_chi_xa});
        }
    }

    private parseAnhHocBa(value?: string): string[] {
        if (!value) return [];
        try {
            const parsed: unknown = JSON.parse(value);
            return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
        } catch {
            return [];
        }
    }
}
