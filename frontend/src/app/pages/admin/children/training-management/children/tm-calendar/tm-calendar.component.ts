import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { FormsModule , ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';

type lichHocMode = 'thang' | 'tuan';
@Component( {
    selector    : 'app-tm-calendar' ,
    imports     : [
        ReactiveFormsModule ,
        FormsModule ,
        CommonModule ,
        DatePickerModule ,
        ButtonModule ,
        MatDialogModule ,
        CheckboxModule ,
        DialogModule
    ] ,
    templateUrl : './tm-calendar.component.html' ,
    styleUrl    : './tm-calendar.component.css'
} )
export default class TmCalendarComponent {
    // currentYear : number;
    // currentMonth : number;
    // calendarDays : ( Date | null )[]            = [];
    // weekDays : Date[]                           = [];
    // optionList                                  = [
    // 	{ id : 'thang' , value : 'Tháng' } ,
    // 	{ id : 'tuan' , value : 'Tuần' }
    // ];
    // optionStatus : IctuDropdownOption<number>[] = [
    // 	{ value : -1 , label : ' Hủy' } ,
    // 	{ value : 0 , label : 'Chưa diễn ra' } ,
    // 	{ value : 1 , label : 'Đang diễn ra' } ,
    // 	{ value : 2 , label : 'Kết thúc' }
    // ];
    //
    // showDropdown : boolean     = false;
    // listlichYeuCau : LichHoc[] = [];
    // checkboxApdung : boolean   = false;
    // lichHocSelect : LichHoc;
    // selectOption : any         = { id : 'thang' , value : 'Tháng' };
    // dayNames                   = [ 'T2' , 'T3' , 'T4' , 'T5' , 'T6' , 'T7' , 'CN' ];
    // dayNamesWeek               = [ 'CN' , 'T2' , 'T3' , 'T4' , 'T5' , 'T6' , 'T7' ];
    // monthNames                 = [
    // 	'Tháng 1' ,
    // 	'Tháng 2' ,
    // 	'Tháng 3' ,
    // 	'Tháng 4' ,
    // 	'Tháng 5' ,
    // 	'Tháng 6' ,
    // 	'Tháng 7' ,
    // 	'Tháng 8' ,
    // 	'Tháng 9' ,
    // 	'Tháng 10' ,
    // 	'Tháng 11' ,
    // 	'Tháng 12'
    // ];
    //
    // optiontype : IctuDropdownOption<number>[]     = [
    // 	{ value : 0 , label : 'Theo chương trình' } ,
    // 	{ value : 1 , label : 'Học bù' } ,
    // 	{ value : 2 , label : 'Bổ sung' }
    // ];
    // selectDate : Date;
    // optionNamHoc : number[]                       = [];
    // optionPhongHoc : PhongHoc[]                   = [];
    // visibleDialog : boolean                       = false;
    // private service : LichHocService              = inject( LichHocService );
    // private helper                                = new HelperClass();
    // private auth : AuthenticationService          = inject( AuthenticationService );
    // private notification : NotificationService    = inject( NotificationService );
    // private coSoDaoTaoService : CoSoDaoTaoService = inject( CoSoDaoTaoService );
    // private giaovienService : TeachersService     = inject( TeachersService );
    // private lopHocservice : LopHocService         = inject( LopHocService );
    // private phongHocservice : PhongHocService     = inject( PhongHocService );
    // private khoaHocservice : KhoaHocService       = inject( KhoaHocService );
    //
    // get donviId () : number {
    // 	return this.auth.user.donvi_id;
    // }
    //
    // coSoDaoTaoDropdownField : IctuDropdownField = new IctuDropdownField(
    // 	this.coSoDaoTaoService.loadOptions( this.donviId ) ,
    // 	'Chọn cơ sở đào tạo'
    // );
    //
    // giaovienDropdownField : IctuDropdownField = new IctuDropdownField(
    // 	this.giaovienService.loadEmployeeSelectOptions( this.donviId ) ,
    // 	'Chọn giáo viên phụ trách'
    // );
    // khoaHocDropdownField : IctuDropdownField  = new IctuDropdownField(
    // 	this.khoaHocservice.loadOptions( this.donviId ) ,
    // 	'Chọn khóa học'
    // );
    // state : WritableSignal<AppState>          = signal<AppState>( 'loading' );
    // private fb : FormBuilder                  = inject( FormBuilder );
    // @ViewChild( 'dialogTemplate' ) dialogTemplate! : TemplateRef<any>;
    // readonly drawer : Signal<Drawer>          = viewChild<Drawer>( 'pDrawer' );
    // mode : WritableSignal<lichHocMode>        = signal<lichHocMode>( 'thang' );
    //
    // setMode ( mode : lichHocMode , selectDate? : Date ) {
    // 	switch ( mode ) {
    // 		case 'thang':
    // 			this.generateCalendar();
    // 			this.searchInfo = {
    // 				search     : '' ,
    // 				date_start : this.getMonthRange(
    // 					this.currentYear ,
    // 					this.currentMonth
    // 				).start ,
    // 				date_end   : this.getMonthRange(
    // 					this.currentYear ,
    // 					this.currentMonth
    // 				).end
    // 			};
    // 			this.loadData( 1 , true );
    // 			this.mode.set( 'thang' );
    // 			break;
    // 		case 'tuan':
    // 			if ( selectDate ) {
    // 				this.selectDate = selectDate;
    // 			}
    // 			else {
    // 				this.selectDate = this.today;
    // 			}
    // 			this.generateWeekDays();
    // 			this.searchInfo   = {
    // 				search     : '' ,
    // 				date_start : this.getWeekRange().start ,
    // 				date_end   : this.getWeekRange().end
    // 			};
    // 			this.selectOption = { id : 'tuan' , value : 'Tuần' };
    // 			this.loadData( 1 , true );
    // 			this.mode.set( 'tuan' );
    // 			break;
    // 	}
    // }
    //
    // formControl : IctuFormControl2<LichHoc> = new IctuFormControl2<LichHoc>( {
    // 	dropdownFields : [
    // 		this.coSoDaoTaoDropdownField ,
    // 		this.giaovienDropdownField
    // 	] ,
    // 	formGroup      : this.fb.group( {
    // 		csdt_id          : 0 ,
    // 		giaovien_id      : 0 ,
    // 		trogiang_id      : '' ,
    // 		donvi_id         : [ this.donviId ] ,
    // 		phonghoc_id      : [ 0 , [ Validators.required , Validators.min( 1 ) ] ] ,
    // 		diadiem_phonghoc : [
    // 			'' ,
    // 			[
    // 				Validators.required ,
    // 				Validators.minLength( 2 ) ,
    // 				Validators.maxLength( 255 )
    // 			]
    // 		] ,
    // 		khoahoc_id       : 0 ,
    // 		class_id        : [ 0 , [ Validators.required , Validators.min( 1 ) ] ] ,
    // 		type             : [ 0 , [ Validators.required , Validators.min( 0 ) ] ] ,
    // 		time_start       : [
    // 			'' ,
    // 			[
    // 				Validators.required ,
    // 				Validators.minLength( 2 ) ,
    // 				Validators.maxLength( 255 )
    // 			]
    // 		] ,
    //
    // 		content           : '' ,
    // 		status            : [ 0 , [ Validators.required , Validators.min( -1 ) ] ] ,
    // 		reason            : [] ,
    // 		time_start_update : [ '' ] ,
    // 		status_reason     : [ 0 ] ,
    // 		apdungAll         : false
    // 	} ) ,
    // 	objectName     : 'lịch học' ,
    // 	drawer         : this.drawer
    // } );
    //
    // private handelEvent : Record<DataTableEventName , ( data : LichHoc ) => void> = {
    // 	OPEN_FORM_ADD        : () : void => {
    // 		this.formControl.formGroup.reset( {
    // 			csdt_id           : 0 ,
    // 			giaovien_id       : 0 ,
    // 			trogiang_id       : '' ,
    // 			phonghoc_id       : 0 ,
    // 			class_id         : 0 ,
    // 			khoahoc_id        : 0 ,
    // 			diadiem_phonghoc  : '' ,
    // 			time_start        : this.selectDate ,
    // 			type              : 0 ,
    // 			content           : '' ,
    // 			status            : 0 ,
    // 			apdungAll         : false ,
    // 			reason            : [] ,
    // 			status_reason     : 0 ,
    // 			time_start_update : ''
    // 		} );
    // 		this.formControl.openFormAdd();
    // 	} ,
    // 	OPEN_FORM_UPDATE     : ( data : LichHoc ) : void => {
    // 		this.formControl.formGroup.reset( {
    // 			csdt_id           : data.csdt_id ,
    // 			giaovien_id       : data.giaovien_id ,
    // 			trogiang_id       : data.trogiang_id ,
    // 			phonghoc_id       : data.phonghoc_id ,
    // 			class_id         : data.class_id ,
    // 			khoahoc_id        : data.khoahoc_id ,
    // 			diadiem_phonghoc  : data.diadiem_phonghoc ,
    // 			time_start        : new Date( data.time_start ) ,
    // 			type              : data.type ,
    // 			content           : data.content ,
    // 			status            : data.status ,
    // 			reason            : data.reason ,
    // 			status_reason     : data.status_reason ,
    // 			time_start_update : this.helper.formatSQLDateTime( new Date( data.time_start_update ) )
    // 		} );
    // 		this.lichHocSelect = data;
    // 		this.formControl.openFormEdit( data );
    // 	} ,
    // 	DELETE_SINGLE_ROW    : ( { id } : LichHoc ) : void => {
    // 		this.requestDeletingData( [ id ] );
    // 		this.notification.clearToast();
    // 		// if(this.formControl.state() == 'READY'){
    // 		//     this.closeDialog();
    // 		// }
    // 	} ,
    // 	DELETE_SELECTED_ROWS : () : void => {
    // 		const ids : number[] = this.dataTable.getSelectedData().map( ( { id } : LichHoc ) : number => id );
    // 		if ( ids.length ) {
    // 			this.requestDeletingData( ids );
    // 		}
    // 	} ,
    // 	SUBMIT_FORM          : () : void => {
    // 		if (
    // 			this.formControl.canSubmit &&
    // 			this.checktrung(
    // 				this.getPhonghoc( this.formField( 'phonghoc_id' ).value ).parent_id ,
    // 				this.getLopHoc( this.formField( 'class_id' ).value ).giaovien_id ,
    // 				this.formField( 'time_start' ).value
    // 			) == ''
    // 		) {
    // 			let info : Partial<LichHoc> = {
    // 				csdt_id          : this.getPhonghoc( this.formField( 'phonghoc_id' ).value ).parent_id ,
    // 				giaovien_id      : this.getLopHoc(
    // 					this.formField( 'class_id' ).value
    // 				).giaovien_id ,
    // 				donvi_id         : this.donviId ,
    // 				class_id        : this.formField( 'class_id' ).value ,
    // 				phonghoc_id      : this.formField( 'phonghoc_id' ).value ,
    // 				trogiang_id      : this.getLopHoc(
    // 					this.formField( 'class_id' ).value
    // 				).trogiang_id ,
    // 				khoahoc_id       : this.getLopHoc(
    // 					this.formField( 'class_id' ).value
    // 				).khoahoc_id ,
    // 				diadiem_phonghoc : this.formField( 'diadiem_phonghoc' ).value ,
    // 				time_start       : this.helper.formatSQLTimeStamp(
    // 					this.formField( 'time_start' ).value
    // 				) ,
    // 				type             : this.formField( 'type' ).value ,
    // 				content          : this.formField( 'content' ).value ,
    // 				status           : this.formField( 'status' ).value
    // 			};
    // 			if ( this.formField( 'apdungAll' ).value == false ) {
    // 				const request : Observable<any> = this.formControl.isFormAdd
    // 				                                  ? this.service.create( info )
    // 				                                  : this.service.update( this.formControl.object.id , info );
    // 				const message : string          = this.formControl.isFormAdd
    // 				                                  ? 'Thêm mới thành công'
    // 				                                  : 'Cập nhật thành công';
    // 				this.formControl.submit( request ).subscribe( {
    // 					next  : () : void => {
    // 						this.dialog.closeAll();
    // 						this.notification.toastSuccess(
    // 							message ,
    // 							'Thông báo'
    // 						);
    // 						this.loadData( 1 , true );
    // 					} ,
    // 					error : () : void => {
    // 						this.notification.toastError( message , 'Thông báo' );
    // 					}
    // 				} );
    // 			}
    // 			else {
    // 				let requests = this.getRemainingWeekdaysInMonth(
    // 					this.formField( 'time_start' ).value
    // 				).map( ( item ) => {
    // 					const infoClone      = { ... info };
    // 					infoClone.time_start =
    // 						this.helper.formatSQLTimeStamp( item );
    // 					return this.formControl.isFormAdd
    // 					       ? this.service.create( infoClone )
    // 					       : this.service.update(
    // 							this.formControl.object.id ,
    // 							infoClone
    // 						);
    // 				} );
    // 				this.formControl.state.set( 'SUBMITTING' );
    // 				forkJoin( requests ).subscribe( {
    // 					next  : () => {
    // 						this.dialog.closeAll();
    // 						this.loadData( 1 , true );
    // 						this.notification.toastSuccess( 'Thêm thành công' );
    // 					} ,
    // 					error : ( err ) => {
    // 						this.notification.toastError(
    // 							'Thêm không thành công'
    // 						);
    // 					}
    // 				} );
    // 			}
    // 			if ( this.formControl.isFormAdd ) {
    // 				this.formControl.formGroup.reset( {
    // 					id                : 0 ,
    // 					csdt_id           : [ 0 ] ,
    // 					giaovien_id       : [ 0 ] ,
    // 					trogiang_id       : [ 0 ] ,
    // 					phonghoc_id       : [ 0 ] ,
    // 					khoahoc_id        : [ 0 ] ,
    // 					diadiem_phonghoc  : '' ,
    // 					time_start        : Date.now() ,
    // 					type              : [ 0 ] ,
    // 					content           : '' ,
    // 					status            : [ 0 ] ,
    // 					reason            : [] ,
    // 					status_reason     : [ 0 ] ,
    // 					time_start_update : ''
    // 				} );
    // 			}
    // 			else {
    // 				this.openAndCloseDialog();
    // 			}
    // 		}
    // 		else {
    // 			this.notification.toastError(
    // 				this.checktrung(
    // 					this.getPhonghoc( this.formField( 'phonghoc_id' ).value ).parent_id ,
    // 					this.getLopHoc( this.formField( 'class_id' ).value ).giaovien_id ,
    // 					this.formField( 'time_start' ).value
    // 				)
    // 			);
    // 		}
    // 	}
    // };
    //
    // private eventObserver$ : Subject<DataTableEvent<LichHoc>> = new Subject<
    // 	DataTableEvent<LichHoc>
    // >();
    //
    // private onDestroy$ : Subject<string> = new Subject<string>();
    //
    // private _temp : { paged : number; resetPaginator : boolean } = {
    // 	paged          : 1 ,
    // 	resetPaginator : true
    // };
    // searchInfo : LichHocSearchInfo                               = {
    // 	search     : '' ,
    // 	date_start : '' ,
    // 	date_end   : ''
    // };
    // searchInfoLopHoc : LopHocSearchInfo                          = {
    // 	search : '' ,
    // 	namhoc : null
    // };
    // dataTable : IctuDataTable<LichHoc>                           = new IctuDataTable<LichHoc>();
    // dataTableLopHoc : IctuDataTable<LopHoc>                      = new IctuDataTable<LopHoc>();
    // permissionControl : Signal<IctuPermissionControl>            =
    // 	signal<IctuPermissionControl>(
    // 		new IctuPermissionControl(
    // 			this.auth.getUserPermission( 'dao-tao/lich-hoc' )
    // 		)
    // 	);
    // searchPhongHoc : PhongHocSearchInfo                          = {
    // 	search    : '' ,
    // 	parent_id : 0
    // };
    //
    // constructor ( private dialog : MatDialog ) {
    // 	this.eventObserver$.asObservable().pipe( takeUntil( this.onDestroy$ ) ).subscribe( ( { name , data } : DataTableEvent<LichHoc> ) : void =>
    // 		this.handelEvent[ name ]( data )
    // 	);
    // }
    //
    // formField ( path : keyof LichHoc ) : AbstractControl {
    // 	return this.formControl.formGroup.get( path );
    // }
    //
    // today = new Date();
    //
    // ngOnInit () : void {
    // 	this.selectDate   = this.today;
    // 	this.currentYear  = this.today.getFullYear();
    // 	this.currentMonth = this.today.getMonth();
    // 	this.generateCalendar();
    // 	this.searchInfo = {
    // 		search     : '' ,
    // 		date_start : this.getMonthRange( this.currentYear , this.currentMonth ).start ,
    // 		date_end   : this.getMonthRange( this.currentYear , this.currentMonth ).end
    // 	};
    // 	this.loadData( 1 , true );
    // }
    //
    // private requestDeletingData ( ids : number[] ) : void {
    // 	this.notification.confirmDelete( ids.length ).pipe(
    // 		filter( ( confirm : boolean ) : boolean => confirm ) ,
    // 		map( () : IctuDeletingAnimationControl<LichHoc> => new IctuDeletingAnimationControl( ids , this.service ) ) ,
    // 		switchMap( ( deleteController : IctuDeletingAnimationControl<LichHoc> ) : Observable<boolean> => {
    // 				deleteController.run();
    // 				return this.notification.startDeleting(
    // 					deleteController.progress
    // 				);
    // 			}
    // 		)
    // 	).subscribe( {
    // 		next  : ( success : boolean ) : void => {
    // 			if ( success ) {
    // 				this.notification.toastSuccess( 'Xóa thành công' );
    // 			}
    // 			this.loadData( 1 , true );
    // 		} ,
    // 		error : () : void => {
    // 			this.notification.toastError( 'Xóa thất bại' );
    // 		}
    // 	} );
    // }
    //
    // private preload () : Observable<void> {
    // 	const loadPhongHoc$ : Observable<PhongHoc[]> = this.optionPhongHoc.length
    // 	                                               ? of( this.optionPhongHoc )
    // 	                                               : this.phongHocservice.load( this.searchPhongHoc , this.donviId , {
    // 			limit : -1 ,
    // 			paged : 1
    // 		} ).pipe(
    // 			map( ( res : DtoObject<PhongHoc[]> ) : PhongHoc[] => {
    // 				this.optionPhongHoc = res.data;
    // 				return this.optionPhongHoc;
    // 			} )
    // 		);
    //
    // 	const loadLopHoc$ : Observable<LopHoc[]> = this.dataTableLopHoc.data().length
    // 	                                           ? of( this.dataTableLopHoc.data() )
    // 	                                           : this.lopHocservice.load( this.searchInfoLopHoc , this.donviId , 0 , {
    // 			limit : -1 ,
    // 			paged : 1
    // 		} ).pipe(
    // 			map( ( res : DtoObject<LopHoc[]> ) : LopHoc[] => {
    // 				this.dataTableLopHoc.fillData( res.data );
    // 				return this.dataTableLopHoc.data();
    // 			} )
    // 		);
    //
    // 	return forkJoin( [ loadPhongHoc$ , loadLopHoc$ ] ).pipe( map( () => {
    // 	} ) );
    // }
    //
    // loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
    // 	this.state.set( 'loading' );
    // 	this._temp = { paged , resetPaginator };
    // 	this.coSoDaoTaoDropdownField.load();
    // 	this.khoaHocDropdownField.load();
    // 	this.giaovienDropdownField.load();
    // 	this.preload().subscribe( {
    // 		next  : () => {
    // 			forkJoin( [
    // 				this.coSoDaoTaoDropdownField.load() ,
    // 				this.khoaHocDropdownField.load() ,
    // 				this.giaovienDropdownField.load() ,
    // 				this.service.load( this.searchInfo , this.donviId , 0 , 0 , {
    // 					limit : -1 ,
    // 					paged
    // 				} ) ,
    // 				this.service.loadYeucau(
    // 					this.searchInfo ,
    // 					this.donviId ,
    // 					0 ,
    // 					0 ,
    // 					{
    // 						limit : -1 ,
    // 						paged
    // 					}
    // 				)
    // 			] ).pipe(
    // 				map(
    // 					( [ _ , __ , ___ , res1 , res2 ] : [
    // 						IctuDropdownOption<number>[] ,
    // 						IctuDropdownOption<number>[] ,
    // 						IctuDropdownOption<number>[] ,
    // 						DtoObject<LichHoc[]> ,
    // 						DtoObject<LichHoc[]>
    // 					] ) => {
    // 						return {
    // 							res1 : res1.data ,
    // 							res2 : res2.data
    // 						};
    // 					}
    // 				)
    // 			).subscribe( {
    // 				next  : ( { res1 , res2 } ) => {
    // 					this.listlichYeuCau = res2;
    // 					this.dataTable.fillData( res1 );
    // 					this.state.set( 'success' );
    // 				} ,
    // 				error : () => {
    // 					this.state.set( 'error' );
    // 				}
    // 			} );
    // 		} ,
    // 		error : () => {
    // 			this.state.set( 'error' );
    // 		}
    // 	} );
    // }
    //
    // deleteRow ( data : LichHoc ) : void {
    // 	this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
    // }
    //
    // deleteSelectedRows () : void {
    // 	this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
    // }
    //
    // editRow ( data : LichHoc ) : void {
    // 	this.openAndCloseDialog();
    // 	this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
    // }
    //
    // openAndCloseDialog () : void {
    // 	this.visibleDialog = ! this.visibleDialog;
    // }
    //
    // reload ( event : MouseEvent ) : void {
    // 	this.generateCalendar();
    // 	this.searchInfo = {
    // 		search     : '' ,
    // 		date_start : this.getMonthRange( this.currentYear , this.currentMonth ).start ,
    // 		date_end   : this.getMonthRange( this.currentYear , this.currentMonth ).end
    // 	};
    // 	this.loadData( this._temp.paged , this._temp.resetPaginator );
    // 	event.preventDefault();
    // 	event.stopPropagation();
    // }
    //
    // addNewItem ( selectdate : Date ) : void {
    // 	this.selectDate = selectdate;
    // 	this.openAndCloseDialog();
    // 	this.eventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
    // }
    //
    // submitForm () : void {
    // 	this.eventObserver$.next( { name : 'SUBMIT_FORM' , data : null } );
    // }
    //
    // onDrawerHide () : void {
    // 	if ( this.formControl.submitted ) {
    // 		this.loadData( 1 , true );
    // 	}
    // }
    //
    // getTroGiang ( trogiang_id : string ) {
    // 	let result = 'Không có trợ giảng';
    //
    // 	if ( trogiang_id ) {
    // 		let tam             = trogiang_id.split( '|' ).map( Number ).filter( ( id ) => ! isNaN( id ) );
    // 		let tam1 : string[] = [];
    //
    // 		for ( let i of tam ) {
    // 			let gv = this.giaovienDropdownField.options().find( ( option ) => option.value === i );
    // 			if ( gv ) {
    // 				tam1.push( gv.label );
    // 			}
    // 		}
    //
    // 		if ( tam1.length > 0 ) {
    // 			result = tam1.join( ', ' );
    // 		}
    // 	}
    //
    // 	return result;
    // }
    //
    // getPhonghoc ( phonghoc_id : number ) : PhongHoc {
    // 	const result = this.optionPhongHoc.find(
    // 		( item ) => item.id == phonghoc_id
    // 	);
    // 	return result;
    // }
    //
    // getLopHoc ( class_id : number ) : LopHoc {
    // 	const result = this.dataTableLopHoc.data().find( ( item ) => item.id == class_id );
    // 	return result;
    // }
    //
    // generateCalendar () {
    // 	this.calendarDays = [];
    // 	const firstDay    = new Date( this.currentYear , this.currentMonth , 1 );
    // 	const lastDay     = new Date( this.currentYear , this.currentMonth + 1 , 0 );
    //
    // 	const startDayOfWeek = ( firstDay.getDay() + 6 ) % 7;
    //
    // 	for ( let i = 0 ; i < startDayOfWeek ; i++ ) {
    // 		this.calendarDays.push( null );
    // 	}
    //
    // 	for ( let i = 1 ; i <= lastDay.getDate() ; i++ ) {
    // 		this.calendarDays.push(
    // 			new Date( this.currentYear , this.currentMonth , i )
    // 		);
    // 	}
    // }
    //
    // prevMonth () {
    // 	if ( this.currentMonth === 0 ) {
    // 		this.currentMonth = 11;
    // 		this.currentYear--;
    // 	}
    // 	else {
    // 		this.currentMonth--;
    // 	}
    // 	this.generateCalendar();
    // }
    //
    // nextMonth () {
    // 	if ( this.currentMonth === 11 ) {
    // 		this.currentMonth = 0;
    // 		this.currentYear++;
    // 	}
    // 	else {
    // 		this.currentMonth++;
    // 	}
    // 	this.generateCalendar();
    // }
    //
    // isToday ( date : Date | null ) : boolean {
    // 	if ( ! date ) return false;
    // 	const today = new Date();
    // 	return (
    // 		date.getDate() === today.getDate() &&
    // 		date.getMonth() === today.getMonth() &&
    // 		date.getFullYear() === today.getFullYear()
    // 	);
    // }
    //
    // getDateKey ( date : Date | null ) : string {
    // 	return date
    // 	       ? `${ date.getFullYear() }-${ date.getMonth() + 1 }-${ date.getDate() }`
    // 	       : '';
    // }
    //
    // generateWeekDays () {
    // 	this.weekDays = [];
    // 	const dayOfWeek    = this.selectDate.getDay();
    // 	const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    // 	const monday       = new Date( this.selectDate );
    // 	monday.setDate( this.selectDate.getDate() + diffToMonday );
    // 	for ( let i = 0 ; i < 7 ; i++ ) {
    // 		const date = new Date( monday );
    // 		date.setDate( monday.getDate() + i );
    // 		this.weekDays.push( date );
    // 	}
    // }
    //
    // prevWeek () {
    // 	this.selectDate.setDate( this.selectDate.getDate() - 7 );
    // 	this.generateWeekDays();
    // 	this.searchInfo = {
    // 		search     : '' ,
    // 		date_start : this.getWeekRange().start ,
    // 		date_end   : this.getWeekRange().end
    // 	};
    // 	this.loadData( 1 , true );
    // }
    //
    // nextWeek () {
    // 	this.selectDate.setDate( this.selectDate.getDate() + 7 );
    // 	this.generateWeekDays();
    // 	this.searchInfo = {
    // 		search     : '' ,
    // 		date_start : this.getWeekRange().start ,
    // 		date_end   : this.getWeekRange().end
    // 	};
    // 	this.loadData( 1 , true );
    // }
    //
    // getMonthRange = (
    // 	year : number ,
    // 	month : number
    // ) : { start : string; end : string } => {
    // 	const start = new Date( year , month , 1 );
    // 	const end   = new Date( year , month + 1 , 0 );
    // 	return {
    // 		start : this.helper.formatSQLDate( start ) ,
    // 		end   : this.helper.formatSQLDate( end )
    // 	};
    // };
    // getWeekRange  = () : { start : string; end : string } => {
    // 	return {
    // 		start : this.helper.formatSQLDate( this.weekDays[ 0 ] ) ,
    // 		end   : this.helper.formatSQLDate(
    // 			this.weekDays[ this.weekDays.length - 1 ]
    // 		)
    // 	};
    // };
    //
    // checkCoLich ( date : Date ) : boolean {
    // 	if (
    // 		this.dataTable.data().find(
    // 			( item ) =>
    // 				this.helper.formatSQLDate( new Date( item.time_start ) ) ==
    // 				this.helper.formatSQLDate( new Date( date ) )
    // 		)
    // 	) {
    // 		return true;
    // 	}
    // 	return false;
    // }
    //
    // getlich1ngay ( date : Date ) : LichHoc[] {
    // 	return this.dataTable.data().filter(
    // 		( item ) =>
    // 			this.helper.formatSQLDate( new Date( item.time_start ) ) ==
    // 			this.helper.formatSQLDate( new Date( date ) )
    // 	);
    // }
    //
    // getRemainingWeekdaysInMonth ( dateSelect : Date ) : Date[] {
    // 	const targetDay = dateSelect.getDay();
    // 	const year      = dateSelect.getFullYear();
    // 	const month     = dateSelect.getMonth();
    // 	const hours     = dateSelect.getHours();
    // 	const minutes   = dateSelect.getMinutes();
    // 	const seconds   = dateSelect.getSeconds();
    //
    // 	const daysInMonth     = new Date( year , month + 1 , 0 ).getDate();
    // 	const result : Date[] = [];
    //
    // 	for ( let day = dateSelect.getDate() ; day <= daysInMonth ; day++ ) {
    // 		const date = new Date( year , month , day , hours , minutes , seconds );
    // 		if (
    // 			date.getDay() === targetDay &&
    // 			! this.dataTable.data().find(
    // 				( item ) =>
    // 			this.helper.formatSQLTimeStamp(
    // 				new Date( item.time_start )
    // 			) == this.helper.formatSQLTimeStamp( date ) &&
    // 			item.class_id == this.formField( 'class_id' ).value
    // 			)
    // 		) {
    // 			result.push( date );
    // 		}
    // 	}
    //
    // 	return result;
    // }
    //
    // checktrung ( phonghoc_id : number , giaovien_id : number , date : Date ) : string {
    // 	if (
    // 		this.dataTable.data().find(
    // 			( item ) =>
    // 				this.helper.formatSQLTimeStamp(
    // 					new Date( item.time_start )
    // 				) == this.helper.formatSQLTimeStamp( date ) &&
    // 				item.giaovien_id == giaovien_id
    // 		)
    // 	) {
    // 		return 'Giáo viên đã được phân lịch';
    // 	}
    // 	else if (
    // 		this.dataTable.data().find(
    // 			( item ) =>
    // 				this.helper.formatSQLTimeStamp(
    // 					new Date( item.time_start )
    // 				) == this.helper.formatSQLTimeStamp( date ) &&
    // 				this.getPhonghoc( item.phonghoc_id ).parent_id ==
    // 				phonghoc_id
    // 		)
    // 	) {
    // 		return 'Phòng học đã được sử dụng';
    // 	}
    // 	else {
    // 		return '';
    // 	}
    // }
    //
    // shortenText ( text : string ) : string {
    // 	return text.length > 15 ? text.slice( 0 , 15 ) + '...' : text;
    // }
    //
    // getLopHocText ( item : LichHoc ) : string {
    // 	return `${ this.getLopHoc( item.class_id ).name } (${
    // 		this.getPhonghoc( item.phonghoc_id ).code
    // 	})`;
    // }
    //
    // updateLichHocYeucaudoi ( status : number ) : void {
    // 	if (
    // 		this.checktrung(
    // 			this.getPhonghoc( this.formField( 'phonghoc_id' ).value ).parent_id ,
    // 			this.getLopHoc( this.formField( 'class_id' ).value ).giaovien_id ,
    // 			new Date( this.formField( 'time_start_update' ).value )
    // 		) == ''
    // 	) {
    // 		const info : Partial<LichHoc>   = {
    // 			status_reason : status ,
    // 			time_start    :
    // 				status == 3
    // 				? this.helper.formatSQLTimeStamp(
    // 					new Date( this.formField( 'time_start_update' ).value )
    // 				)
    // 				: this.helper.formatSQLTimeStamp(
    // 					this.formField( 'time_start' ).value
    // 				)
    // 		};
    // 		const request : Observable<any> = this.formControl.isFormAdd
    // 		                                  ? this.service.create( info )
    // 		                                  : this.service.update( this.formControl.object.id , info );
    // 		const message : string          = this.formControl.isFormAdd
    // 		                                  ? 'Thêm mới thành công'
    // 		                                  : 'Cập nhật thành công';
    // 		this.formControl.submit( request ).subscribe( {
    // 			next  : () : void => {
    // 				this.dialog.closeAll();
    // 				this.notification.toastSuccess( message , 'Thông báo' );
    // 				this.loadData( 1 , true );
    // 			} ,
    // 			error : () : void => {
    // 				this.notification.toastError( message , 'Thông báo' );
    // 			}
    // 		} );
    // 	}
    // 	else {
    // 		this.notification.toastError(
    // 			this.checktrung(
    // 				this.getPhonghoc( this.formField( 'phonghoc_id' ).value ).parent_id ,
    // 				this.getLopHoc( this.formField( 'class_id' ).value ).giaovien_id ,
    // 				this.formField( 'time_start' ).value
    // 			)
    // 		);
    // 	}
    // }
    //
    // toggleDropdown () {
    // 	this.showDropdown = ! this.showDropdown;
    // }
    //
    // ngOnDestroy () : void {
    // 	this.onDestroy$.next( 'OnDestroy' );
    // 	this.onDestroy$.complete();
    // }
}
