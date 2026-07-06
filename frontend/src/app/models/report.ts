import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuBasicFile } from '@models/file';

export type ReportType = 'PERSONAL' | 'CLASS';

export type ReportPartContentType = 'text' | 'media';

export interface ReportPartContent {
    id: string; // uuid4();
    heading: string;
    type: ReportPartContentType;
    content: string;
    files: IctuBasicFile[]
}

export interface Report extends IctuBaseModel {
    donvi_id: number,
    type: ReportType,
    layout_id: number,
    object_id: number, // 	id của chủ thể báo cáo, vd: type = personal thì object_id là user_id còn nếu type = class thì object_id là class_id
    code: string,
    content: ReportPartContent[], // Nội dung của báo cáo
    params: any,
    public: number, // Trạng thái công khai của báo cáo, 0 -> đang soạn thảo, 1 -> đã công khai
}
