import { IctuBaseModel } from '@models/ictu-base-model';
import { ICTUStandardFile } from '@models/file';

export interface CoSoDaoTao extends IctuBaseModel {
    id : number,
    donvi_id : number,
    ten : string,
    kyhieu : string, //slug:không cho phép có dấu cách
    mota : string,
    time_slots : BranchTimeSlot[],
    userid_manager : number, // Người phụ trách
    address : string,
    hotline : string,
    params : CoSoDaoTaoParams;
    logo : Pick<ICTUStandardFile , 'id' | 'name' | 'title' | 'url' | 'ext' | 'type' | 'size' | 'location'>
    status : number, //	Trạng thái: 0: Chưa kích hoạt; 1: kích hoạt
    diligence: number; // mức chuyên cần
}

export interface BranchTimeSlot {
    order : number,
    name : string,
    start : string, // HH:mm
    end : string, // HH:mm
}

export interface CoSoDaoTaoParams {
    phone : string,
    email : string,
    website : string,
    facebook : string,
    youtube : string,
    tiktok : string,
}

export type BranchOption = Pick<CoSoDaoTao , 'id' | 'donvi_id' | 'ten' | 'kyhieu' | 'mota' | 'address' | 'time_slots'>
