import { IctuBaseModel } from '@models/ictu-base-model';
import { HocSinh } from './hoc-sinh';
import { AttendanceSocKet, DiemDanh } from './diem-danh';

export interface HocSinhLopHoc extends IctuBaseModel {
    id: number;
    donvi_id: number;
    class_id: number;
    status: number;
    hocsinh_id: number;
    class_group_id: number;
    hocsinh?: Pick<HocSinh, 'id' | 'full_name' | 'english_name' | 'dob' | 'gender' | 'avatar' | 'address' | 'phuhuynh_id' | 'code'>;
}

export interface HocSinhLopHocExtend extends HocSinhLopHoc {
    diemdanh: Partial<DiemDanh>;
    isUpdate?: boolean;
    attendance_socet?: AttendanceSocKet
}

export interface HocSinhLopHocExtendChecked extends HocSinhLopHoc {
    isChecked: boolean;
}
