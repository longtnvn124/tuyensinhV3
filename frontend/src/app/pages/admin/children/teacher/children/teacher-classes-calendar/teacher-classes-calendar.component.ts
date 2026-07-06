import { Component , EventEmitter , inject , Input , OnDestroy , OnInit , Output , Signal , signal , viewChild , ViewChild , WritableSignal } from '@angular/core';
import { AbstractControl , FormBuilder , FormsModule , ReactiveFormsModule , Validators } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { DatePickerModule } from "primeng/datepicker";
import { ButtonModule } from "primeng/button";
import { MatDialog , MatDialogModule } from "@angular/material/dialog";
import { CheckboxModule } from "primeng/checkbox";
import { DialogModule } from "primeng/dialog";
import { MatMenuModule , MatMenuTrigger } from "@angular/material/menu";
import { IctuBasePermission , IctuPermissionControl } from "@models/ictu-base-model";
import { IctuDropdownOption } from "@models/ictu-dropdown-option";
import { LichHoc , Reason } from "@models/lichhoc";
import { PhongHoc } from "@models/phong-hoc";
import { LichHocSearchInfo , LichHocService } from "@services/lich-hoc.service";
import { HelperClass } from "@utilities/helper";
import { AuthenticationService } from "@services/authentication.service";
import { NotificationService } from "@services/notification.service";
import { PhongHocSearchInfo , PhongHocService } from "@services/phong-hoc.service";

import { AppState } from "@models/app-state";
import { Drawer } from "primeng/drawer";
import { IctuFormControl2 } from "@models/ictu-form-control";
import { DataTableEvent , DataTableEventName , IctuDataTable } from "@models/datatable";
import { forkJoin , map , Observable , of , Subject , switchMap , takeUntil } from "rxjs";
import { filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { DtoObject } from "@models/dto";
import { InputText } from "primeng/inputtext";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { MatButton } from "@angular/material/button";
import { Select } from "primeng/select";
import { Textarea } from "primeng/textarea";
import { LopHoc } from '@models/lop-hoc';
import { LopHocSearchInfo , LopHocService } from '@services/lop-hoc.service';
import { ClassRelative } from '@app/models/class';

type lichHocMode = 'thang' | 'tuan';
type LopHocMode = 'listHS' | 'listDF' | 'lich' | 'baitap' | 'lopBT';
type DiemDanhMode = 'listDF' | 'listDiemDanh';

@Component( {
	selector    : 'teacher-classes-calendar' ,
	imports     : [ ReactiveFormsModule , FormsModule , CommonModule , DatePickerModule , ButtonModule , MatDialogModule , CheckboxModule , DialogModule , MatMenuModule , InputText , LoadingProgressComponent , MatButton , Select , Textarea ] ,
	templateUrl : './teacher-classes-calendar.component.html' ,
	styleUrl    : './teacher-classes-calendar.component.css'
} )
export class TeacherClassesCalendarComponent implements OnInit , OnDestroy , IctuBasePermission {
	currentYear : number;
	currentMonth : number;
	calendarDays : ( Date | null )[]            = [];
	weekDays : Date[]                           = [];
	optionList                                  = [
		{ id : 'thang' , value : 'Tháng' } ,
		{ id : 'tuan' , value : 'Tuần' }
	];
	optionStatus : IctuDropdownOption<number>[] = [
		{ value : -1 , label : ' Hủy' } ,
		{ value : 0 , label : 'Chưa diễn ra' } ,
		{ value : 1 , label : 'Đang diễn ra' } ,
		{ value : 2 , label : 'Kết thúc' }
	];

	checkboxApdung : boolean = false;
	lichHocSelect : LichHoc;
	selectOption : any       = { id : 'thang' , value : 'Tháng' };
	dayNames                 = [ 'T2' , 'T3' , 'T4' , 'T5' , 'T6' , 'T7' , 'CN' ];
	dayNamesWeek             = [ 'CN' , 'T2' , 'T3' , 'T4' , 'T5' , 'T6' , 'T7' ];
	monthNames               = [
		'Tháng 1' ,
		'Tháng 2' ,
		'Tháng 3' ,
		'Tháng 4' ,
		'Tháng 5' ,
		'Tháng 6' ,
		'Tháng 7' ,
		'Tháng 8' ,
		'Tháng 9' ,
		'Tháng 10' ,
		'Tháng 11' ,
		'Tháng 12'
	];

	optiontype : IctuDropdownOption<number>[] = [
		{ value : 0 , label : 'Theo chương trình' } ,
		{ value : 1 , label : 'Học bù' } ,
		{ value : 2 , label : 'Bổ sung' }
	];

	selectDate : Date;
	optionNamHoc : number[]                    = [];
	optionPhongHoc : PhongHoc[]                = [];
	visibleDialog : boolean                    = false;
	private service : LichHocService           = inject( LichHocService );
	private helper                             = new HelperClass();
	private auth : AuthenticationService       = inject( AuthenticationService );
	private notification : NotificationService = inject( NotificationService );
	private lopHocservice : LopHocService      = inject( LopHocService );
	private phongHocservice : PhongHocService  = inject( PhongHocService );

	get donviId () : number {
		return this.auth.user.donvi_id;
	}

	get giaovien_id () : number {
		return this.auth.employee.id;
	}

	@Input() lopHoc : LopHoc | null = { id : 0 } as LopHoc;

	diemdanhMode : WritableSignal<DiemDanhMode> = signal<DiemDanhMode>( 'listDF' );
	lopHocActive : WritableSignal<LopHoc>       = signal<LopHoc>( null );
	lichhocActive : WritableSignal<LichHoc>     = signal<LichHoc>( null );
	mode : WritableSignal<LopHocMode>           = signal<LopHocMode>( 'listDF' );
	@Output() modeUpdated                       = new EventEmitter<{ mode : LopHocMode; }>();

	changeMode ( mode : LopHocMode ) {
		this.modeUpdated.emit( { mode } );
	}

	state : WritableSignal<AppState>          = signal<AppState>( 'loading' );
	private fb : FormBuilder                  = inject( FormBuilder );
	@ViewChild( 'trigger' ) menuTrigger! : MatMenuTrigger;
	readonly drawer : Signal<Drawer>          = viewChild<Drawer>( 'pDrawer' );
	modelichhoc : WritableSignal<lichHocMode> = signal<lichHocMode>( 'thang' );

	setMode ( mode : lichHocMode , selectDate? : Date ) {
		switch ( mode ) {
			case 'thang':
				this.generateCalendar();
				this.searchInfo = {
					search     : '' ,
					date_start : this.getMonthRange(
						this.currentYear ,
						this.currentMonth
					).start ,
					date_end   : this.getMonthRange(
						this.currentYear ,
						this.currentMonth
					).end
				};
				this.loadData( 1 , true );
				this.modelichhoc.set( 'thang' );
				break;
			case 'tuan':
				if ( selectDate ) {
					this.selectDate = selectDate;
				}
				else {
					this.selectDate = this.today;
				}
				this.generateWeekDays();
				this.searchInfo   = {
					search     : '' ,
					date_start : this.getWeekRange().start ,
					date_end   : this.getWeekRange().end
				};
				this.selectOption = { id : 'tuan' , value : 'Tuần' };
				this.loadData( 1 , true );
				this.modelichhoc.set( 'tuan' );
				break;
		}
	}

	setModeDiemdanh ( mode : DiemDanhMode , item : LichHoc , date : Date ) {
		switch ( mode ) {
			case 'listDF':
				this.diemdanhMode.set( 'listDF' );
				break;
			case 'listDiemDanh':
				this.diemdanhMode.set( 'listDiemDanh' );
				this.selectDate = date;
				this.lichhocActive.set( item );
				this.lopHocActive.set( item.lophocfull );
				break;
		}
	}

	formControl : IctuFormControl2<LichHoc> = new IctuFormControl2<LichHoc>( {
		dropdownFields : [] ,
		formGroup      : this.fb.group( {
			giaovien          : [ '' ] ,
			trogiang          : [ '' ] ,
			donvi_id          : [ this.donviId ] ,
			phonghoc          : [ '' ] ,
			diadiem_phonghoc  : [ '' ] ,
			lophoc            : [ '' ] ,
			type              : [ 0 ] ,
			time_start        : new Date() ,
			time_start_update : new Date() ,
			content           : [ '' ] ,
			reasonstring      : [ '' , [ Validators.required , Validators.minLength( 2 ) ] ] ,
			reason            : [] ,
			status_reason     : [ 0 ] ,
			status            : [ 0 ]
		} ) ,
		objectName     : 'lịch học' ,
		drawer         : this.drawer
	} );

	private handelEvent : Record<DataTableEventName , ( data : LichHoc ) => void> = {
		OPEN_FORM_ADD        : () : void => {
		} ,
		OPEN_FORM_UPDATE     : ( data : LichHoc ) : void => {
			this.formControl.formGroup.reset( {
				giaovien          : data.giaovien_id ,
				trogiang          : data.trogiang_id ,
				phonghoc          : data.phonghoc.name ,
				lophoc            : data.lophocfull.name ,
				diadiem_phonghoc  : data.diadiem_phonghoc ,
				time_start        : this.helper.formatSQLDateTime(
					new Date( data.time_start )
				) ,
				time_start_update :
					new Date( data.time_start_update ) ?? new Date() ,
				reason            : data.reason ,
				reasonstring      : data.reason
				                    ? data.reason.find(
						( item ) => item.name == this.auth.employee.full_name
					).reason
				                    : '' ,
				type              : data.type ,
				status            : data.status ,
				status_reason     : data.status_reason
			} );
			this.lichHocSelect = data;
			this.formControl.openFormEdit( data );
		} ,
		DELETE_SINGLE_ROW    : ( { id } : LichHoc ) : void => {
			this.notification.clearToast();
		} ,
		DELETE_SELECTED_ROWS : () : void => {
		} ,
		SUBMIT_FORM          : () : void => {
			console.log( this.formField( 'reasonstring' ).value );
			const info : Partial<LichHoc>   = {
				// content: this.formField('content').value,
				time_start_update : this.helper.formatSQLTimeStamp(
					this.formField( 'time_start_update' ).value
				) ,
				reason            : this.createReasonUpdateCalendar(
					this.formField( 'reasonstring' ).value ,
					this.formField( 'reason' ).value
				) ,
				status_reason     : 1
			};
			const request : Observable<any> = this.formControl.isFormAdd
			                                  ? this.service.create( info )
			                                  : this.service.update( this.formControl.object.id , info );
			const message : string          = this.formControl.isFormAdd
			                                  ? 'Thêm mới thành công'
			                                  : 'Cập nhật thành công';
			this.formControl.submit( request ).subscribe( {
				next  : () : void => {
					this.openAndCloseDialog();
					this.notification.toastSuccess( message , 'Thông báo' );
					this.loadData( 1 , true );
				} ,
				error : () : void => {
					this.notification.toastError( message , 'Thông báo' );
				}
			} );
			this.formControl.formGroup.reset( {
				giaovien         : '' ,
				trogiang         : '' ,
				donvi_id         : [ this.donviId ] ,
				phonghoc         : '' ,
				diadiem_phonghoc : '' ,
				lophoc           : '' ,
				type             : 0 ,
				time_start       : '' ,
				content          : '' ,
				reason           : '' ,
				status           : 0
			} );
		}
	};

	private eventObserver$ : Subject<DataTableEvent<LichHoc>> = new Subject<
		DataTableEvent<LichHoc>
	>();

	private onDestroy$ : Subject<string> = new Subject<string>();

	private _temp : { paged : number; resetPaginator : boolean } = {
		paged          : 1 ,
		resetPaginator : true
	};
	searchInfo : LichHocSearchInfo                               = {
		search     : '' ,
		date_start : '' ,
		date_end   : ''
	};
	searchInfoLopHoc : LopHocSearchInfo                          = {
		search : '' ,
		namhoc : null
	};
	dataTable : IctuDataTable<LichHoc>                           = new IctuDataTable<LichHoc>();
	dataTableLopHoc : IctuDataTable<ClassRelative>                      = new IctuDataTable<ClassRelative>();
	permissionControl : Signal<IctuPermissionControl>            =
		signal<IctuPermissionControl>(
			new IctuPermissionControl(
				this.auth.getUserPermission( 'giao-vien/lich-hoc' )
			)
		);
	searchPhongHoc : PhongHocSearchInfo                          = {
		search  : '' ,
		csdt_id : 0
	};

	constructor ( private dialog : MatDialog ) {
		this.eventObserver$.asObservable().pipe( takeUntil( this.onDestroy$ ) ).subscribe( ( { name , data } : DataTableEvent<LichHoc> ) : void =>
			this.handelEvent[ name ]( data )
		);
	}

	formField ( path : keyof LichHoc ) : AbstractControl {
		return this.formControl.formGroup.get( path );
	}

	today = new Date();

	ngOnInit () : void {
		this.selectDate   = this.today;
		this.currentYear  = this.today.getFullYear();
		this.currentMonth = this.today.getMonth();
		this.generateCalendar();
		this.searchInfo = {
			search     : '' ,
			date_start : this.getMonthRange( this.currentYear , this.currentMonth ).start ,
			date_end   : this.getMonthRange( this.currentYear , this.currentMonth ).end
		};
		this.loadData( 1 , true );
	}

	private requestDeletingData ( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map(
				() : IctuDeletingAnimationControl<LichHoc> =>
					new IctuDeletingAnimationControl( ids , this.service )
			) ,
			switchMap(
				(
					deleteController : IctuDeletingAnimationControl<LichHoc>
				) : Observable<boolean> => {
					deleteController.run();
					return this.notification.startDeleting(
						deleteController.progress
					);
				}
			)
		).subscribe( {
			next  : ( success : boolean ) : void => {
				if ( success ) {
					this.notification.toastSuccess( 'Xóa thành công' );
				}
				this.loadData( 1 , true );
			} ,
			error : () : void => {
				this.notification.toastError( 'Xóa thất bại' );
			}
		} );
	}

	private preload () : Observable<void> {
		const loadPhongHoc$ : Observable<PhongHoc[]> = this.optionPhongHoc.length
		                                               ? of( this.optionPhongHoc )
		                                               : this.phongHocservice.load( this.searchPhongHoc , this.donviId , {
				limit : -1 ,
				paged : 1
			} ).pipe(
				map( ( res : DtoObject<PhongHoc[]> ) : PhongHoc[] => {
					this.optionPhongHoc = res.data;
					return this.optionPhongHoc;
				} )
			);

		const loadLopHoc$ : Observable<ClassRelative[]> = this.dataTableLopHoc.data().length
		                                           ? of( this.dataTableLopHoc.data() )
		                                           : this.lopHocservice.loadPermissionGV(
				this.searchInfoLopHoc ,
				this.donviId ,
				this.giaovien_id ,
				0 ,
				{
					limit : -1 ,
					paged : 1
				}
			).pipe(
				map( ( res : DtoObject<ClassRelative[]> ) : ClassRelative[] => {
					this.dataTableLopHoc.fillData( res.data );
					return this.dataTableLopHoc.data();
				} )
			);

		return forkJoin( [ loadPhongHoc$ , loadLopHoc$ ] ).pipe( map( () => {
		} ) );
	}

	loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
		this.state.set( 'loading' );
		this._temp = { paged , resetPaginator };
		this.service.load(
			this.searchInfo ,
			this.donviId ,
			this.giaovien_id ,
			this.lopHoc.id ,
			{
				limit : -1 ,
				paged
			}
		).pipe(
			map( ( res : DtoObject<LichHoc[]> ) : LichHoc[] => {
				if ( resetPaginator ) {
					return this.dataTable.paginator.setupPaginator( res );
				}
				else {
					this.dataTable.paginator.changePage( paged );
					return res.data;
				}
			} )
		).subscribe( {
			next  : ( data : LichHoc[] ) : void => {
				this.dataTable.fillData( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.state.set( 'error' );
			}
		} );
	}

	createReasonUpdateCalendar (
		reasonstring : string ,
		reason : Reason[]
	) : Reason[] {
		let result = [];
		if ( reason ) {
			for ( let item of reason ) {
				if ( item.name == this.auth.employee.full_name ) {
					item.reason = reasonstring;
				}
			}
			result = reason;
		}
		else {
			result.push( {
				name   : this.auth.employee.full_name ,
				reason : reasonstring
			} );
		}
		return result;
	}

	deleteRow ( data : LichHoc ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows () : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow ( data : LichHoc , selectdate : Date ) : void {
		this.selectDate = selectdate;
		this.menuTrigger.closeMenu();
		this.openAndCloseDialog();
		this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
	}

	openAndCloseDialog () : void {
		this.visibleDialog = ! this.visibleDialog;
	}

	reload ( event : MouseEvent ) : void {
		this.generateCalendar();
		this.searchInfo = {
			search     : '' ,
			date_start : this.getMonthRange( this.currentYear , this.currentMonth ).start ,
			date_end   : this.getMonthRange( this.currentYear , this.currentMonth ).end
		};
		this.loadData( this._temp.paged , this._temp.resetPaginator );
		event.preventDefault();
		event.stopPropagation();
	}

	addNewItem () : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
	}

	submitForm () : void {
		this.eventObserver$.next( { name : 'SUBMIT_FORM' , data : null } );
	}

	onDrawerHide () : void {
		if ( this.formControl.submitted ) {
			this.loadData( 1 , true );
		}
	}

	generateCalendar () {
		this.calendarDays = [];
		const firstDay    = new Date( this.currentYear , this.currentMonth , 1 );
		const lastDay     = new Date( this.currentYear , this.currentMonth + 1 , 0 );

		const startDayOfWeek = ( firstDay.getDay() + 6 ) % 7;

		for ( let i = 0 ; i < startDayOfWeek ; i++ ) {
			this.calendarDays.push( null );
		}

		for ( let i = 1 ; i <= lastDay.getDate() ; i++ ) {
			this.calendarDays.push(
				new Date( this.currentYear , this.currentMonth , i )
			);
		}
	}

	prevMonth () {
		if ( this.currentMonth === 0 ) {
			this.currentMonth = 11;
			this.currentYear--;
		}
		else {
			this.currentMonth--;
		}
		this.generateCalendar();
		this.searchInfo = {
			search     : '' ,
			date_start : this.getMonthRange( this.currentYear , this.currentMonth ).start ,
			date_end   : this.getMonthRange( this.currentYear , this.currentMonth ).end
		};
		this.loadData( 1 , true );
	}

	nextMonth () {
		if ( this.currentMonth === 11 ) {
			this.currentMonth = 0;
			this.currentYear++;
		}
		else {
			this.currentMonth++;
		}
		this.generateCalendar();
		this.searchInfo = {
			search     : '' ,
			date_start : this.getMonthRange( this.currentYear , this.currentMonth ).start ,
			date_end   : this.getMonthRange( this.currentYear , this.currentMonth ).end
		};
		this.loadData( 1 , true );
	}

	isToday ( date : Date | null ) : boolean {
		if ( ! date ) return false;
		const today = new Date();
		return (
			date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear()
		);
	}

	getDateKey ( date : Date | null ) : string {
		return date
		       ? `${ date.getFullYear() }-${ date.getMonth() + 1 }-${ date.getDate() }`
		       : '';
	}

	generateWeekDays () {
		this.weekDays = [];

		const dayOfWeek    = this.selectDate.getDay();
		const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
		const monday       = new Date( this.selectDate );
		monday.setDate( this.selectDate.getDate() + diffToMonday );
		for ( let i = 0 ; i < 7 ; i++ ) {
			const date = new Date( monday );
			date.setDate( monday.getDate() + i );
			this.weekDays.push( date );
		}
	}

	prevWeek () {
		this.selectDate.setDate( this.selectDate.getDate() - 7 );
		this.generateWeekDays();
		this.searchInfo = {
			search     : '' ,
			date_start : this.getWeekRange().start ,
			date_end   : this.getWeekRange().end
		};
		this.loadData( 1 , true );
	}

	nextWeek () {
		this.selectDate.setDate( this.selectDate.getDate() + 7 );
		this.generateWeekDays();
		this.searchInfo = {
			search     : '' ,
			date_start : this.getWeekRange().start ,
			date_end   : this.getWeekRange().end
		};
		this.loadData( 1 , true );
	}

	getMonthRange = (
		year : number ,
		month : number
	) : { start : string; end : string } => {
		const start = new Date( year , month , 1 );
		const end   = new Date( year , month + 1 , 0 );
		return {
			start : this.helper.formatSQLDate( start ) ,
			end   : this.helper.formatSQLDate( end )
		};
	};
	getWeekRange  = () : { start : string; end : string } => {
		return {
			start : this.helper.formatSQLDate( this.weekDays[ 0 ] ) ,
			end   : this.helper.formatSQLDate(
				this.weekDays[ this.weekDays.length - 1 ]
			)
		};
	};

	checkCoLich ( date : Date ) : boolean {
		if (
			this.dataTable.data().find(
				( item ) =>
					this.helper.formatSQLDate( new Date( item.time_start ) ) ==
					this.helper.formatSQLDate( new Date( date ) )
			)
		) {
			return true;
		}
		return false;
	}

	getlich1ngay ( date : Date ) : LichHoc[] {
		return this.dataTable.data().filter(
			( item ) =>
				this.helper.formatSQLDate( new Date( item.time_start ) ) ==
				this.helper.formatSQLDate( new Date( date ) )
		);
	}

	getRemainingWeekdaysInMonth ( dateSelect : Date ) : Date[] {
		const targetDay = dateSelect.getDay();
		const year      = dateSelect.getFullYear();
		const month     = dateSelect.getMonth();
		const hours     = dateSelect.getHours();
		const minutes   = dateSelect.getMinutes();
		const seconds   = dateSelect.getSeconds();

		const daysInMonth     = new Date( year , month + 1 , 0 ).getDate();
		const result : Date[] = [];

		for ( let day = dateSelect.getDate() ; day <= daysInMonth ; day++ ) {
			const date = new Date( year , month , day , hours , minutes , seconds );
			if (
				date.getDay() === targetDay &&
				! this.dataTable.data().find(
					( item ) =>
				this.helper.formatSQLTimeStamp(
					new Date( item.time_start )
				) == this.helper.formatSQLTimeStamp( date ) &&
				item.class_id == this.formField( 'class_id' ).value
				)
			) {
				result.push( date );
			}
		}

		return result;
	}

	updateMode ( event : { mode : DiemDanhMode } ) {
		this.diemdanhMode.set( event.mode );
	}

	checkAfterDate ( date : Date ) : boolean {
		return this.helper.isAfterDate( date , this.today );
	}

	shortenText ( text : string ) : string {
		return text.length > 15 ? text.slice( 0 , 15 ) + '...' : text;
	}

	ngOnDestroy () : void {
		this.onDestroy$.next( 'OnDestroy' );
		this.onDestroy$.complete();
	}
}
