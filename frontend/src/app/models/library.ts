import { IctuBaseModel } from '@models/ictu-base-model';

export type LibraryType = 'folder' | 'file'

export interface Library extends IctuBaseModel {
    type : LibraryType;
    name : string;          // file title or folder name
    description : string;   // folder description
    file_id : number;       // file ID
    ext : string;           // file extension
    mime_type : string;     // file mime_type
    size : number;          // file size
    donvi_id : number;
}

export interface LibraryFolder extends IctuBaseModel {
    id : number;
    name : string;
    parent_id : number;
    donvi_id : number;
    user_id : number;
    description : string;
    ordering : number;
    files : LibraryFile[];
}

export interface LibraryFile {
    id : number;
    folder_id : number;
    file_id : number;
    donvi_id : number;
    user_id : number;
    name : string;
    description? : string;
    tags? : string;
    sort_order : number;
    is_deleted : number;
    created_at : string;
    updated_at : string;
    file_url? : string;
    file_ext? : string;
    file_size? : number;
    file_location? : 'aws' | 'local';
}

export type LibraryItemType = 'folder' | 'file';

export interface LibraryDisplayItem {
    type : LibraryItemType;
    id : number;
    name : string;
    ext? : string;
    size? : number;
    fileId? : number;
    fileUrl? : string;
    fileLocation? : 'aws' | 'local';
    createdAt : string;
    updatedAt : string;
}

export interface LibraryFilters {
    search? : string;
    typeFilter? : 'all' | 'image' | 'document' | 'video' | 'audio' | 'other';
}

