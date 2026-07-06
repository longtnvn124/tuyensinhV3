import { IctuBaseModel } from '@models/ictu-base-model';
import { SysRoleName } from '@models/role';
import { Is } from '@utilities/is';
import { Helper } from '@utilities/helper';
import { AppLanguage } from '@environmentModel';
import { RoutingCommand } from '@models/dto';
import { Employee } from '@models/employee';
import { CourseLesson } from '@models/course-lesson';
import { CourseLessonPlan } from '@models/course-lesson-plan';
import { Course } from '@models/course';
import { CourseLessonTest } from '@models/course-lesson-test';
import { ClassSession } from '@models/class-session';
import { assign } from 'lodash-es';
import { v4 as uuid4 } from 'uuid';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';

// export type ClassLesson = Pick<CourseLesson , 'id' | 'donvi_id' | 'course_id' | 'parent_id' | 'title' | 'slug' | 'type' | 'code' | 'duration' | 'ordering' | 'teacher'>;

export type LessonType = 'lesson' | 'activity' | 'other';

export interface ClassLesson {
	ordering : number;
	teacher_id : number;
	course_lesson_id : number; // ngoại khóa thì course_lesson_id = 0;
	title? : string; // dùng cho chủ đểm của các buổi ngoại khóa
	type? : LessonType;
	code? : string;
}

export const normalizeClassLesson : ( lesson : ClassLesson ) => ClassLesson = ( lesson : ClassLesson ) : ClassLesson => {
	const type : LessonType = lesson.type ?? 'lesson';
	const code : string     = lesson.code ?? uuid4();
	return assign( lesson , { type , code } );
};

export const validateClassLesson : ( lesson : ClassLesson ) => boolean = ( lesson : ClassLesson ) : boolean => {
	return ( lesson.type === 'lesson' && lesson.course_lesson_id > 0 ) || ( lesson.type !== 'lesson' && !!lesson.title );
};

interface ClassLessonState {
	date : string,
	complete : boolean,
	activated : boolean,
}

interface ClassLessonRelation {
	parentCourseLesson : CourseLesson,
	courseLesson : CourseLesson,
	classSession : ClassSession,
}

export interface ClassLessonExtend extends ClassLesson {
	state : ClassLessonState,
	relation : ClassLessonRelation,
}

interface ClassLesson2ExtendType {
	classLesson : ClassLesson,
	parentCourseLesson : CourseLesson,
	courseLesson : CourseLesson,
	classSession : ClassSession,
}

export const classLesson2Extend : ( info : ClassLesson2ExtendType ) => ClassLessonExtend = ( { classLesson , parentCourseLesson , courseLesson , classSession } : ClassLesson2ExtendType ) : ClassLessonExtend => {
	return {
		... classLesson ,
		state    : {
			date      : 'Ngày: ' + ( classSession ? classSession.time_start : '...' ) ,
			complete  : ( classSession && classSession?.status === 2 ) ?? false ,
			activated : ( classSession && classSession.status > 0 ) ?? false
		} ,
		relation : { parentCourseLesson , courseLesson , classSession }
	};
};

export const getLessonTopic : ( lessonType : LessonType , _default? : string ) => string = ( lessonType : LessonType , _default : string = '' ) : string => {
	switch ( lessonType ) {
		case 'activity':
			return 'Hoạt động ngoại khóa';
		case 'other':
			return 'Hoạt động khác';
		default:
			return _default;
	}
};

export type ClassTimeSlotDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const ALL_CLASS_TIME_SLOT_DAY : readonly ClassTimeSlotDay[] = [ 'monday' , 'tuesday' , 'wednesday' , 'thursday' , 'friday' , 'saturday' , 'sunday' ];

type ClassTimeSlotDayTranslatorType = Record<ClassTimeSlotDay , string>;

type ClassTimeSlotDayTranslator = Record<AppLanguage , ClassTimeSlotDayTranslatorType>;

export function formatLongDayOfWeekLabel( text : string ) : string {
	switch ( Helper.removeAccents( text ) ) {
		case 'thu-2':
			return 'Thứ hai';
		case 'thu-3':
			return 'Thứ ba';
		case 'thu-4':
			return 'Thứ tư';
		case 'thu-5':
			return 'Thứ năm';
		case 'thu-6':
			return 'Thứ sáu';
		case 'thu-7':
			return 'Thứ bảy';
		default:
			return text;
	}
}

export const CLASS_TIME_SLOT_DAY_TRANSLATOR : ClassTimeSlotDayTranslator = {
	vn : {
		monday    : 'Thứ 2' ,
		tuesday   : 'Thứ 3' ,
		wednesday : 'Thứ 4' ,
		thursday  : 'Thứ 5' ,
		friday    : 'Thứ 6' ,
		saturday  : 'Thứ 7' ,
		sunday    : 'Chủ nhật'
	} ,
	en : {
		monday    : 'Monday' ,
		tuesday   : 'Tuesday' ,
		wednesday : 'Wednesday' ,
		thursday  : 'Thursday' ,
		friday    : 'Friday' ,
		saturday  : 'Saturday' ,
		sunday    : 'Sunday'
	}
} as const;

export const WeekDayLabel : ( num : WeekDayNumber , lang? : AppLanguage ) => string = ( num : WeekDayNumber , lang : AppLanguage = 'vn' ) : string => {
	return ClassTimeSlotDayToString( Number2ClassTimeSlotDay[ num ] , lang );
};

export type WeekDayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const Number2ClassTimeSlotDay : Record<WeekDayNumber , ClassTimeSlotDay> = {
	0 : 'monday' ,
	1 : 'tuesday' ,
	2 : 'wednesday' ,
	3 : 'thursday' ,
	4 : 'friday' ,
	5 : 'saturday' ,
	6 : 'sunday'
} as const; // isoWeek stand

export const ClassTimeSlotDayToNumber : Record<ClassTimeSlotDay , number> = {
	monday    : 0 ,
	tuesday   : 1 ,
	wednesday : 2 ,
	thursday  : 3 ,
	friday    : 4 ,
	saturday  : 5 ,
	sunday    : 6
} as const; // isoWeek stand

export const ClassTimeSlotDayToString : ( day : ClassTimeSlotDay , lang? : AppLanguage ) => string = ( day : ClassTimeSlotDay , lang : AppLanguage = 'vn' ) : string => day && ALL_CLASS_TIME_SLOT_DAY.includes( day ) ? CLASS_TIME_SLOT_DAY_TRANSLATOR[ lang ][ day ] : '';

export interface ClassTimeSlot {
	branch_id : number; // mã csdt
	room_id : number; // mã phòng học
	slot_order : number; // order của slot đã đăng ký
	day : ClassTimeSlotDay;
	order : number; // weekday order
}

export const LEARNING_MODE_OPTIONS : IctuDropdownOptionElement<LearningMode>[] = [
	{ value : 'group' , label : 'Học theo nhóm lớp' , disabled : false } ,
	{ value : 'one_on_one' , label : 'Học 1-1' , disabled : false }
] as const;

export type LearningMode = 'group' | 'one_on_one';

export interface Class extends IctuBaseModel {
	name : string;
	course_id : number;
	started_date : string; // ngày khai giảng sql Date
	donvi_id : number;
	csdt_id : number; // mã csdt của lớp học
	code : string;
	desc : string;
	duration : number; // Thời lượng( Số lượng buổi học)
	learning_mode : LearningMode;
	teacher_ids : number[];
	assistant_ids : number[];
	parent_id : number;
	curriculum : ClassLesson[];
	time_slots : ClassTimeSlot[];
	status : number;
	total_student : number; // So lượng học sinh của lớp
	sync_required : number; // đánh đấu khi lớp học thay đổi mà
	class_sessions? : ClassSession[];
}

export interface ClassExtend extends Class {
	teachers? : Employee[];
	assistants? : Employee[];
	course? : Course;
	thoiluong? : number;
}

export interface ClassRelative extends ClassExtend {
	lessons? : CourseLesson[];
	lesson_plan? : CourseLessonPlan[];
	course_lesson_tests : CourseLessonTest[];
}

export interface ClassPlanningCommand extends RoutingCommand {
	classId : number;
	role : SysRoleName;
}

export const UPDATE_CLASS_SCHEDULE : ( source : ClassLesson[] , items : ClassLesson[] ) => ClassLesson[] = ( source : ClassLesson[] , items : ClassLesson[] ) : ClassLesson[] => {
	const _initialValue : ClassLesson[] = source && Is.array( source ) ? [ ... source ] : [];
	let _temp : ClassLesson[]           = ( items ?? [] ).reduce( ( reducer : ClassLesson[] , item : ClassLesson ) : ClassLesson[] => {
		if ( -1 === reducer.findIndex( ( u : ClassLesson ) : boolean => u.ordering === item.ordering ) ) {
			reducer.push( item );
		}
		return reducer;
	} , _initialValue );
	return Helper.arraySort<ClassLesson>( _temp , 'ordering' );
};
