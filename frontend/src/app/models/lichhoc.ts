import { IctuBaseModel } from '@models/ictu-base-model';
import { LopHoc } from './lop-hoc';
import { PhongHoc } from './phong-hoc';
import { Employee } from '@models/employee';

export interface Reason extends IctuBaseModel {
    name : string;
    reason : string;
}

export interface LichHoc extends IctuBaseModel {
    id : number;
    csdt_id : number;
    giaovien_id : number;
    trogiang_id : string;
    phonghoc_id : number;
    class_id : number;
    khoahoc_id : number;
    diadiem_phonghoc : string;
    time_start : string;
    time_start_update : string;
    reason : Reason[];
    reasonstring : string;
    type : number;
    content : string;
    status : number;
    donvi_id : number;
    apdungAll : false;
    lophocfull : LopHoc;
    phonghoc : PhongHoc;
    giaovien : Employee;
    trogiang : Employee;
    status_reason : number;
}
