import {Component, Input, OnInit} from '@angular/core';
import {InputMaskModule} from "primeng/inputmask";
import {NgClass, NgIf} from "@angular/common";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {SharedModule} from "@shared/shared.module";
import {DanToc, GENDER, TH_XETTUYEN, VBCM, VBTN} from "@shared/utils/syscat";
import {ButtonModule} from "primeng/button";
import {RippleModule} from "primeng/ripple";
import {Tuyensinh} from "@shared/models/tuyen-sinh/tuyensinh";
import {AuthService} from "@core/services/auth.service";
import {TuyensinhService} from "@shared/services/tuyen-sinh/tuyensinh.service";
import {DiaDanh} from "@shared/models/location";
import {OvicQueryCondition} from "@core/models/dto";
import {HttpParamsHeplerService} from "@core/services/http-params-hepler.service";
import {LocationService} from "@shared/services/location.service";
import {NotificationService} from "@core/services/notification.service";
import {forkJoin, of, switchMap} from "rxjs";
import {ElngUserProfileService} from "@shared/services/elearning-user-profile.service";
import {DonViService} from "@shared/services/don-vi.service";
import {NganhTuyensinhService} from "@shared/services/nganh-tuyensinh.service";
import {UserService} from "@core/services/user.service";
import {DonVi} from "@shared/models/don-vi";
import {NganhTuyensinh} from "@shared/models/nganh_tuyensinh";
import {User} from "@core/models/user";
import {ConditionOption} from "@shared/models/condition-option";
import {InputNumberModule} from "primeng/inputnumber";
import {GalleriaModule} from "primeng/galleria";
import {ImageModule} from "primeng/image";
import {OvicAvataTypeThptComponent} from "@shared/components/ovic-avata-type-thpt/ovic-avata-type-thpt.component";
import {MatProgressBarModule} from "@angular/material/progress-bar";
import {
    OvicAvataTypeMultipleComponent
} from "@shared/components/ovic-avata-type-multiple/ovic-avata-type-multiple.component";
import {TuyensinhStatus} from "@shared/models/tuyen-sinh/tuyensinh-status";
import {TuyensinhStatusService} from "@shared/services/tuyen-sinh/tuyensinh-status.service";
import {InputTextModule} from "primeng/inputtext";
import {InputTextareaModule} from "primeng/inputtextarea";

@Component({
    selector: 'app-form-thongtin-dangky',
    templateUrl: './form-thongtin-dangky.component.html',
    styleUrls: ['./form-thongtin-dangky.component.css'],
    imports: [
        InputMaskModule,

        NgIf,
        ReactiveFormsModule,
        SharedModule,
        ButtonModule,
        RippleModule,
        NgClass,
        InputNumberModule,
        GalleriaModule,
        ImageModule,
        OvicAvataTypeThptComponent,
        MatProgressBarModule,
        OvicAvataTypeMultipleComponent,
        InputTextModule,
        InputTextareaModule
    ],
    standalone: true
})
export class FormThongtinDangkyComponent implements OnInit {
    @Input() set data(item: Tuyensinh) {

        this.formReset()
        this.cccdValid= false;
        this.cccdCheckValue = item;
        this.tuyensinh_select = item;
        this.loadInit()
    }
    @Input() formData:FormGroup;

    @Input() showStatus: boolean =false;
    @Input() disable : boolean = false;


    list_citys  : DiaDanh[];
    list_wards  : DiaDanh[];

    th_choduyet = TH_XETTUYEN;

    list_VBTN   : { value: string, label: string }[]= VBTN;
    list_VBCM   : { value: string, label: string }[]= VBCM;
    genderOption = GENDER;
    list_dantoc = DanToc;
    donvi_chuyenmon_id: number;


    tuyensinh_select    : Tuyensinh;
    isManager           : boolean = false;
    isLanhDaoKhoa       : boolean = false;
    canAdd              : boolean = false;
    canEdit             : boolean = false;
    duyet_ho_so         : boolean = false;
    userId              : number = 0
    // formData            : FormGroup;

    list_hinhthuc_xt    : {label:string,value:string}[] = [
        {label:'Đại học', value:'dh'},
        {label:'Đh liên thông từ Tc', value:'dh_lt_tc'},
        {label:'Đh liên thông từ CĐ', value:'dh_lt_cd'},
        {label:'Văn bằng 2', value:'vb2'},
    ]


    errorMessages = {
        ho_va_ten: 'Vui lòng nhập họ và tên.',
        gioi_tinh: 'Vui lòng chọn giới tính.',
        ngay_sinh: 'Vui lòng nhập ngày sinh.',
        noi_sinh: 'Vui lòng chọn nơi sinh.',
        dan_toc: 'Vui lòng chọn dân tộc.',
        dien_thoai: 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số).',
        email: 'Vui lòng nhập địa chỉ email hợp lệ.',
        dia_chi_tinh: 'Vui lòng chọn tỉnh/thành phố.',
        dia_chi_huyen: 'Vui lòng chọn quận/huyện.',
        dia_chi_xa: 'Vui lòng chọn xã/phường.',
        dia_chi_nha: 'Vui lòng nhập địa chỉ báo nhập học khi trúng tuyển.',
        cccd: "Vui lòng nhập đúng CCCD",
        ngay_cap_cccd: 'Vui lòng nhập ngày cấp CCCD.',
        noi_cap_cccd: 'Vui lòng nhập nơi cấp CCCD.',
        van_bang_tn: 'Vui lòng chọn văn bằng/tốt nghiệp.',
        nam_tn: 'Vui lòng nhập năm tốt nghiệp.',
        sohieu_vb: 'Vui lòng nhập số hiệu văn bằng tốt nghiệp.',
        nganh_dangky: 'Vui lòng chọn ngành đăng ký.',
        anh_the: 'Vui lòng nhập ảnh thẻ',
        anh_phieu_dang_ky: 'Vui lòng nhập ảnh phiếu đăng ký',
        anh_cmnd_truoc: 'Vui lòng nhập ảnh CCCD mặt trước',
        anh_cmnd_sau: 'Vui lòng nhập ảnh CCCD mặt sau',
        anh_thpt: 'Vui lòng nhập ảnh bằng THPT/BTVH',
    };
    listNoiCapCCCD: { label: string, value: string }[] = [
        {label: 'CCSQLHCVTTXH', value: 'ccsqlhcvttxh',},
        {label: 'Bộ công an', value: 'bocongan',}
    ]
    list_tuyensinh          : Tuyensinh[];

    list_donvi_chuyenmon    : DonVi[];
    list_nganh_tuyensinh    : NganhTuyensinh[];
    list_user_doitac        : User[];
    list_user_so_huu        : User[];
    cccdValid               : boolean = false;
    displayBasic            : boolean = false;
    cccdCheckValue          : Tuyensinh;

    responsiveOptions: any[] = [
        {
            breakpoint: '1024px',
            numVisible: 5
        },
        {
            breakpoint: '960px',
            numVisible: 4
        },
        {
            breakpoint: '768px',
            numVisible: 3
        },
        {
            breakpoint: '560px',
            numVisible: 1
        }
    ];
    type_diem_xettuyen = [
        { label: 'THPT' },
        { label: 'Trung cấp, Cao đẳng, Đại học' }
    ]

    selectedTH: any;


    constructor(
        private fb: FormBuilder,
        private auth: AuthService,
        private tuyensinhService: TuyensinhService,
        private httpHelper: HttpParamsHeplerService,
        private locationService: LocationService,
        private noitifi: NotificationService,
        private elngUserProfileService: ElngUserProfileService,
        private donViService: DonViService,
        private nganhTuyensinhService: NganhTuyensinhService,
        private userService: UserService,
        private tuyensinhStatusService: TuyensinhStatusService
    ) {
        this.isManager = this.auth.userHasRole('admints_dttx') || this.auth.userHasRole('admin_tuyensinh_v2');
        this.isLanhDaoKhoa = this.auth.userHasRole('fact_leader');
        this.canAdd = this.auth.userCanAdd('dulieu-tuyensinh');
        this.canEdit = this.auth.userCanEdit('dulieu-tuyensinh');
        this.duyet_ho_so = this.auth.userHasRole('duyet_hoso');
        this.userId = this.auth.user.id;
        // this.formData = this.fb.group(
        //     {
        //         ho_va_ten: ['', Validators.required],
        //         gioi_tinh: ['', Validators.required],
        //         ngay_sinh: ['', Validators.required],
        //         noi_sinh: ['', Validators.required],
        //         dan_toc: ['', Validators.required],
        //         cccd: ['', [Validators.required, Validators.pattern('[0-9]{9,12}')]],
        //         ngay_cap_cccd: [''],
        //         noi_cap_cccd: [''],
        //         dien_thoai: ['', Validators.required],
        //         email: ['', [Validators.pattern('[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$')]],
        //         dia_chi_tinh: ['', ],
        //         dia_chi_huyen: ['', ],
        //         dia_chi_xa: ['' ],
        //         dia_chi_nha: ['' ],
        //         van_bang_tn: ['', Validators.required],
        //         nam_tn: ['', Validators.required],
        //         sohieu_vb: [''],
        //         vb_chuyenmon: [''],
        //         vb_chuyenmon_nganh: [''],
        //         vb_chuyenmon_namtn: [''],
        //         anh_phieu_dang_ky: [''],
        //         anh_thpt: [''],
        //         anh_the: [''],
        //         anh_cmnd_truoc: [''],
        //         anh_cmnd_sau: [''],
        //         anh_hoc_ba: [''],
        //         submit_from: [''],
        //         donvi_chuyenmon_id: [''],
        //         status: [''],
        //         nganh_dangky: [''],
        //         owner_by: [''],
        //         content: [''],
        //         type_diem: [''],
        //         diemtb: [''],
        //         noicap_tn:['', ],
        //         vb_noicap:['', ],
        //         hinhthuc_xettuyen:['',]
        //     }
        // );
    }

    ngOnInit(): void {
    }

    get f() {
        return this.formData?.controls;
    }

    ngView : 0|1|-1 = 0;


    loadInit() {
        // this.formData = this.formClone;
        if(this.disable) {
            this.formData.get['noicap_tn']?.disable();
            this.formData.get['vb_noicap']?.disable();
        }

        this.ngView = 0
        const condition_donvi = this.httpHelper.paramsConditionBuilder([
            {conditionName: 'status', condition: OvicQueryCondition.notEqual, value: '-1', orWhere: 'and'},
            {
                conditionName: 'parent_id',
                condition: OvicQueryCondition.equal,
                value: this.auth.user.donvi_id.toString(),
                orWhere: 'and'
            },
        ]).set("limit", -1);

        const condition_user = this.httpHelper.paramsConditionBuilder([
            {conditionName: 'status', condition: OvicQueryCondition.notEqual, value: '-1', orWhere: 'and'},
            {conditionName: 'role_ids', condition: OvicQueryCondition.notLike, value: '%"65"%', orWhere: 'and'},
        ]).set("limit", -1)

        const condition_city = this.httpHelper.paramsConditionBuilder([]).set("limit", -1);

        forkJoin([
            this.elngUserProfileService.getElngUserProfileByCol('user_id', this.auth.user.id.toString()),
            this.donViService.getDonViByCols(condition_donvi),
            this.locationService.getListByIdAndKey(0, 'regions'),
            this.nganhTuyensinhService.getNganhTuyensinhByCols(condition_city),
            this.userService.getUserByCols(condition_user),
        ]).subscribe({
            next: ([_userProfile, _donviChuyenmon, _city, _nganh_tuyensinh, _user]) => {
                this.list_donvi_chuyenmon = _donviChuyenmon;
                this.list_citys = _city;
                this.list_nganh_tuyensinh = _nganh_tuyensinh;
                // this.th_xettuyen = _status;
                const tmp_user = [];

                _user.forEach(f => {
                    f['name_email'] = f.display_name.concat(" (", f.email, ")");
                    tmp_user.push(f);
                })

                if (!this.isLanhDaoKhoa && !this.isManager) {
                    this.list_user_so_huu = _user.filter(user => user.id === this.auth.user.id);
                }
                this.list_user_doitac = tmp_user;
                if (!this.isManager) {
                    this.donvi_chuyenmon_id = _userProfile[0] && _userProfile[0].donvi_chuyenmon_id ? _userProfile[0].donvi_chuyenmon_id : 0;
                } else {
                    this.donvi_chuyenmon_id = _donviChuyenmon[0].id;
                }



                if (this.tuyensinh_select == null) {

                    this.viewCreated()
                    return;

                }
                this.cccdValid=  true;
                this.getFormData(this.tuyensinh_select)

            },
            error: () => {
                this.ngView= -1;
                this.noitifi.toastError('Không tải được dữ liệu, vui lòng kiểm tra kết nối');
                this.noitifi.isProcessing(false);
            }
        })
    }


    onChangeTinh(event) {
        if (event) {
            this.locationService.getListByIdAndKey(event.id, 'provinces').subscribe({
                next: (_res) => {
                    this.list_wards = _res;
                },
                error: () => {
                    this.noitifi.toastError("Không tải được Phường/Xã huyện trực thuộc")
                }
            });
        }
    }

    keyupCheckFirstCode(event) {
        if (event) {
            if (event.key === 'v' && event.ctrlKey) {
                return true;
            } else {
                if (!/[0-9]+/.test(event.key) && event.key !== 'Backspace') {
                    return false;
                }
            }
        }
        return true;
    }

    checkCccd() {
        if (!this.f['cccd'].value) {
            this.noitifi.toastError('Vui lòng nhập số CCCD');
            return;
        }

        if (this.f['cccd'].invalid) {
            this.noitifi.toastError('Vui lòng kiểm tra lại CCCD');
            return;
        }
        const tuyensinh_condtion: ConditionOption = {
            condition: [
                // { conditionName: 'status', condition: OvicQueryCondition.greaterThan, value: '-1', orWhere: 'and' },
                {
                    conditionName: 'cccd',
                    condition: OvicQueryCondition.equal,
                    value: this.f['cccd'].value,
                    orWhere: 'and'
                },
            ],
            set: [],
            page: '1'
        }
        this.noitifi.isProcessing(true);
        this.tuyensinhService.getTuyensinhByPageNew(tuyensinh_condtion).subscribe({
            next: (_res) => {
                if (_res.recordsFiltered) {
                    this.cccdValid = false;
                    this.cccdCheckValue = _res.data[0];
                    this.cccdCheckValue['created_name'] = "Thí sinh tự đăng ký";
                    this.cccdCheckValue['submit_from_name'] = this.cccdCheckValue.submit_from === 'lcms' ? 'Quản lý dữ liệu tuyển sinh' : this.cccdCheckValue.submit_from;
                    const index = this.list_donvi_chuyenmon.findIndex(m => m.id === this.cccdCheckValue.donvi_chuyenmon_id);
                    if (index !== -1) {
                        this.cccdCheckValue['donvi_name'] = this.list_donvi_chuyenmon[index].title;
                    }
                    if (this.cccdCheckValue.created_at) {
                        const d = new Date(this.cccdCheckValue.created_at);
                        this.cccdCheckValue['time_add'] = d.toLocaleString('GB-en');
                    }
                    if (this.cccdCheckValue.created_by) {
                        this.elngUserProfileService.getElngUserProfileByItem(this.cccdCheckValue.created_by.toString(), 'user_id').subscribe(_resUser => {
                            this.cccdCheckValue['created_name'] = _resUser[0] ? _resUser[0].full_name : this.cccdCheckValue['created_name'];
                        });
                    }
                } else {
                    this.cccdValid = true;
                }
                this.noitifi.isProcessing(false);
            },
            error: () => {
                this.noitifi.isProcessing(false);
                this.noitifi.toastError("Không load được dữ liệu, vui lòng kiểm tra lại đường truyền");
            }
        })
    }

    viewCreated() {
        this.ngView =1;
    }


    submitData(){
        if (this.f['email'].value) {
            if (this.f['email'].invalid) {
                this.noitifi.toastError('Vui lòng kiểm tra lại email');
                return;
            }
        }
        if (this.formData.valid) {
            this.noitifi.isProcessing(true);
            const data = { ...this.formData.value };
            if (this.tuyensinh_select && this.tuyensinh_select.id) {

                const data_status: TuyensinhStatus = {
                    registration_id: this.tuyensinh_select.id,
                    status_key: this.selectedTH.status_key,
                    status_value: this.selectedTH.kyhieu,
                    status_name: this.selectedTH.label,
                    content: data.content,
                }

                delete data.content;

                if (data.type_diem && data.diemtb) {
                    data['diem_xettuyen'] = data.type_diem.concat("|", data.diemtb);
                } else {
                    data['diem_xettuyen'] = '';
                }


                delete data.type_diem;
                delete data.diemtb;


                this.tuyensinhService.updateTuyensinh(this.tuyensinh_select.id, data).pipe(switchMap(m=>{
                    return  data_status.content || data.status !== this.tuyensinh_select.status ? this.tuyensinhStatusService.addTuyensinhStatus(data_status) : of('comple')
                })).subscribe({
                    next: () => {
                        // this.formReset();
                        // this.closeForm();
                        this.noitifi.toastSuccess('Cập nhật thông tin thành công')
                        this.noitifi.isProcessing(false);
                    },
                    error: () => {
                        this.noitifi.toastError('Cập nhật thông tin thất bại')
                        this.noitifi.isProcessing(false);
                    }
                })
            } else {



                delete data.content;
                if (data.type_diem && data.diemtb) {
                    data['diem_xettuyen'] = data.type_diem.concat("|", data.diemtb);
                } else {
                    data['diem_xettuyen'] = '';
                }

                delete data.type_diem;
                delete data.diemtb;

                this.tuyensinhService.addTuyensinh(data).subscribe({
                    next: (_res) => {
                        const data_status: TuyensinhStatus = {
                            registration_id: _res,
                            status_key: 'XET_TUYEN',
                            status_value: 'KHOI_TAO',
                            status_name: 'Chờ duyệt',
                            content: ''
                        }

                        this.tuyensinhStatusService.addTuyensinhStatus(data_status).subscribe({
                            next: () => {
                                this.formReset();
                                this.noitifi.toastSuccess('Đã thêm thành công')
                                this.noitifi.isProcessing(false);
                            }
                        })
                    },
                    error: () => {
                        this.noitifi.toastError('Thêm thất bại');
                        this.noitifi.isProcessing(false);
                    }
                })
            }

        } else {


            let i = 0;
            let foundError = false;
            while (i < Object.keys(this.errorMessages).length && !foundError) {
                const currentKey = Object.keys(this.errorMessages)[i];
                if (!this.formData.get(currentKey).valid) {
                    this.noitifi.toastError(this.errorMessages[currentKey]);
                    foundError = true;
                }
                i++;
            }

        }
    }
    closeForm(){
        this.formReset();
        this.cccdValid=false;
    }

    reload(){
        this.loadInit()
    }

    //-------------------------------Form ------------------------------

    formReset(){

        this.formData?.reset();
        this.f['donvi_chuyenmon_id'].setValue(this.donvi_chuyenmon_id);
        this.f['submit_from'].setValue('lcms');
        this.f['status'].setValue(0);
        this.f['owner_by'].setValue(this.auth.user.id);

        this.cccdCheckValue = null;

    }
    getFormData(object:Tuyensinh){

        this.formReset();
        // this.isUpdate = true;
        this.cccdValid = true;

        const index = TH_XETTUYEN.findIndex(m => m.value.toString() === object.status.toString());
        if (index !== -1) {
            this.selectedTH = TH_XETTUYEN[index];
        }


        this.formData.setValue(
            {
                ho_va_ten: object.ho_va_ten,
                gioi_tinh: object.gioi_tinh,
                ngay_sinh: object.ngay_sinh,
                noi_sinh: object.noi_sinh,
                dan_toc: object.dan_toc,
                cccd: object.cccd,
                ngay_cap_cccd: object.ngay_cap_cccd,
                noi_cap_cccd: object.noi_cap_cccd,
                dien_thoai: object.dien_thoai,
                email: object.email,
                dia_chi_tinh: object.dia_chi_tinh,

                dia_chi_xa: object.dia_chi_xa,
                dia_chi_nha: object.dia_chi_nha,
                van_bang_tn: object.van_bang_tn,
                nam_tn: object.nam_tn,
                sohieu_vb: object.sohieu_vb,
                vb_chuyenmon: object.vb_chuyenmon,
                vb_chuyenmon_nganh: object.vb_chuyenmon_nganh,
                vb_chuyenmon_namtn: object.vb_chuyenmon_namtn,
                anh_phieu_dang_ky: object.anh_phieu_dang_ky,
                anh_thpt: object.anh_thpt,
                anh_the: object.anh_the,
                anh_cmnd_truoc: object.anh_cmnd_truoc,
                anh_cmnd_sau: object.anh_cmnd_sau,
                anh_hoc_ba: object.anh_hoc_ba,
                submit_from: object.submit_from,
                donvi_chuyenmon_id: object.donvi_chuyenmon_id,
                nganh_dangky: object.nganh_dangky,
                status: object.status,

                noicap_tn:object.noicap_tn ? object.noicap_tn : '' ,
                vb_noicap:object.vb_noicap ? object.vb_noicap : '' ,


                owner_by: object.owner_by,
                content: '',
                type_diem: object.diem_xettuyen && object.diem_xettuyen.split("|")[0] ? object.diem_xettuyen.split("|")[0] : '',
                diemtb: object.diem_xettuyen && object.diem_xettuyen.split("|")[1] ? object.diem_xettuyen.split("|")[1] : '',
                hinhthuc_xettuyen: object.hinhthuc_xettuyen ? object.hinhthuc_xettuyen : ''
            }
        )
        const index_tinh = this.list_citys.findIndex(m => m.id.toString() === object.dia_chi_tinh.toString());
        if (index_tinh !== -1) {
            this.onChangeTinh(this.list_citys[index_tinh]);
        }

        this.ngView = 1;



    }

    onChangeTypeDiem(event) {
        if (event != null) {
            this.f['type_diem'].setValue('Trung cấp, Cao đẳng, Đại học');
        }
        else {
            this.f['type_diem'].setValue('');
        }
    }

    onChangeVBCM(event) {
        if (event === 'THPT') {
            this.f['vb_chuyenmon'].setValue('');
        }
    }


    onSelecteTHForm(event) {
        this.selectedTH = event;
    }

}
