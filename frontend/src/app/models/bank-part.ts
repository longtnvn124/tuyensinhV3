import { IctuBaseModel } from "@models/ictu-base-model";

export interface BankPart extends IctuBaseModel {
	name : string; // tên khối kiến thức
	donvi_id : number // Mã đơn vị
	bank_id : number; // Mã ngân hàng
	parent_id : number;
	ordering : number; // Thứ tự hiển thị trong ngân hàng
}

export type BankPartBaseInfo = Pick<BankPart , 'id' | 'name' | 'donvi_id' | 'bank_id' | 'parent_id' | 'ordering'>