import { IctuBaseModel } from "@models/ictu-base-model";

export interface LinhVucDaoTao extends IctuBaseModel {
	id: number,
	ten : string;
	parent_id : number; // 2 cấp: vd: Khoa học tư nhiên: Toán, Ly, Hoá; Xã hội: Văn,Sử, Địa,...
	trangthai : number;
}
