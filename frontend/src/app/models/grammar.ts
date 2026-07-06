import { IctuBaseModel } from '@models/ictu-base-model';

export interface Grammar extends IctuBaseModel {
    id : number;
    donvi_id : number;
    prompt : string;
    response : string;
    translation : string;
    public? : number; // Trạng thái công khai của mẫu câu : 0 = đang soạn thảo; 1 = đã xuất bản
}
