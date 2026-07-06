import { IctuBaseModel } from "@models/ictu-base-model";

export interface SalesTeam extends IctuBaseModel {
	donvi_id : number,
	leader_id : number; // user_id của team leader
	name : string; // Tên nhóm sale
	desc : string; // Mô tả
	members : string; // Danh sách thành viên của nhóm; |1254|2563|4785|
	status : number; // -1 : Đã giải tán ; 0 : Dừng hoạt động ; 1: đang hoạt động
}

export type MySaleTeam = Pick<SalesTeam , 'id' | 'donvi_id' | 'leader_id' | 'name' | 'members' | 'desc' | 'status'>