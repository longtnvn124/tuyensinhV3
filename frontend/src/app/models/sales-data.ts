import { IctuBaseModel } from "@models/ictu-base-model";
import { IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { Gender } from '@models/employee';

export interface SalesData extends IctuBaseModel {
	user_id : number; // User id của seller được phân công liên hệ
	sale_team_id : number; // id của team sales
	name : string; //  họ tên khách hàng( phụ huynh)
	phone : string; //  Sdt khách hàng( phụ huynh)
	email : string; //  Email khách hàng( phụ huynh)
	sort_name : string; //  Tên khách hàng( phụ huynh)
	dob : string; //  Ngay sinh khách hàng( phụ huynh)
	gender : Gender; //  Gioi tinh khách hàng( phụ huynh)
	address : string; //  Địa chỉ khách hàng( phụ huynh)
	child_name : string; // tên học sinh
	child_dob : string; // ngày tháng năm sinh của học sinh
	child_gender : Gender; // Giới tính của học sinh
	status : SalesDataStatus;
	appointment_time : string; // Thời gian hẹn. KQ = 1: Thời gian gọi lại | KQ = 2: Thời gian Check in nhập học
}

export type SalesDataStatus = -1 | 0 | 1 | 2;

export const SalesDataStatusOptions : IctuDropdownOptionElement<SalesDataStatus>[] = [
	{ value : -1 , label : 'Đã từ chối' } ,
	{ value : 0 , label : 'Chưa liên hệ' } ,
	{ value : 1 , label : 'Hẹn gọi lại' } ,
	{ value : 2 , label : 'Đã chốt lịch checkin' }
]
