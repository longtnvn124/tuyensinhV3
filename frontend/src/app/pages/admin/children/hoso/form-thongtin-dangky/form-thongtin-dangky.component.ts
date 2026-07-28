import {Component, computed, DestroyRef, inject, input, OnInit, output, signal} from '@angular/core';
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
import {DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams} from '@models/dto';
import {HosoThisinh} from '@app/models/tuyensinh/hoso-thisinh';
import {TuyensinhStatus} from '@app/models/tuyensinh/tuyensinh-status';
import {OvicImgCropV2Component} from '@app/components/ovic-img-crop-v2/ovic-img-crop-v2.component';
import { OvicAvataTypeMultipleComponent } from "@app/components/ovic-avata-type-multiple/ovic-avata-type-multiple.component";

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
    OvicAvataTypeMultipleComponent
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
    private readonly destroyRef          = inject(DestroyRef);

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


    readonly typeDiemXettuyen  = signal([
        {label: 'THPT'},
        {label: 'Trung cấp, Cao đẳng, Đại học'},
    ]);
    readonly nguonOptions: IctuDropdownOption<string>[] = [
        {value: 'website', label: 'Website'},
        {value: 'doi_tac', label: 'Đối tác'},
        {value: 'truc_tiep', label: 'Trực tiếp'},
    ];
    readonly hinhthucXT: IctuDropdownOption<string>[] = [
        {value: 'hoc_ba', label: 'Học bạ'},
        {value: 'thpt_quoc_gia', label: 'THPT Quốc gia'},
        {value: 'xet_tuyen_som', label: 'Xét tuyển sớm'},
    ];
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
        hinhthuc_xettuyen  : 'Vui lòng chọn hình thức xét tuyển.',
        donvi_chuyenmon_id : 'Vui lòng chọn đơn vị chuyên môn.',
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
            birthday         : [''],
            phone            : ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
            email            : ['', [Validators.email]],
            gioi_tinh        : ['', Validators.required],
            dan_toc          : [''],
            noi_sinh         : [''],
            tinh_id          : [null],
            xa_id            : [null],
            address          : [''],
            // Section 2: CCCD
            cccd             : ['', [Validators.required, Validators.pattern('[0-9]{12}')]],
            cccd_ngaycap     : [''],
            cccd_noicap      : [''],
            // Section 3: Van bang TN
            van_bang_tn      : [''],
            nam_tn           : [''],
            sohieu_vb        : [''],
            noicap_tn        : [''],
            // Section 4: Van bang chuyen mon
            vb_chuyenmon       : [''],
            vb_chuyenmon_nganh : [''],
            vb_chuyenmon_namtn : [''],
            vb_chuyenmon_noicap: [''],
            // Section 5: Bo sung
            nganh_dangky       : [''],
            program_id         : [null],
            hinhthuc_xettuyen  : ['hoc_ba'],
            type_diem          : [''],
            diemtb             : [''],
            donvi_chuyenmon_id : [''],
            // Hidden / system
            status             : ['cho_duyet'],
            owner_by           : [this.auth.user?.id],
            submit_from        : ['website'],
            nguon_dang_ky      : ['website'],
            content            : [''],
            // Image files
            anh_the            : [''],
            anh_cmnd_truoc     : [''],
            anh_cmnd_sau       : [''],
            anh_phieu_dang_ky  : [''],
            anh_thpt           : [''],
            anh_hoc_ba         : [[]],
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

        forkJoin({
            tinh:    this.locationSvc.queryLocation([], qp, 'regions'),
            provinces: this.locationSvc.queryLocation([], qp, 'provinces'),
            users:   this.userService.query(userCond, {limit: -1}),
            nganh:   this.apiOutsite.getNganhList(),
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({tinh, provinces, users, nganh}) => {
                    this.listTinh.set((tinh.data ?? []).map((l) => ({...l, name: l.name})));
                    this.rawProvinces = provinces.data ?? [];

                    const userList = users.data ?? [];
                    userList.forEach((u: any) => u.name_email = `${u.display_name} (${u.email})`);
                    this.listUser.set(userList);

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
    /*  Location cascade                                                   */
    /* ------------------------------------------------------------------ */
    onTinhChange(event: any): void {
        this.formData.patchValue({xa_id: null});
        this.listXa.set([]);
        if (!event) return;

        const id = event.id ?? event;
        const condition: IctuConditionParam[] = [{
            conditionName: 'parent_id',
            condition: IctuQueryCondition.equal,
            value: id.toString(),
            orWhere: 'and',
        }];

        this.locationSvc.queryLocation(condition, {limit: -1}, 'provinces')
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (res) => this.listXa.set((res.data ?? []).map((l) => ({...l, name: l.name}))),
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
                        nganh_dangky: this.majorId(),
                        program_id: this.programId(),
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

    /* ------------------------------------------------------------------ */
    /*  Keyboard helpers                                                   */
    /* ------------------------------------------------------------------ */
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
            this.hosoService.updateTuyensinh(this.dataId, raw).pipe(
                switchMap(() => {
                    const hasStatusChange = !!(raw.content || currentStatus !== raw.status);
                    if (hasStatusChange) {
                        const dataStatus: TuyensinhStatus = {
                            registration_id: this.dataId!,
                            status_key: 'XET_TUYEN',
                            status_value: raw.status,
                            status_name: raw.status,
                            content: raw.content || '',
                        };
                        return this.statusService.addTuyensinh(dataStatus);
                    }
                    return [null];
                }),
            ).subscribe({next: () => this.onSuccess(), error: () => this.onError()});
        } else {
            // CREATE
            delete raw.content;
            this.hosoService.addTuyensinh(raw).pipe(
                switchMap((newId: number) => {
                    const dataStatus: TuyensinhStatus = {
                        registration_id: newId,
                        status_key: 'XET_TUYEN',
                        status_value: 'KHOI_TAO',
                        status_name: 'Chờ duyệt',
                        content: '',
                    };
                    return this.statusService.addTuyensinh(dataStatus);
                }),
            ).subscribe({next: () => this.onSuccess(), error: () => this.onError()});
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
        this.cancel.emit();
    }

    resetForm(): void {
        this.dataId = null;
        this.cccdResult.set(null);
        this.initForm();
        this.formData.patchValue({
            status: 'cho_duyet',
            owner_by: this.auth.user?.id,
            submit_from: 'website',
            nguon_dang_ky: 'website',
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
            van_bang_tn:           (object as any).van_bang_tn || '',
            nam_tn:                (object as any).nam_tn || '',
            sohieu_vb:             (object as any).sohieu_vb || '',
            vb_chuyenmon:          object.vb_chuyenmon || '',
            vb_chuyenmon_nganh:    object.vb_chuyenmon_nganh || '',
            vb_chuyenmon_namtn:    (object as any).vb_chuyenmon_namtn || '',
            vb_chuyenmon_noicap:   object.vb_chuyenmon_noicap || '',
            nganh_dangky:          (object as any).nganh_dangky || '',
            program_id:            (object as any).program_id ?? null,
            status:                object.status || 'cho_duyet',
            owner_by:              object.owner_by || this.auth.user?.id,
        });

        // Reload wards if tinh selected
        if (object.tinh_id) {
            this.onTinhChange({id: object.tinh_id});
        }
    }
}
