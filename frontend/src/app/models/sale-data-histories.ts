import { IctuBaseModel } from "@models/ictu-base-model";

export interface SaleDataHistories extends IctuBaseModel {
	id: number;
	sales_data_id: number;
	user_id: number;
	donvi_id:number;
	action: number;
	notes: string;
	status: number;
	appointment_time: string;
}
