import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { HocSinh } from '@models/hoc-sinh';
import { PhuHuynh } from '@models/phu-huynh';
import { Class } from '@models/class';
import { ClassSession } from '@models/class-session';

export type DiemDanhStatus = 'PRESENT' | 'UNEXCUSED' | 'EXCUSED' | 'LATE' | 'WAITING' | 'NOT_ATTENDED_YET';

/**
 * Tiến độ dạy thực hiện dạy bổ trợ
 * -1 -> hủy yêu cầu dạy bổ trợ
 * 0 -> chưa phân công
 * 1 -> đã phân công
 * 2 -> đã đã tiêp nhận và lên lịch
 * 3 -> đã hoàn thành
 * */
export type CheckAssignmentProgress = -1 | 0 | 1 | 2 | 3;

export interface DiemDanh extends IctuBaseModel {
	id : number,
	class_session_id : number,
	donvi_id : number,
	csdt_id : number,
	phuhuynh_id : number,
	class_id : number,
	hocsinh_id : number,
	course_id : number,
	reason : string,
	status : DiemDanhStatus,
	is_attended? : number;
	progress : CheckAssignmentProgress,
	student_fee_id : number,
	is_deducted : number, // 0: chưa trừ, 1: đã trừ
	assigned_teacher : number; // user Id của giáo viên / trợ giảng được phân công dạy bổ trợ.
	deadline : string; // Sql DateTime - Thời hạn hoàn thành của phân công.
	// class_session? : Pick<ClassSession , 'id' | 'topic' | 'title' | 'type' | 'course_id' | 'course_lesson_id' | 'time_start'>,
	class_session_id_parent : number; //Id của buổi học chính thức
	parent_id : number; //id điểm danh gốc
	assigned_class_session_id : number; //id của buổi học ghép
	class_assigned_id : number; //id của lớp học ghép
	hocsinh? : Pick<HocSinh , 'id' | 'full_name' | 'english_name' | 'dob' | 'gender' | 'avatar' | 'address'>,
	phuhuynh? : Pick<PhuHuynh , 'id' | 'full_name' | 'vaitro' | 'dienthoai1' | 'dienthoai2' | 'dob' | 'gender' | 'avatar' | 'address'>,
	class? : Pick<Class , 'id' | 'name' | 'course_id' | 'started_date' | 'donvi_id' | 'csdt_id' | 'code' | 'desc'>,
	class_session_assigned? : Pick<ClassSession , 'id' | 'topic' | 'title' | 'type'>,
}

export const CHECK_IN_STATUS_OPTIONS : IctuDropdownOption<CheckAssignmentProgress>[] = [
	{ value : -1 , label : 'Hủy yêu cầu' } ,
	{ value : 0 , label : 'Chờ xử lý' } ,
	{ value : 1 , label : 'Đã phân công' } ,
	{ value : 2 , label : 'Đã xếp lịch' } ,
	{ value : 3 , label : 'Đã hoàn thành' }
] as const;

export interface AttendanceSocKet {
	event_id : number,
	class_session_id : number,
	hocsinh_id : number,
	reason : string,
	status : DiemDanhStatus,
	creator : string,
	created_at : string;
}
