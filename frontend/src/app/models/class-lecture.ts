import { IctuBaseModel } from "@models/ictu-base-model";
import { CourseLessonPlanContentItem } from "@models/course-lesson-plan";

export interface ClassLecture extends IctuBaseModel {
	donvi_id : number,
	class_id : number,
	courses_lessons_id : number,
	content : CourseLessonPlanContentItem[]
}
