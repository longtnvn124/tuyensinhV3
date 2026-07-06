import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuBasicFile } from '@models/file';
import { HocSinh } from '@models/hoc-sinh';
import { Employee } from '@models/employee';
import { Class } from '@models/class';
import { ClassSession } from '@models/class-session';
import { ClassMediaCriteriaScores , ClassMediaType } from '@models/class-media';
import { ClassActivityStatus } from '@models/class-activities';

export type ContentReviewerType = 'ClassMedia' | 'ClassActivity';

export type ContentReviewerObject = Pick<HocSinh , 'id' | 'full_name' | 'code' | 'english_name' | 'avatar' | 'gender' | 'dob'>;

interface ContentReviewerBase extends IctuBaseModel {
	dataType : ContentReviewerType,
	donvi_id : number,
	class_id : number,
	class_session_id : number,
	status : ClassActivityStatus
	featured : number,
	reviewed_by : number,
	rejection_reason : string,
	media? : IctuBasicFile | any, //CourseAttachment | IctuBasicFile
	comment? : string,
	comment_origin? : string,
	objects : ContentReviewerObject[],
	activity_class : Pick<Class , 'id' | 'code' | 'name'>
	class_session : Pick<ClassSession , 'id' | 'topic' | 'title' | 'type' | 'time_start' | 'time_end' | 'teacher_id' | 'assistant_id'>,
	dirty : boolean,
}

export interface ContentReviewerMedia extends ContentReviewerBase {
	type : ClassMediaType;
	dataType : 'ClassMedia',
	media : IctuBasicFile,
	employee : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo' | 'user_id'>,
	speaking_test? : IctuBasicFile[];
	criteria_scores? : ClassMediaCriteriaScores[];
	content : string;
	origin_content : string;
}

export interface ContentReviewerComment extends ContentReviewerBase {
	dataType : 'ClassActivity',
	comment : string,
	comment_origin : string,
	employee : Pick<Employee , 'id' | 'full_name' | 'email' | 'phone' | 'gender' | 'photo' | 'user_id'>,
}

export type ContentReviewerData = ContentReviewerMedia | ContentReviewerComment

export type ContentReviewerDataState = 'approved' | 'rejected' | 'featured';
