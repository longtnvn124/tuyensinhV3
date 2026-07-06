import { IctuBaseModel } from '@models/ictu-base-model';
import { HocSinhLopHocExtendChecked } from './hoc-sinh-lop-hoc';
import { Employee } from '@models/employee';

export interface ClassGroup extends IctuBaseModel {
    id: number;
    class_id: number;
    assistant_ids: number[];
    donvi_id: number;
    name: string;
    listStudent?: HocSinhLopHocExtendChecked[];
    assistants?: Employee[];
}
