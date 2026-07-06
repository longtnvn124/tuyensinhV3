import { IctuBaseModel } from '@models/ictu-base-model';
import { HocSinh } from '@models/hoc-sinh';
import { IctuBasicFile } from './file';
import { Employee } from '@models/employee';
import { ClassActivityStatus } from '@models/class-activities';

export type ClassMediaType = 'ACTIVITY' | 'SPEAKING_TEST';

export interface ClassMediaCriteriaScores {
	criteria : string,
	score : number
}

export interface ClassMedia extends IctuBaseModel {
	id : number,
	donvi_id : number,
	class_id : number,
	class_session_id : number,
	type : ClassMediaType,
	student_ids : number[],
	content : string,
	origin_content : string,
	reviewed_by : number,
	rejection_reason : string,
	media : IctuBasicFile, //CourseAttachment | IctuBasicFile
	speaking_test : IctuBasicFile[],
	students? : HocSinh[],
	criteria_scores : ClassMediaCriteriaScores[],
	// approved : number,
	// is_approved : number,
	status : ClassActivityStatus,
	featured : number, // Đánh dấu là media tiêu biểu
	employee? : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo' | 'user_id'>;
}
