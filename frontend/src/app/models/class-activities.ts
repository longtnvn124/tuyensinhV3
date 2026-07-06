import { IctuBaseModel } from '@models/ictu-base-model';
import { HocSinh } from '@models/hoc-sinh';
import { Employee } from '@models/employee';
import { IctuBasicFile } from '@models/file';

export type ClassActivityType = 'DIEM_DANH' | 'HOAT_DONG' | 'NHAN_XET';

export type ClassActivityStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface ClassActivityParams {
	dihoc : number[];
	nghihoc : number[];
	dimuon : number[];
}

export interface ClassActivity extends IctuBaseModel {
	id : number;
	donvi_id : number;
	class_id : number;
	class_session_id : number;
	type : ClassActivityType;
	content : ContentComment[];
	comment : string;
	comment_origin : string;
	reviewed_by : number,
	rejection_reason : string,
	student_ids : number[]; //[id_user_1,id_user_2]
	params : ClassActivityParams; //Lưu TT SL điểm danh
	media : IctuBasicFile[];
	// approved : number; //0: Chưa được duyệt | 1: Đã duyệt
	// is_approved : number; //0: Không đạt | 1: Đạt
	status : ClassActivityStatus,
	featured : number; // Đánh dấu là comment tiêu biểu
	employee? : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo' | 'user_id'>;
}

export interface ClassActivityExtend extends ClassActivity {
	students? : HocSinh[];
	assistants? : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo'>;
}

export interface ContentComment {
	title : string;
	slug : string;
	comment : string;
}
