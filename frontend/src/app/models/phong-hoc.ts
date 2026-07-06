import { IctuBaseModel } from "@models/ictu-base-model";

export interface PhongHoc extends IctuBaseModel {
	name : string;
	description : string;
	code : string; // Ký hiệu phòng học
	csdt_id : number; // mã csdt
	capacity : number; //  sức chứa của phòng
	donvi_id : number;
	status : number; //  tình trạng hoạt động của phòng học
}
