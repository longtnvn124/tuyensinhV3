import { IctuBaseModel } from '@models/ictu-base-model';
import { Class , LearningMode } from './class';
import { SysRoleName } from '@models/role';
import { PhongHoc } from '@models/phong-hoc';
import { CourseLesson } from '@models/course-lesson';
import { BaseEmployeeInfo } from '@models/employee';
import { CourseLessonTest } from './course-lesson-test';
import { ClassActivity , ClassActivityParams } from './class-activities';
import { ClassMedia } from '@models/class-media';
import { DiemDanh } from '@models/diem-danh';
import { HocSinh } from '@models/hoc-sinh';
import { CourseLessonPlan } from '@models/course-lesson-plan';
import { Course } from '@models/course';

export type ClassSessionType = 'LECTURE' | 'ACTIVITY' | 'ONLINE'; // LECTURE : Bài giảng; ACTIVITY : hoạt động ngoại khóa

export type ScheduleStatus =
	| 'SCHEDULED' // Đã lên lịch
	| 'UPCOMING' // Chưa bắt đầu / Sắp diễn ra
	| 'IN_PROGRESS' // Đang diễn ra
	| 'COMPLETED' // Đã kết thúc
	| 'CANCELLED' // Đã hủy
	| 'RESCHEDULED' // Đã dời lịch
	| 'POSTPONED' // Tạm hoãn
	| 'PENDING' // Chờ xác nhận
	| 'REJECTED' // Từ chối
	| 'NOT_HELD'; // Không diễn ra


export type ClassSessionHocSinh = Pick<HocSinh , 'id' | 'full_name' | 'english_name' | 'dob' | 'gender' | 'avatar' | 'address' | 'phuhuynh_id' | 'code'>;

export interface ClassSession extends IctuBaseModel {
	topic : string; // The name of topic / unit
	title : string; // Tiêu đề
	type : ClassSessionType;
	donvi_id : number;
	class_id : number;
	learning_mode : LearningMode; // forward from class
	course_id : number; // Forward từ bảng class sang
	course_lesson_id : number; // Id của bài học nếu có
	teacher_id : number; // user id của giáo viên quản lý lớp
	assistant_id : number; // user id của trợ giảng
	linhvuc_id : number; // Lĩnh vực(toán, lý, hóa, tiếng anh, tiếng pháp, tiếng Trung, tiếng hàn ...) của lớp học, forward từ khóa học sang. Dùng để lọc khi phân công giáo viên
	started_at : string; // Thời gian bắt đầu của buổi học
	ended_at : string; // Thời gian kết thúc của phiên học
	time_start : string; // Ngày giờ phân công giảng dạy của bài học
	time_end : string; // Ngày giờ dự kiến kết thúc
	time_slot_order : number; // Số thứ tự của ca học
	csdt_id : number; // id của cơ sở đào tạo
	room_id : number; // id của phòng học được phân công
	status : number; // 0 - chưa bắt đầu | 1 - đang diễn ra | 2 - đã kết thúc | -1 - Đã hủy
	ordering : number; // Thứ tự bài học trong chương trình học
	student_ids : number[];
	diem_danh_ids_absent : number[];
	diem_danh_ids : number[];
	parent_id : number; // Lưu id của buổi học chính( chỉ dành cho buổi học bổ trợ)
	parent_class_id : number; // Lưu class_id của buổi học chính( chỉ dành cho buổi học bổ trợ)
	parent_class? : Pick<Class , 'id' | 'name' | 'desc' | 'started_date' | 'code'>
	extra_student_ids : number[],
	media_approved : number; // 0 - Chưa duyệt | 1 - Đã duyệt
	comment_approved : number; // 0 - Chưa duyệt | 1 - Đã duyệt
	hocsinh? : ClassSessionHocSinh[],
	teacher? : BaseEmployeeInfo,
	assistants? : BaseEmployeeInfo,
	lesson_content? : Course['lecture_format'];
}

export interface ClassSessionFitter {
	timeStart : string;
	timeEnd : string;
	donvi_id : number;
	csdt_id : number;
}

export interface ClassSessionCommand {
	id : number;
	class_id? : number;
	role : SysRoleName;
	userId : number;
}

export interface ClassSessionRelative extends ClassSession {
	course_lesson : Pick<CourseLesson , 'id' | 'course_id' | 'title' | 'ordering'>,
	course_lesson_plan? : CourseLessonPlan,
	class? : Pick<Class , 'id' | 'name'>,
	room? : Pick<PhongHoc , 'id' | 'name'>,
	teacher? : BaseEmployeeInfo,
	assistants? : BaseEmployeeInfo,
	course_lesson_tests? : CourseLessonTest[];
	loading? : boolean;
	extra_students? : ClassSessionHocSinh[]
}

export interface ClassSessionDetail extends ClassSession {
	class_activities : ClassActivity[];
	class_activity_diem_danh? : ClassActivityParams;
	diem_danh? : DiemDanh[];
	class_medias : ClassMedia[];
	class? : Pick<Class , 'id' | 'name'>,
	room? : Pick<PhongHoc , 'id' | 'name'>,
	teacher? : BaseEmployeeInfo,
	foreign_teacher? : BaseEmployeeInfo,
	assistants? : BaseEmployeeInfo,
	students : any[]
}

export interface ClassSessionAdditional extends ClassSession {
	course_lesson : Pick<CourseLesson , 'id' | 'course_id' | 'title' | 'ordering' | 'parent_id'>,
	course_lesson_plan : CourseLessonPlan,
	teacher? : BaseEmployeeInfo,
}
