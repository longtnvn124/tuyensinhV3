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
import {ApiOutsiteService} from '@services/tuyensinh/api-outsite.service';
import {NotificationService} from '@app/services/notification.service';
import {DanToc, GENDER, VBTN, VBCM, DANHHIEU_TOTNGHIEP} from '@app/utilities/syscats';
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
    private readonly apiOutsite          = inject(ApiOutsiteService);
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
    readonly listTinh          = signal<Locations[]>([]);
    readonly listXa            = signal<Locations[]>([]);
    readonly listUser          = signal<User[]>([]);
    readonly listNganh         = signal<IctuDropdownOption<number>[]>([]);

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
        full_name          : 'Vui lòng nhập họ và tên.',
        birthday           : 'Vui lòng nhập ngày sinh.',
        phone              : 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số).',
        email              : 'Vui lòng nhập địa chỉ email hợp lệ.',
        gioi_tinh          : 'Vui lòng chọn giới tính.',
        cccd               : 'Vui lòng nhập đúng CCCD.',
        cccd_ngaycap       : 'Vui lòng nhập ngày cấp CCCD.',
        cccd_noicap        : 'Vui lòng nhập nơi cấp CCCD.',
        van_bang_tn        : 'Vui lòng chọn văn bằng/tốt nghiệp.',
        nam_tn             : 'Vui lòng nhập năm tốt nghiệp.',
        sohieu_vb          : 'Vui lòng nhập số hiệu văn bằng tốt nghiệp.',
        nganh_dangky       : 'Vui lòng chọn ngành đăng ký.',
        anh_the            : 'Vui lòng nhập ảnh thẻ.',
        anh_phieu_dang_ky  : 'Vui lòng nhập ảnh phiếu đăng ký.',
        anh_cmnd_truoc     : 'Vui lòng nhập ảnh CCCD mặt trước.',
        anh_cmnd_sau       : 'Vui lòng nhập ảnh CCCD mặt sau.',
        anh_thpt           : 'Vui lòng nhập ảnh bằng THPT/BTVH.',
    };

    danhhieu_totnghiep = DANHHIEU_TOTNGHIEP;

    /* ------------------------------------------------------------------ */
    /*  Accessors                                                          */
    /* ------------------------------------------------------------------ */
    get f() {
        return this.formData?.controls;
    }


    constructor(){
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
        this.formData = this.fb.group({
            // Section 1: Personal
            full_name        : ['', [Validators.required, Validators.minLength(2)]],
            birthday         : ['', Validators.required],
            phone            : ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
            email            : ['', [Validators.email]],
            gioi_tinh        : ['', Validators.required],
            dan_toc          : ['', Validators.required],
            noi_sinh         : [''],
            tinh_id          : [null],
            xa_id            : [null],
            address          : [''],
            // Section 2: CCCD
            cccd             : ['', [Validators.required, Validators.pattern('[0-9]{12}')]],
            cccd_ngaycap     : [''],
            cccd_noicap      : [''],
            // Section 3: Van bang TN
            tn_vanbang      : [''],   //thpt/btvh
            tn_nam           : [''],
            tn_noicap        : [''],
            // Section 4: Van bang chuyen mon
            vb_chuyenmon       : [''],
            vb_chuyenmon_nganh : [''],
            vb_chuyenmon_nam : [''],
            vb_chuyenmon_noicap: [''],
            vb_chuyenmon_sohieu :[''],
            // Section 5: Bo sung
            nganh_id       : [''],
            ctdt_id         : [null],
            type_diem          : ['THPT'],
            diemtb             : [''],
            content            : [''],
            nguoi_tuvan_id     : [this.getDefaultNguoiTuvan()],
            dot_xet_tuyen_id   :[0],
            // Hidden / system
            status             : ['cho_duyet'],
            owner_by           : [this.auth.user?.id],
            // Image files
            anh_the            : [''],
            cccd_mattruoc     : [''],
            cccd_matsau      : [''],
            anh_phieu_dang_ky  : [''],
            anh_thpt           : [''],
            anh_hoc_ba         : [null],
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
            nganh:   this.apiOutsite.getNganhList(),
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
                        this.formData.patchValue({ dot_xet_tuyen_id: firstDot.id });
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

                    const nganhList = (nganh.data ?? []).filter((n: any) => n.type === 'nganh');
                    this.listNganh.set(nganhList.map((m: any) => ({value: m.id, label: m.title})));

                    // Nếu có data input từ parent → edit mode
                    const editData = this.data();
                    if (editData) {
                        this.getFormData(editData);
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

    /* ------------------------------------------------------------------ */
    /*  Location cascade                                                   */
    /* ------------------------------------------------------------------ */
    onTinhChange(event: any): void {

        this.formData.patchValue({xa_id: null});
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

    runCccdCheck(): void {
        const cccd = this.cccdInput().trim();
        if (!cccd) {
            this.notification.toastWarning('Vui lòng nhập số CCCD');
            return;
        }
        if (cccd.length !== 12) {
            this.notification.toastWarning('Số CCCD phải gồm đúng 12 chữ số');
            return;
        }

        this.cccdLoading.set(true);
        this.hosoService.checkCccd(cccd).subscribe({
            next: (res) => {
                this.cccdLoading.set(false);
                if (!res.found || res.record.status === 'bo_hoc') {
                    this.formData.patchValue({
                        cccd,
                        nganh_id: this.majorId(),
                        ctdt_id: this.programId(),
                    });
                    this.viewState.set('form');
                } else {

            
                    this.cccdResult.set(res.record);
                    this.viewState.set('existing');
                }
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

    getStatusLabel(status: string): string {
        const statusMap: Record<string, string> = {
            'cho_duyet': 'Chờ duyệt',
            'da_duyet': 'Đã duyệt',
            'bo_hoc': 'Bỏ học',
            'thieu_hoso': 'Thiếu hồ sơ',
            'du_dk_xet_tuyen': 'Đủ điều kiện xét tuyển',
            'khong_du_dk_xet_tuyen': 'Không đủ điều kiện',
            'trung_tuyen': 'Trúng tuyển',
            'khong_trung_tuyen': 'Không trúng tuyển',
            'chua_nhap_hoc': 'Chưa nhập học',
            'nhap_hoc_thieu': 'Nhập học thiếu thủ tục',
            'nhap_hoc_ok': 'Đã nhập học',
        };
        return statusMap[status] || status;
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
            this.formData.patchValue({diemtb: ''});
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

        // Xu ly diem_xettuyen
        if (raw.type_diem && raw.diemtb) {
            raw.diem_xettuyen = `${raw.type_diem}|${raw.diemtb}`;
        }
        delete raw.type_diem;
        delete raw.diemtb;

        if (this.dataId) {
            // UPDATE
            const currentStatus = this.cccdResult()?.status;
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
        this.formReset();
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
        this.initForm();
        this.formData.patchValue({
            status: 'cho_duyet',
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
            status: 'cho_duyet',
            owner_by: this.auth.user?.id,
            submit_from: 'website',
        });
    }

    formReset(): void {
        this.initForm();
        this.formData.patchValue({
            submit_from: 'website',
            status: 'cho_duyet',
            owner_by: this.auth.user?.id,
        });
        this.cccdResult.set(null);
        this.dataId = null;
    }

    getFormData(object: HosoThisinh): void {
        this.dataId = object.id;
        this.formData.patchValue({
            full_name:             object.full_name,
            birthday:              object.birthday || '',
            phone:                 object.phone,
            email:                 object.email || '',
            gioi_tinh:             (object as any).gioi_tinh || '',
            dan_toc:               object.dan_toc || '',
            noi_sinh:              object.noi_sinh || '',
            tinh_id:               object.tinh_id ?? null,
            xa_id:                 object.xa_id ?? null,
            address:               object.address || '',
            cccd:                  object.cccd || '',
            cccd_ngaycap:          object.cccd_ngaycap || '',
            cccd_noicap:           object.cccd_noicap || '',
            tn_vanbang:            (object as any).van_bang_tn || '',
            tn_nam:                object.vb_tn_nam || '',
            tn_noicap:             (object as any).vb_tn_noicap || '',
            vb_chuyenmon:          object.vb_chuyenmon || '',
            vb_chuyenmon_nganh:    object.vb_chuyenmon_nganh || '',
            vb_chuyenmon_nam:     (object as any).vb_chuyenmon_nam || '',
            vb_chuyenmon_noicap:   object.vb_chuyenmon_noicap || '',
            vb_chuyenmon_sohieu:   object.vb_tn_sohieu || '',
            nganh_id:              object.nganh_id ?? null,
            ctdt_id:               object.ctdt_id ?? null,
            dot_xet_tuyen_id:      object.dot_xet_tuyen_id ?? 0,
            nguoi_tuvan_id:        object.nguoi_tuvan_id ?? this.getDefaultNguoiTuvan(),
            status:                object.status || 'cho_duyet',
            owner_by:              object.owner_by || this.auth.user?.id,
            content:               (object as any).content || '',
            anh_the:               object.anh_the || '',
            cccd_mattruoc:         object.cccd_mattruoc || '',
            cccd_matsau:           object.cccd_matsau || '',
            anh_phieu_dang_ky:     object.anh_phieudangky || '',
            anh_thpt:              object.vb_tn_anh || '',
            anh_hoc_ba:            object.anh_hoc_ba || null,
        });

        // Parse diem_xettuyen back to type_diem + diemtb
        if (object.diem_xettuyen) {
            const parts = String(object.diem_xettuyen).split('|');
            if (parts.length === 2) {
                this.formData.patchValue({ type_diem: parts[0], diemtb: parts[1] });
                this.showDiemTb.set(parts[0] === 'THPT');
            }
        }

        // Reload wards if tinh selected
        if (object.tinh_id) {
            this.onTinhChange(object.tinh_id);
        }
        // Restore xa_id after onTinhChange resets it
        if (object.xa_id != null) {
            this.formData.patchValue({xa_id: object.xa_id});
        }
    }
}
