export interface IctuSchedule {
}

export interface WeekDate<T> {
	order : number; // day of week starts from 0 to 6
	slug : string; // DD-MM-YYYY
	date : Date;
	data : T[],
	isToday : boolean,
	visible : boolean,
}
