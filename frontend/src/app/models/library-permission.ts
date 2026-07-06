import { IctuBaseModel } from '@models/ictu-base-model';

export interface LibraryPermission extends IctuBaseModel {
    library_id : number;
    user_ids : number[]; // userID shared with
    donvi_id : number;
}
