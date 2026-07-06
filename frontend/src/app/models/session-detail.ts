import { IctuBaseModel } from "@models/ictu-base-model";
import { ClassSession } from "@models/class-session";
import { ClassActivity } from "@models/class-activities";
import { ClassMedia } from "@models/class-media";

export interface SessionDetail extends IctuBaseModel {
    class_session: ClassSession;
    class_activity: ClassActivity[];
    class_activity_diem_danh: ClassActivity;
    class_media: ClassMedia[];
}