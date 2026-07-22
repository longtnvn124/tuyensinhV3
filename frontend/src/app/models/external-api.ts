export interface ExternalApiResponse<T> {
	code : string;
	message : string;
	data : T;
}

export interface CtdtItem {
	id : number;
	nganh_id : number;
	ten : string;
	madt : string | null;
	thoigian_daotao?: string;
	danhhieu_totnghiep?: string;
}

export interface NganhItem {
	id : number;
	title : string;
	code : string | null;
	type : 'nganh' | 'bomon';
	parent_id : null;
	ordering : number;
	status : number;
}
