import { IctuDropdownOption } from "@models/ictu-dropdown-option";

export interface Teacher {
	id : number;
	hoten : string;
	ten : string;
	full_name : string;
	name : string;
	maso : string; //  ma so nhan vien
	donvi_id : number;
	csdt_id : number; // mã ô so dao tao
	user_id : number;
	ngaysinh : string; // sql Date : YYYY-MM-DD
	gioitinh : Gender;
	email : string;
	phone : string;
	hocvi : HocVi;
	hocham : HocHam;
	linhvuc_chuyenmon : string;
	ten_donvicongtac : string;
	chucvu : string;
	trangthai_tuyendung : number; // -1: đăng ký tuyển dụng: 0: Chờ phỏng vấn: 1: Đã trúng tuyển
	trangthai_hopdong : number; // 	0: Chưa ký: 1: Thử việc; 2: Chính thức
	is_deleted : number;
	deleted_by : number;
	created_by : number;
	updated_by : number;
	created_at : string; // sql Date : YYYY-MM-DD
	updated_at : string; // sql Date : YYYY-MM-DD
}

export type Gender = 'NAM' | 'NU';

export type HocVi = 'CU_NHAN' | 'KY_SU' | 'THAC_SI' | 'TIEN_SI';

export type HocHam = 'PHO_GIAO_SU' | 'GIAO_SU';

type EmployeeBase = Pick<Teacher , 'id' | 'full_name' | 'name' | 'hoten' | 'ten' | 'maso' | 'donvi_id' | 'csdt_id' | 'ngaysinh' | 'gioitinh' | 'email' | 'phone' | 'hocvi' | 'hocham' | 'linhvuc_chuyenmon' | 'ten_donvicongtac' | 'chucvu'>

export type EmployeeSelectOptionInfo = Pick<Teacher , 'id' |'full_name' | 'name' | 'hoten' | 'ten' | 'user_id' | 'maso' | 'ngaysinh' | 'gioitinh' | 'email' | 'phone' | 'hocvi' | 'hocham'>;

export interface EmployeeSelectOption extends IctuDropdownOption<number> {
	info? : EmployeeSelectOptionInfo;
}

export const EmployeeSelectOptionFields : string = 'id,hoten,ten,user_id,maso,ngaysinh,gioitinh,email,phone,hocvi,hocham';

const defaultOption : EmployeeSelectOption = {
	value : 0 ,
	label : 'Không có giảng viên' ,
	info  : null
}

export const employeeSelectOptionDefault : EmployeeSelectOption = Object.seal( { ... defaultOption } );

export const genderOptions : IctuDropdownOption<Gender>[] = Object.seal<IctuDropdownOption<Gender>[]>( [
	{ value : "NAM" , label : 'Nam' } ,
	{ value : "NU" , label : 'Nữ' }
] );

export const hocHamOptions : IctuDropdownOption<HocHam>[] = Object.seal<IctuDropdownOption<HocHam>[]>( [
	{ value : "PHO_GIAO_SU" , label : 'Phó giáo sư' } ,
	{ value : "GIAO_SU" , label : 'Giáo sư' }
] );

export const hocViOptions : IctuDropdownOption<HocVi>[] = Object.seal<IctuDropdownOption<HocVi>[]>( [
	{ value : "CU_NHAN" , label : 'Cử nhân' } ,
	{ value : "KY_SU" , label : 'Kỹ sư' } ,
	{ value : "THAC_SI" , label : 'Thạc sĩ' } ,
	{ value : "TIEN_SI" , label : 'Tiến sĩ' }
] );
