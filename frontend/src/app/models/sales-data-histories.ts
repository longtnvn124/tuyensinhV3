import { IctuBaseModel } from "@models/ictu-base-model";
import { IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { SalesDataStatus } from "@models/sales-data";

export type SalesDataHistoryAction = 'CALL' | 'MESSAGE' | 'EMAIL' | 'OTHERS';

export interface SalesDataHistories extends IctuBaseModel {
	sales_data_id : number;
	user_id : number; // user id của seller liên hệ
	action : SalesDataHistoryAction;
	notes : string; // Ghi chú,
	status : SalesDataStatus;
	appointment_time : string; // Thời gian hẹn. KQ = 1: Thời gian gọi lại | KQ = 2: Thời gian Check in nhập học
}

export const SalesDataHistoryActionOptions : IctuDropdownOptionElement<SalesDataHistoryAction>[] = [
	{ value : 'CALL' , label : 'Gọi điện' } ,
	{ value : 'MESSAGE' , label : 'Nhắn tin' } ,
	{ value : 'EMAIL' , label : 'Gửi email' } ,
	{ value : 'OTHERS' , label : 'Khác' }
]