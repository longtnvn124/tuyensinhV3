import { IctuBaseModel } from "@models/ictu-base-model";
import { CourseSubject } from "@models/course";

export interface Bank extends IctuBaseModel {
	name : string;
	course_id : number; // Mã môn của ngân hàng
	donvi_id : number; // Mã đơn vị
	desc : string; // Mô tả
	code : string;
	status : number; // Trạng thái của ngân hàng, 0 = đang soạn thảo; 1 = đã sẵn sàng
	subject : CourseSubject
}
