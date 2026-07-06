import { IctuBaseModel } from '@models/ictu-base-model';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { IctuBasicFile } from '@models/file';
import { Helper } from '@utilities/helper';

export interface Word extends IctuBaseModel {
    id : number;
    title : string;
    type : WordType;
    audio : IctuBasicFile;
    define : string;
    thumbnail : IctuBasicFile;
    transcription : string;
    donvi_id : number;
    bacdaotao_ids : number[];
}

export type WordType = 'DONG_TU' | 'TINH_TU' | 'DAI_TU' | 'TRANG_TU' | 'DANH_TU' | 'THAN_TU' | 'DONG_TU_VING' | 'DONG_TU_QUA_KHU_PHAN_TU' | 'SO_DEM' | 'SO_THU_TU' | 'CUM_TU' | 'CUM_DONG_TU' | 'TRANG_TU_NGHI_VAN' | 'TINH_TU_SO_HUU' | 'DAI_TU_SO_HUU' | 'DAI_TU_NGHI_VAN' | 'DANH_TU_RIENG' | 'MAO_TU' | 'TU_DE_HOI' | 'DANH_XUNG' | 'DANH_TU_NHIEU';

type WordMap = Record<WordType , IctuDropdownOptionElement<WordType>>;

const wordMap : WordMap = {
    DONG_TU                 : { label : 'Động từ' , value : 'DONG_TU' , disabled : false } ,
    TINH_TU                 : { label : 'Tính từ' , value : 'TINH_TU' , disabled : false } ,
    DAI_TU                  : { label : 'Đại từ' , value : 'DAI_TU' , disabled : false } ,
    TRANG_TU                : { label : 'Trạng từ' , value : 'TRANG_TU' , disabled : false } ,
    DANH_TU                 : { label : 'Danh từ' , value : 'DANH_TU' , disabled : false } ,
    THAN_TU                 : { label : 'Thán từ' , value : 'THAN_TU' , disabled : false } ,
    DONG_TU_VING            : { label : 'Động từ V-ing' , value : 'DONG_TU_VING' , disabled : false } ,
    DONG_TU_QUA_KHU_PHAN_TU : { label : 'Quá khứ phân từ' , value : 'DONG_TU_QUA_KHU_PHAN_TU' , disabled : false } ,
    SO_DEM                  : { label : 'Số đêm' , value : 'SO_DEM' , disabled : false } ,
    SO_THU_TU               : { label : 'Số thứ tự' , value : 'SO_THU_TU' , disabled : false } ,
    CUM_TU                  : { label : 'Cụm từ' , value : 'CUM_TU' , disabled : false } ,
    CUM_DONG_TU             : { label : 'Cụm động từ' , value : 'CUM_DONG_TU' , disabled : false } ,
    TRANG_TU_NGHI_VAN       : { label : 'Trạng từ nghi vấn' , value : 'TRANG_TU_NGHI_VAN' , disabled : false } ,
    TINH_TU_SO_HUU          : { label : 'Tính từ sở hữu' , value : 'TINH_TU_SO_HUU' , disabled : false },
    DAI_TU_SO_HUU           : { label : 'Đại từ sở hữu' , value : 'DAI_TU_SO_HUU' , disabled : false },
    DAI_TU_NGHI_VAN         : { label : 'Đại từ nghi vấn' , value : 'DAI_TU_NGHI_VAN' , disabled : false },
    DANH_TU_RIENG           : { label : 'Danh từ riêng' , value : 'DANH_TU_RIENG' , disabled : false },
    MAO_TU                  : { label : 'Mạo từ' , value : 'MAO_TU' , disabled : false },
    TU_DE_HOI               : { label : 'Từ để hỏi' , value : 'TU_DE_HOI' , disabled : false },
    DANH_XUNG               : { label : 'Danh xưng' , value : 'DANH_XUNG' , disabled : false },
    DANH_TU_NHIEU           : { label : 'Danh từ nhiều' , value : 'DANH_TU_NHIEU' , disabled : false },
} as const;

export const WordTypeSelection : IctuDropdownOptionElement<WordType>[] = Object.values( wordMap );

export const sanitizeWordType : ( info : string ) => WordType = ( info : string ) : WordType => {
    if ( ! info ) {
        return null;
    }
    const _strKey : string = Helper.removeAccents( info ).replace( /-/g , '_' ).toUpperCase();
    return _strKey in wordMap ? wordMap[ _strKey ].value : null;
}
