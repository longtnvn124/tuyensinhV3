import { IctuBaseModel } from '@models/ictu-base-model';

export interface HocSinhPhuHuynh extends IctuBaseModel {
  id: number;
  name: string;
  ngaysinh: string;
  vaitro: string;
  parent_id: number;
}
