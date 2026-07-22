import {Component, DestroyRef, inject, input, OnInit, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {forkJoin} from 'rxjs';
import {InputMaskModule} from 'primeng/inputmask';
import {InputNumberModule} from 'primeng/inputnumber';
import {InputTextModule} from 'primeng/inputtext';
import {Select} from 'primeng/select';
import {ButtonModule} from 'primeng/button';
import {RippleModule} from 'primeng/ripple';
import {SharedModule} from '@shared/shared.module';
import {AuthenticationService} from '@app/services/authentication.service';
import {HosoThisinhService} from '@app/services/tuyensinh/hoso-thisinh.service';
import {NotificationService} from '@app/services/notification.service';
import {DanToc, GENDER, VBTN, VBCM, DANHHIEU_TOTNGHIEP} from '@app/utilities/syscats';
import {User} from '@app/models/user';
import {UploadPlaceholderComponent} from '@app/pages/admin/children/hoso-tuyensinh/upload-placeholder/upload-placeholder.component';
import {Textarea} from 'primeng/textarea';
import {IctuDropdownOption} from '@models/ictu-dropdown-option';
import {UserService} from '@app/services/user.service';
import {LocationService} from '@app/services/location.service';
import {Locations} from '@app/models/location';
import {DtoObject, IctuConditionParam, IctuQueryCondition, IctuQueryParams} from '@models/dto';
import {HosoThisinh} from '@app/models/tuyensinh/hoso-thisinh';
import { OvicImgCropV2Component } from "@app/components/ovic-img-crop-v2/ovic-img-crop-v2.component";

@Component({
	selector: 'app-form-thongtin-dangky',
	standalone: true,
	imports: [
    InputMaskModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    RippleModule,
    Select,
    Textarea,
    ReactiveFormsModule,
    SharedModule,
    UploadPlaceholderComponent,
    OvicImgCropV2Component
],
	templateUrl: './form-thongtin-dangky.component.html',
	styleUrl: './form-thongtin-dangky.component.css',
})
export class FormThongtinDangkyComponent implements OnInit {
	/* ------------------------------------------------------------------ */
	/*  DI                                                                 */
	/* ------------------------------------------------------------------ */
	private readonly fb            = inject(FormBuilder);
	private readonly auth          = inject(AuthenticationService);
	private readonly hosoService   = inject(HosoThisinhService);
	private readonly locationSvc   = inject(LocationService);
	private readonly notification  = inject(NotificationService);
	private readonly userService   = inject(UserService);
	private readonly destroyRef    = inject(DestroyRef);

	/* ------------------------------------------------------------------ */
	/*  Inputs                                                             */
	/* ------------------------------------------------------------------ */
	readonly cccd = input<string>('');

	/* ------------------------------------------------------------------ */
	/*  Outputs                                                            */
	/* ------------------------------------------------------------------ */
	readonly saved  = output<void>();
	readonly cancel = output<void>();

	/* ------------------------------------------------------------------ */
	/*  Lookup data – signals                                              */
	/* ------------------------------------------------------------------ */
	readonly listDantoc  = signal<any[]>(DanToc);
	readonly genderOption = signal(GENDER);
	readonly listVBTN     = signal(VBTN);
	readonly listVBCM     = signal(VBCM);
	readonly listTinh     = signal<Locations[]>([]);
	readonly listHuyen    = signal<Locations[]>([]);
	readonly listXa       = signal<Locations[]>([]);
	readonly listUser     = signal<User[]>([]);
	readonly typeDiemXettuyen = signal([{label: 'THPT'}, {label: 'Trung cấp, Cao đẳng, Đại học'}]);
	readonly nguonOptions: IctuDropdownOption<string>[] = [
		{value: 'website', label: 'Website'},
		{value: 'doi_tac', label: 'Đối tác'},
		{value: 'truc_tiep', label: 'Trực tiếp'},
	];
	readonly hinhthucOptions: IctuDropdownOption<string>[] = [
		{value: 'hoc_ba', label: 'Học bạ'},
		{value: 'thpt_quoc_gia', label: 'THPT Quốc gia'},
		{value: 'xet_tuyen_som', label: 'Xét tuyển sớm'},
	];

	/* ------------------------------------------------------------------ */
	/*  Form                                                               */
	/* ------------------------------------------------------------------ */
	formData!: FormGroup;
	submitting = signal(false);
	private rawProvinces: Locations[] = [];

	readonly errorMessages: Record<string, string> = {
		full_name       : 'Vui lòng nhập họ và tên.',
		birthday        : 'Vui lòng nhập ngày sinh.',
		phone           : 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số).',
		email           : 'Vui lòng nhập địa chỉ email hợp lệ.',
		cccd            : 'Vui lòng nhập đúng CCCD',
		cccd_ngaycap    : 'Vui lòng nhập ngày cấp CCCD.',
		cccd_noicap     : 'Vui lòng nhập nơi cấp CCCD.',
		van_bang_tn     : 'Vui lòng chọn văn bằng/tốt nghiệp.',
		nam_tn          : 'Vui lòng nhập năm tốt nghiệp.',
		sohieu_vb       : 'Vui lòng nhập số hiệu văn bằng tốt nghiệp.',
		anh_the         : 'Vui lòng nhập ảnh thẻ',
		anh_phieu_dang_ky : 'Vui lòng nhập ảnh phiếu đăng ký',
		anh_cmnd_truoc   : 'Vui lòng nhập ảnh CCCD mặt trước',
		anh_cmnd_sau     : 'Vui lòng nhập ảnh CCCD mặt sau',
		anh_thpt         : 'Vui lòng nhập ảnh bằng THPT/BTVH',
	};

	/* ------------------------------------------------------------------ */
	/*  Accessors                                                          */
	/* ------------------------------------------------------------------ */
	get f() {
		return this.formData?.controls;
	}


	  danhhieu_totnghiep = DANHHIEU_TOTNGHIEP;

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
			full_name        : ['', [Validators.required, Validators.minLength(2)]],
			birthday         : [''],
			phone            : ['', [Validators.required, Validators.pattern(/^(0[35789])(\d{8})$/)]],
			email            : ['', [Validators.email]],
			dan_toc          : [''],
			cccd             : [{value: this.cccd(), disabled: !!this.cccd()}, [Validators.required, Validators.pattern('[0-9]{12}')]],
			cccd_ngaycap     : [''],
			cccd_noicap      : [''],
			tinh_id          : [null],
			huyen_id         : [null],
			xa_id            : [null],
			address          : [''],
			noi_sinh         : [''],
			van_bang_tn      : [''],
			nam_tn           : [''],
			sohieu_vb        : [''],
			vb_chuyenmon     : [''],
			vb_chuyenmon_nganh : [''],
			vb_chuyenmon_namtn : [''],
			anh_phieu_dang_ky  : [''],
			anh_thpt           : [''],
			anh_the            : [''],
			anh_cmnd_truoc     : [''],
			anh_cmnd_sau       : [''],
			anh_hoc_ba         : [''],
			status             : ['cho_duyet'],
			owner_by           : [this.auth.user.id],
			nguon_dang_ky      : ['website'],
			hinhthuc_xettuyen  : ['hoc_ba'],
			vb_chuyenmon_noicap: ['']
		});
	}

	/* ------------------------------------------------------------------ */
	/*  Data loading                                                       */
	/* ------------------------------------------------------------------ */
	private loadLookups(): void {
		const qp: IctuQueryParams = {limit: -1};

		const userCond: IctuConditionParam[] = [
			{conditionName: 'status', condition: IctuQueryCondition.notEqual, value: '-1', orWhere: 'and'},
		];

		forkJoin({
			tinh: this.locationSvc.queryLocation([], qp, 'regions'),
			provinces: this.locationSvc.queryLocation([], qp, 'provinces'),
			users: this.userService.query(userCond, {limit: -1}),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({tinh, provinces, users}) => {
					this.listTinh.set((tinh.data ?? []).map((l) => ({...l, name: l.name})));
					this.rawProvinces = provinces.data ?? [];
					const userList = users.data ?? [];
					userList.forEach((u: any) => u.name_email = `${u.display_name} (${u.email})`);
					this.listUser.set(userList);
				},
				error: () => this.notification.toastError('Không tải được dữ liệu danh mục'),
			});
	}

	/* ------------------------------------------------------------------ */
	/*  Location cascade                                                   */
	/* ------------------------------------------------------------------ */
	onTinhChange(tinhId: number | null): void {
		this.formData.patchValue({huyen_id: null, xa_id: null});
		this.listHuyen.set([]);
		this.listXa.set([]);
		if (!tinhId) return;
		const filtered = this.rawProvinces
			.filter((p) => p.parent_id === tinhId)
			.map((p) => ({...p, name: p.name}));
		this.listHuyen.set(filtered);
	}

	onHuyenChange(huyenId: number | null): void {
		this.formData.patchValue({xa_id: null});
		this.listXa.set([]);
		if (!huyenId) return;
		const cond: IctuConditionParam[] = [
			{conditionName: 'parent_id', value: `${huyenId}`, condition: IctuQueryCondition.equal},
		];
		this.locationSvc
			.queryLocation(cond, {limit: -1}, 'districts')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (res) => this.listXa.set((res.data ?? []).map((l) => ({...l, name: l.name}))),
				error: () => this.listXa.set([]),
			});
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
		delete raw.anh_phieu_dang_ky;
		delete raw.anh_thpt;
		delete raw.anh_the;
		delete raw.anh_cmnd_truoc;
		delete raw.anh_cmnd_sau;
		delete raw.anh_hoc_ba;
		delete raw.vb_chuyenmon_namtn;

		this.hosoService.addTuyensinh(raw as Partial<HosoThisinh>)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.submitting.set(false);
					this.notification.isProcessing(false);
					this.notification.toastSuccess('Đã thêm hồ sơ thành công');
					this.initForm();
					this.saved.emit();
				},
				error: () => {
					this.submitting.set(false);
					this.notification.isProcessing(false);
					this.notification.toastError('Thêm hồ sơ thất bại');
				},
			});
	}

	closeForm(): void {
		this.cancel.emit();
	}

	resetForm(): void {
		this.initForm();
	}
}
