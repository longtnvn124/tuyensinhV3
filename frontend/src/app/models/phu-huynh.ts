import { IctuBaseModel } from '@models/ictu-base-model';

export interface PhuHuynh extends IctuBaseModel {
	donvi_id : number;
	user_id : number;
	parent_id : number;
	avatar : string;
	full_name : string;
	name : string;
	code : string;
	dob : string;
	gender : string;
	vaitro : string;
	email : string;
	dienthoai1 : string;
	dienthoai2 : string;
	tinh : number;
	xa : number;
	address : string;
	nghenghiep : string;
	chucvu : string;
	organization_id : number;
	trangthai : number;
}
