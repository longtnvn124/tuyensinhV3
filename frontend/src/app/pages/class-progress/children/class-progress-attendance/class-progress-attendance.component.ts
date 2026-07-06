import { Component , inject , input , InputSignal , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButtonModule } from '@angular/material/button';
import { AbstractControl , FormBuilder , FormControl , FormsModule , ReactiveFormsModule , Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { MatDialog , MatDialogModule , MatDialogRef } from '@angular/material/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { IctuPermissionControl } from '@models/ictu-base-model';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { HocSinhLopHocService } from '@services/hoc-sinh-lop-hoc.service';
import { DiemDanhService } from '@services/diem-danh.service';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { AppState } from '@models/app-state';
import { Drawer } from 'primeng/drawer';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { AttendanceSocKet , DiemDanh , DiemDanhStatus } from '@models/diem-danh';
import { DataTableEvent , DataTableEventName , IctuDataTable , IctuDataTable2 } from '@models/datatable';
import { firstValueFrom , forkJoin , interval , map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { HocSinhLopHoc , HocSinhLopHocExtend } from '@models/hoc-sinh-lop-hoc';
import { debounceTime , filter } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from '@models/dto';
import { Textarea } from 'primeng/textarea';
import { ClassActivitiesService } from '@app/services/class-activities.service';
import { ClassActivity , ClassActivityParams } from '@app/models/class-activities';
import { PhuHuynh } from '@app/models/phu-huynh';
import { PhuHuynhSearchInfo , PhuHuynhService } from '@app/services/phu-huynh.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { CourseAttachment } from '@app/models/course';
import { ClassRelative } from '@app/models/class';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonImageExtension , CommonVideoExtension , FILE_EXTENSIONS , FileExtensionSupported , getFileExtension , IctuBasicFile , IMAGE_EXTENSIONS_SET , VIDEO_EXTENSIONS_SET } from '@app/models/file';
import { _1Gb } from '@app/utilities/syscats';
import { formatBytes , Helper , HelperClass } from '@app/utilities/helper';
import { IctuFileUploaderDialogResponse } from '@app/theme/components/ictu-file-uploader/ictu-file-uploader.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TooltipModule } from 'primeng/tooltip';
import { IctuFileService } from '@app/services/ictu-file.service';
import { tokenGetter } from '@app/app.config';
import { IctuMediaLoaderDirective } from '@app/directives/ictu-media-loader.directive';
import { ClassMediaService } from '@app/services/class-media.service';
import { ClassMedia , ClassMediaCriteriaScores } from '@app/models/class-media';
import { InputText } from 'primeng/inputtext';
import { MatCheckbox } from '@angular/material/checkbox';
import { ViewDocument } from '@app/components/view-document/view-document';
import { ClassCurriculumLectureMediaPictureComponent } from '@app/components/class-curriculums/class-curriculum-lecture-media-picture/class-curriculum-lecture-media-picture.component';
import { CourseLessonStructureMedia } from '@app/pages/edit-course/children/edit-course-lessons/children/edit-course-lesson-structure-media/course-lesson-structure-media';
import { ClassSessionRelative } from '@app/models/class-session';
import { ClassSessionService } from '@app/services/class-session.service';
import { ConfirmComponent , ConfirmDialogData } from '@app/theme/components/confirm/confirm.component';
import { ButtonBase } from '@app/models/button';
import { IctuCriteriaScoresControlComponent } from '@components/form-controls/ictu-criteria-scores-control/ictu-criteria-scores-control.component';

type statepage = 'load' | 'error' | 'success' | 'upload';

type EditCourseFormName = 'activities' | 'media';

type ImageVideoExtension = CommonImageExtension | CommonVideoExtension;

interface RemoveFormItemEvent {
	formName : EditCourseFormName;
	index : number;
}

type Mode = 'default' | 'media';

@Component( {
	selector    : 'app-class-progress-attendance' ,
	imports     : [
		LoadingProgressComponent ,
		ReactiveFormsModule ,
		FormsModule ,
		CommonModule ,
		DatePickerModule ,
		ButtonModule ,
		MatDialogModule ,
		CheckboxModule ,
		DialogModule ,
		MatMenuModule ,
		MatIconModule ,
		MatButtonModule ,
		Textarea ,
		MatTooltipModule ,
		MultiSelectModule ,
		SelectModule ,
		TooltipModule ,
		InputText ,
		MatCheckbox ,
		ViewDocument ,
		ClassCurriculumLectureMediaPictureComponent ,
		MatProgressBar ,
		IctuMediaLoaderDirective ,
		IctuCriteriaScoresControlComponent
	] ,
	templateUrl : './class-progress-attendance.component.html' ,
	styleUrl    : './class-progress-attendance.component.css'
} )
export class ClassProgressAttendanceComponent {
	visibleDialogPhuHuynh : boolean = false;

	visibleDialogComment : boolean = false;

	visibleDialogSpeakingTest : boolean = false;

	visibleDialogAttendanceSocet : boolean = false;

	private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

	valueStudentCommentOnly : HocSinhLopHocExtend;

	private auth : AuthenticationService = inject( AuthenticationService );

	private notification : NotificationService = inject( NotificationService );

	private classStudentService : HocSinhLopHocService = inject( HocSinhLopHocService );

	private diemdanhService : DiemDanhService = inject( DiemDanhService );

	private activitiesService : ClassActivitiesService = inject( ClassActivitiesService );

	private classMediaService : ClassMediaService = inject( ClassMediaService );

	private classSessionservice : ClassSessionService = inject( ClassSessionService );

	visibleMedia : boolean = true;

	public visibleDialogClassStudent : boolean = false;

	public dataTableClassStudent : IctuDataTable2<HocSinhLopHoc> = new IctuDataTable2<HocSinhLopHoc>();

	indexClassMediaUpdate : number = 0;

	private phuHuynhservice : PhuHuynhService = inject( PhuHuynhService );

	private helper = new HelperClass();

	classObject : InputSignal<ClassRelative> = input.required<ClassRelative>();

	class_session_params : InputSignal<ClassSessionRelative> = input.required<ClassSessionRelative>();

	class_session_value : WritableSignal<ClassSessionRelative> = signal<ClassSessionRelative>( null );

	student_id_comment : number = 0;

	canChange : InputSignal<boolean> = input.required<boolean>();

	get donviId() : number {
		return this.auth.user.donvi_id;
	}

	get user_id() : number {
		return this.auth.user.id;
	}

	searchInfoPhuhuynh : PhuHuynhSearchInfo = {
		search : ''
	};

	listPhuHuynh : PhuHuynh[] = [];

	phuHuynhManager : PhuHuynh;

	stateDialog : WritableSignal<statepage> = signal<statepage>( 'load' );

	headTitleDialog : string = '';

	hocsinhSelected : HocSinhLopHoc;

	activitiesStudent : ClassActivity;

	speakingTestStudent : ClassMedia;

	optionsTrangThai : IctuDropdownOption<string>[] = [
		{ value : 'UNEXCUSED' , label : 'Nghỉ không phép' } ,
		{ value : 'LATE' , label : 'Đi muộn' } ,
		{ value : 'EXCUSED' , label : 'Nghỉ có phép' } ,
		{ value : 'PRESENT' , label : 'Đi học' }
	];

	classMediaDataTable : IctuDataTable2<ClassMedia> = new IctuDataTable2<ClassMedia>();

	private fileChooserObserver : Subject<EditCourseFormName> = new Subject<EditCourseFormName>();

	private previewFileObserver$ : Subject<IctuBasicFile> = new Subject<IctuBasicFile>();

	protected deletingFormItemIndex : WritableSignal<number> = signal( -1 );

	private removeFormItemObserver : Subject<RemoveFormItemEvent> = new Subject<RemoveFormItemEvent>();

	private dataConfirm : ConfirmDialogData = {
		heading : 'Bạn có chắc chắn muốn lưu trạng thái điểm danh không?' ,
		message : '' ,
		buttons : [
			{
				name  : 'yes' ,
				label : 'Có' ,
				icon  : 'ti ti-check' ,
				class : 'p-button-primary p-button-rounded'
			} ,
			{
				name  : 'no' ,
				label : 'Không' ,
				icon  : 'ti ti-x' ,
				class : 'p-button-secondary p-button-rounded'
			}
		]
	};

	private dialog : MatDialog = inject( MatDialog );

	modeState : WritableSignal<Mode> = signal<Mode>( 'default' );

	setMode( mode : Mode ) {
		switch ( mode ) {
			case 'default':
				this.modeState.set( 'default' );
				break;
			case 'media':
				this.loadClassMedia();
				break;
		}
	}

	state : WritableSignal<AppState | 'unset_class_group' | 'upload'> = signal<AppState>( 'loading' );
	private fb : FormBuilder                                          = inject( FormBuilder );
	readonly drawer : Signal<Drawer>                                  = viewChild<Drawer>( 'pDrawer' );

	formControl : IctuFormControl2<ClassActivity> = new IctuFormControl2<ClassActivity>( {
		dropdownFields : [] ,
		formGroup      : this.fb.group( {
			donvi_id         : [ this.donviId ] ,
			class_id         : [ 0 ] ,
			class_session_id : [ 0 ] ,
			type             : [ '' ] ,
			student_ids      : [ [] , [ Validators.required ] ] ,
			comment          : [ '' ] ,
			media            : [ [] ] ,
			criteria_scores  : []
		} ) ,
		objectName     : '' ,
		drawer         : this.drawer
	} );

	headerLoad = 'Loading...';

	private handelEvent : Record<DataTableEventName , ( data : DiemDanh ) => void> = {
		OPEN_FORM_ADD        : () : void => {
		} ,
		OPEN_FORM_UPDATE     : ( data : DiemDanh ) : void => {
		} ,
		DELETE_SINGLE_ROW    : ( { id } : DiemDanh ) : void => {
			this.notification.clearToast();
		} ,
		DELETE_SELECTED_ROWS : () : void => {
		} ,
		SUBMIT_FORM          : () : void => {
			const info : Partial<DiemDanh>       = {};
			const request : Observable<DiemDanh> = this.formControl.isFormAdd
			                                       ? this.diemdanhService.create( info )
			                                       : this.diemdanhService.update(
					this.formControl.object.id ,
					info
				);
			const message : string               = this.formControl.isFormAdd
			                                       ? 'Thêm mới thành công'
			                                       : 'Cập nhật thành công';
			this.formControl.submit( request ).subscribe( {
				next  : () : void => {
					this.notification.toastSuccess( message , 'Thông báo' );
					this.state.set( 'loading' );
					this.loadData();
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

	private eventObserver$ : Subject<DataTableEvent<DiemDanh>> = new Subject<
		DataTableEvent<DiemDanh>
	>();

	private onDestroy$ : Subject<string> = new Subject<string>();

	dataTable : IctuDataTable<HocSinhLopHocExtend> =
		new IctuDataTable<HocSinhLopHocExtend>();

	listDiemDanh : DiemDanh[] = [];

	listDiemDanhBoTro : DiemDanh[] = [];

	TTDiemDanh = signal<ClassActivityParams>( {
		dihoc   : [] ,
		nghihoc : [] ,
		dimuon  : []
	} );

	idTTDiemDanh : number = 0;

	permissionControl : Signal<IctuPermissionControl> = signal<IctuPermissionControl>( new IctuPermissionControl( this.auth.getUserPermission( 'teaching_assistant/calendar' ) ) );

	attendance_selected : WritableSignal<HocSinhLopHocExtend> = signal<HocSinhLopHocExtend>( null );

	constructor() {
		this.eventObserver$.asObservable().pipe( takeUntil( this.onDestroy$ ) ).subscribe( ( { name , data } : DataTableEvent<DiemDanh> ) : void =>
			this.handelEvent[ name ]( data )
		);
		this.fileChooserObserver.pipe( debounceTime( 500 ) , takeUntilDestroyed() ).subscribe( ( formName : EditCourseFormName ) : void => {
			this.openFileChooserOnDocumentTab( formName );
		} );
		this.removeFormItemObserver.pipe( takeUntilDestroyed() , debounceTime( 500 ) ).subscribe( ( { formName , index } : RemoveFormItemEvent ) : void => {
			switch ( formName ) {
				case 'activities':
					const _value : IctuBasicFile[] = Helper.cloneObject(
						this.getControl( 'media' ).value ?? []
					);
					this.getControl( 'media' ).setValue(
						_value.filter(
							( _ : IctuBasicFile , idx : number ) : boolean =>
								idx !== index
						) ,
						{ emitEvent : true }
					);
					this.getControl( 'media' ).markAsTouched();
					break;
				case 'media':
					const itemdelete = this.classMediaDataTable.data().find( ( _ , i ) => i == index );
					this.requestDeleteClassMedia( [ itemdelete.id ] );
					break;

			}
			this.deletingFormItemIndex.set( -1 );
		} );
		this.previewFileObserver$.pipe( debounceTime( 500 ) , takeUntilDestroyed() ).subscribe( ( file : IctuBasicFile ) : void => {
			this.notification.previewFile( { info : [ file ] } );
		} );
	}

	private openFileChooserOnDocumentTab( formName : EditCourseFormName ) : void {
		const panel : HTMLInputElement = Object.assign<
			HTMLInputElement ,
			Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>
		>( document.createElement( 'input' ) , {
			type     : 'file' ,
			accept   : FILE_EXTENSIONS.map(
				( ext : ImageVideoExtension ) : string => `.${ ext }`
			).join( ', ' ) ,
			multiple : true
		} );
		panel.onchange                 = async () : Promise<void> => {
			if ( panel.files?.length ) {
				this.visibleMedia = false;

				const files = Array.from( panel.files );
				for ( const file of files ) {
					await this.preUploadFileOnDocumentTab( file , formName );
				}

				panel.remove();

				Promise.resolve().then( () => {
					this.visibleMedia = true;
				} );
			}
		};


		panel.click();
	}

	private preUploadFileOnDocumentTab( file : File , formName : EditCourseFormName ) : void {
		const ext : FileExtensionSupported | string = getFileExtension( file );
		switch ( true ) {
			case !FILE_EXTENSIONS.includes( <ImageVideoExtension> ext ):
				this.notification.toastError(
					'Định dạng file chưa được hỗ trợ - ' + ext
				);
				break;
			case file.size > _1Gb:
				this.notification.toastError(
					'Dung lượng file quá lớn - ' + formatBytes( file.size , 2 )
				);
				break;
			default:
				this.notification.uploadFile( {
					file ,
					fileAttributes : {
						tag    : 'student-medias' ,
						public : 1
					}
				} ).pipe( takeUntil( this.onDestroy$ ) ).subscribe(
					( response : IctuFileUploaderDialogResponse ) : void => {
						if ( response.success ) {
							const _newDocument : IctuBasicFile = {
								id       : response.info.id ,
								name     : response.info.name ,
								title    : response.info.title ,
								url      : response.info.url ,
								ext      : response.info.ext ,
								type     : response.info.type ,
								size     : response.info.size ,
								location : response.info.location
							};
							switch ( formName ) {
								case ( 'activities' ):
									const _value : IctuBasicFile[] =
											  Helper.cloneObject(
												  this.getControl( 'media' ).value ?? []
											  );
									_value.push( _newDocument );
									this.getControl( 'media' ).setValue( _value , {
										emitEvent : true
									} );
									this.getControl( 'media' ).markAsTouched();
									break;

								case ( 'media' ):
									this.state.set( 'upload' );
									const student_ids              = this.dataTableClassStudent.data().map( ( t ) => t.hocsinh_id );
									let info : Partial<ClassMedia> = {
										class_id         : this.classObject().id ,
										class_session_id : this.class_session_value().id ,
										student_ids      : student_ids ,
										content          : '' ,
										donvi_id         : this.donviId ,
										type             : 'ACTIVITY' ,
										media            : _newDocument
									};
									forkJoin( {
										media   : this.classMediaService.create( info ) ,
										session : this.classSessionservice.update(
											this.class_session_value().id ,
											{ media_approved : 0 }
										)
									} ).subscribe( {
										next  : ( { media , session } ) => {
											info.id = media;

											const _valueMedia : ClassMedia[] =
													  Helper.cloneObject( this.classMediaDataTable.data() ?? [] );

											_valueMedia.push( info as ClassMedia );
											this.classMediaDataTable.fillData( _valueMedia );

											this.state.set( 'success' );
											this.notification.toastSuccess( 'Thông báo' , 'Thêm mới thành công' );
										} ,
										error : () => {
											this.state.set( 'success' );
											this.notification.toastError( 'Thông báo' , 'Thêm mới không thành công' );
										}
									} );
							}
						}
					}
				);
				break;
		}
	}

	formField( path : keyof ClassActivity ) : AbstractControl {
		return this.formControl.formGroup.get( path );
	}

	public getControl<K extends keyof ClassActivity>(
		key : K
	) : FormControl<ClassActivity[K]> {
		return this.formControl.formGroup.get( key as string ) as FormControl<
			ClassActivity[K]
		>;
	}

	today = new Date();

	ngOnInit() : void {
		this.auth.listen<AttendanceSocKet>( `diem_danh` ).pipe( takeUntil( this.onDestroy$ )
		).subscribe( ( res ) : void => {
			const index = this.dataTable.data().findIndex( ( t ) => t.diemdanh.class_session_id == res.class_session_id && t.diemdanh.hocsinh_id == res.hocsinh_id );
			if ( index != -1 ) {
				let _value : HocSinhLopHocExtend[] =
						Helper.cloneObject(
							this.dataTable.data() ?? []
						);
				_value[ index ]                    = {
					... _value[ index ] ,
					diemdanh         : {
						... _value[ index ].diemdanh ,
						status : res.status ,
						reason : res.reason
					} ,
					attendance_socet : {
						... res ,
						created_at : this.helper.formatSQLDateTime( new Date() )
					}
				};
				this.dataTable.fillData( _value );
				this.setTTDiemDanh();
			}
		} );
		this.class_session_value.set( this.class_session_params() );
		this.state.set( 'loading' );
		this.loadData();
		interval( 5 * 60 * 1000 ).pipe( takeUntil( this.onDestroy$ ) ).subscribe( () => {
			this.loadData();
		} );
	}

	private requestDeletingData( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map(
				() : IctuDeletingAnimationControl<DiemDanh> =>
					new IctuDeletingAnimationControl(
						ids ,
						this.diemdanhService
					)
			) ,
			switchMap(
				(
					deleteController : IctuDeletingAnimationControl<DiemDanh>
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
				this.loadData();
			} ,
			error : () : void => {
				this.notification.toastError( 'Xóa thất bại' );
			}
		} );
	}

	private requestDeleteClassMedia( ids : number[] ) : void {
		this.notification.confirmDelete( ids.length ).pipe(
			filter( ( confirm : boolean ) : boolean => confirm ) ,
			map(
				() : IctuDeletingAnimationControl<ClassMedia> =>
					new IctuDeletingAnimationControl(
						ids ,
						this.classMediaService
					)
			) ,
			switchMap(
				(
					deleteController : IctuDeletingAnimationControl<ClassMedia>
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
					const _valueMedia : ClassMedia[] = Helper.cloneObject(
						this.classMediaDataTable.data() ?? []
					);
					const result                     = _valueMedia.filter( ( item ) => item.id != ids[ 0 ] );
					this.classMediaDataTable.fillData( result );
					this.notification.toastSuccess( 'Xóa thành công' );
				}
				this.loadData();
			} ,
			error : () : void => {
				this.notification.toastError( 'Xóa thất bại' );
			}
		} );
	}

	loadData() : void {
		this.headerLoad   = 'Loading...';
		const diemDanhIds = [
			... ( this.class_session_value().diem_danh_ids ?? [] ) ,
			... ( this.class_session_value().diem_danh_ids_absent ?? [] )
		].join( ',' );


		const conditions : IctuConditionParam[] = [];
		let queryParams : IctuQueryParams       = {
			limit      : -1 ,
			paged      : 1 ,
			include    : diemDanhIds ,
			include_by : 'id'
		};
		forkJoin( [
			this.class_session_value().parent_id != 0
			? of( [] )
			: this.classStudentService.loadNoStop( this.class_session_value().class_id , this.donviId , {
				limit : -1 ,
				paged : 1
			} ) ,
			this.diemdanhService.load( this.class_session_value().id , this.donviId , {
				limit : -1 ,
				paged : 1
			} ) ,
			this.activitiesService.load(
				this.class_session_value().id ,
				this.donviId ,
				'DIEM_DANH' ,
				[] ,
				{
					limit : -1 ,
					paged : 1
				}
			) ,
			this.class_session_value().parent_id == 0
			? of( [] )
			: this.diemdanhService.query( conditions , queryParams ) ,
			this.class_session_value().parent_id == 0
			? of( [] )
			: this.classSessionservice.query( [ {
				conditionName : 'id' ,
				value         : this.class_session_value().id.toString() ,
				condition     : IctuQueryCondition.equal
			} ] , {
				limit : 1 ,
				paged : 1 ,
				with  : 'class,parent_class,hocsinh'
			} )
		] ).pipe(
			map(
				( [ res1 , res2 , res3 , res4 , res5 ] : [
					DtoObject<HocSinhLopHoc[]> ,
					DtoObject<DiemDanh[]> ,
					DtoObject<ClassActivity[]> ,
					DtoObject<DiemDanh[]> ,
					DtoObject<ClassSessionRelative[]>
				] ) => {
					let listHS : HocSinhLopHoc[] = [];
					if ( this.class_session_value().parent_id != 0 ) {
						listHS = this.class_session_value().hocsinh.map( ( t , i ) => ( {
							id             : i + 1 ,
							class_group_id : 0 ,
							class_id       : this.class_session_value().class_id ,
							donvi_id       : this.donviId ,
							hocsinh_id     : t.id ,
							status         : 1 ,
							hocsinh        : t ,
							is_deleted     : null ,
							deleted_by     : null ,
							created_by     : null ,
							updated_by     : null ,
							created_at     : null ,
							updated_at     : null
						} ) );
					} else {
						const tam : HocSinhLopHoc[] =
								  Helper.cloneObject( !this.class_session_params().extra_students ? [] : this.class_session_params().extra_students ).map( ( t , i ) => ( {
									  id             : i + 1 ,
									  class_group_id : 0 ,
									  class_id       : this.class_session_value().class_id ,
									  donvi_id       : this.donviId ,
									  hocsinh_id     : t.id ,
									  status         : 1 ,
									  hocsinh        : t ,
									  is_deleted     : null ,
									  deleted_by     : null ,
									  created_by     : null ,
									  updated_by     : null ,
									  created_at     : null ,
									  updated_at     : null
								  } ) );
						listHS                      = [
							... tam ,
							... res1.data.filter( r => !tam.some( t => t.hocsinh_id === r.hocsinh_id ) )
						];
					}
					return {
						listHS            : listHS ,
						listDiemDanh      : res2.data ,
						TTDiemDanh        : res3.data ,
						listDiemDanhBoTro : res4.data ,
						class_session     : this.class_session_value().parent_id != 0 ? res5.data[ 0 ] : this.class_session_value()
					};
				}
			)
		).subscribe( {
			next  : ( { listHS , listDiemDanh , TTDiemDanh , listDiemDanhBoTro , class_session } ) => {
				this.class_session_value.set( class_session );
				// if (this.class_session_value().parent_id == 0) {
				this.dataTable.fillData(
					listHS.map(
						( _c : HocSinhLopHoc ) : HocSinhLopHocExtend => ( {
							... _c ,
							diemdanh : listDiemDanh.reduce(
								(
									_reducer : Partial<DiemDanh> ,
									_dd : DiemDanh
								) : Partial<DiemDanh> =>
									_dd.hocsinh_id === _c.hocsinh_id
									? _dd
									: _reducer ,
								{
									status : 'PRESENT'
								}
							) ,
							isUpdate : false
						} )
					)
				);
				// }
				//  else {
				//     this.dataTable.fillData(
				//         listHS.map((_c: HocSinhLopHoc): HocSinhLopHocExtend => {
				//             const dd = listDiemDanhBoTro.find(
				//                 (_dd: DiemDanh) => _dd.hocsinh_id === _c.hocsinh_id
				//             );

				//             return {
				//                 ..._c,
				//                 diemdanh: dd
				//                     ? {
				//                         ...dd,
				//                         status: this.class_session_value().diem_danh_ids?.includes(dd.id)
				//                             ? 'PRESENT'
				//                             : 'UNEXCUSED',
				//                     }
				//                     : {
				//                         status: 'PRESENT',
				//                     },
				//                 isUpdate: false,
				//             };
				//         })
				//     );

				// }

				this.dataTableClassStudent.fillData( listHS );
				this.listDiemDanh      = listDiemDanh;
				this.listDiemDanhBoTro = listDiemDanhBoTro;
				if ( TTDiemDanh.length != 0 ) {
					this.idTTDiemDanh = TTDiemDanh[ 0 ].id;
				}
				this.setTTDiemDanh();
				this.state.set( 'success' );
			} ,
			error : () => {
				this.state.set( 'error' );
			}
		} );
	}

	deleteRow( data : DiemDanh ) : void {
		this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
	}

	deleteSelectedRows() : void {
		this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
	}

	editRow( data : DiemDanh ) : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
	}

	reload( event : MouseEvent ) : void {
		this.state.set( 'loading' );
		this.loadData();
		event.preventDefault();
		event.stopPropagation();
	}

	reloadComment( event : MouseEvent ) : void {
		this.getActivitiesStudent( this.student_id_comment ),
			event.preventDefault();
		event.stopPropagation();
	}

	addNewItem() : void {
		this.eventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
	}

	submitForm() : void {
		this.eventObserver$.next( { name : 'SUBMIT_FORM' , data : null } );
	}

	onChangePage( paged : number ) : void {
		this.state.set( 'loading' );
		this.loadData();
	}

	onDrawerHide() : void {
		this.state.set( 'loading' );
		if ( this.formControl.submitted ) {
			this.loadData();
		}
	}

	shortenText( text : string ) : string {
		return text.length > 15 ? text.slice( 0 , 15 ) + '...' : text;
	}

	GROUP_MAP = {
		PRESENT   : 1 ,
		LATE      : 1 ,
		EXCUSED   : 2 ,
		UNEXCUSED : 2
	};

	isSameGroup( a : string , b : string ) : number {
		return this.GROUP_MAP[ a ] === this.GROUP_MAP[ b ] ? 0 : 1;
	}

	submitDiemDanhAll() {
		this.headerLoad = 'Đang cập nhật...';
		this.state.set( 'loading' );
		if (
			this.dataTable.data().filter(
				( item ) =>
					item.isUpdate ||
					( item.diemdanh.status == 'PRESENT' && !item.diemdanh.id )
			).length != 0
		) {
			forkJoin( [
				this.diemdanhService.load( this.class_session_value().id , this.donviId , {
					limit : -1 ,
					paged : 1
				} ) ,
				this.activitiesService.load(
					this.class_session_value().id ,
					this.donviId ,
					'DIEM_DANH' ,
					[] ,
					{ limit : -1 , paged : 1 }
				)
			] ).pipe(
				map( ( [ resDD , resAct ] ) => ( {
					dataDiemDanh : resDD.data ,
					dataActivity : resAct?.data ?? []
				} ) ) ,
				map( ( { dataDiemDanh , dataActivity } ) => {

					const tam = this.dataTable.data().map(
						( _c : HocSinhLopHocExtend ) : HocSinhLopHocExtend => {
							const dd = dataDiemDanh.find( _dd => _dd.hocsinh_id === _c.hocsinh_id );
							return {
								... _c ,
								diemdanh : dd ? { ... _c.diemdanh , id : dd.id , is_deducted : this.isSameGroup( _c.diemdanh.status , dd?.status ?? _c.diemdanh.status ) } : { ... _c.diemdanh , is_deducted : 1 }
							};
						}
					);
					this.dataTable.fillData( tam );
					if ( dataActivity.length != 0 ) {
						this.TTDiemDanh.set( dataActivity[ 0 ].params );
						this.idTTDiemDanh = dataActivity[ 0 ].id;
					}
					return tam;
				} ) ,
				switchMap( () => {
					const requests = this.dataTable.data().filter(
						( item ) =>
							item.isUpdate ||
							( item.diemdanh.status == 'PRESENT' && !item.diemdanh.id )
					).map( ( item_submit ) => {
						const info : Partial<DiemDanh> = {
							class_session_id : this.class_session_value().id ,
							donvi_id         : this.donviId ,
							csdt_id          : this.classObject().csdt_id ?? 0 ,
							phuhuynh_id      : item_submit.hocsinh.phuhuynh_id ,
							class_id         : this.classObject().id ,
							hocsinh_id       : item_submit.hocsinh.id ,
							reason           : item_submit.diemdanh?.reason ?? '' ,
							status           : item_submit.diemdanh.status ,
							course_id        : this.class_session_value().course_id ,
							is_deducted      : item_submit.diemdanh.is_deducted
						};
						if ( !item_submit.diemdanh.id ) {
							return this.diemdanhService.create( info );
						} else {
							return this.diemdanhService.update(
								item_submit.diemdanh.id ,
								info
							);
						}
					} );

					return forkJoin( requests );
				} )
			).subscribe( {
				next  : async () => {
					this.listDiemDanh = [];
					await this.updateActivities();
					this.state.set( 'loading' );
					await this.loadData();
					this.notification.toastSuccess( 'Cập nhật thành công' , 'Thông báo' );
				} ,
				error : () => {
					this.state.set( 'success' );
					this.state.set( 'loading' );
					this.loadData();
					this.notification.toastError( 'Cập nhật không thành công' , 'Thông báo' );
				}
			} );

		} else {
			this.updateActivities();
		}
	}

	updateActivities() {
		const infoActivity : Partial<ClassActivity> = {
			donvi_id         : this.donviId ,
			class_id         : this.classObject().id ,
			comment          : '' ,
			class_session_id : this.class_session_value().id ,
			type             : 'DIEM_DANH' ,
			params           : this.TTDiemDanh()
		};
		let request;
		if ( this.idTTDiemDanh == 0 ) {
			request = this.activitiesService.create( infoActivity );
		} else {
			request = this.activitiesService.update(
				this.idTTDiemDanh ,
				infoActivity
			);
		}
		request.subscribe( {
			next  : () => {
				this.state.set( 'success' );
			} ,
			error : () => {
				this.state.set( 'success' );
			}
		} );
	}

	updateStatusDiemDanh( status : DiemDanhStatus , index : number ) : void {
		let dataTableOld = this.dataTable.data();
		if ( status == 'PRESENT' ) {
			dataTableOld[ index ].diemdanh.reason = '';
		}
		dataTableOld[ index ].diemdanh.status = status;
		dataTableOld[ index ].isUpdate        = true;
		this.dataTable.fillData( dataTableOld );
		this.setTTDiemDanh();
	}

	loadPhuHuynh( row : HocSinhLopHoc ) {
		this.stateDialog.set( 'load' );
		this.listPhuHuynh = [];
		this.phuHuynhservice.load( this.searchInfoPhuhuynh , row.hocsinh.phuhuynh_id ?? 0 , 0 , {
			limit : -1 ,
			paged : 1
		} ).pipe(
			map( ( res ) => {
				this.phuHuynhManager = res.data[ 0 ];
				return this.phuHuynhManager;
			} )
		).subscribe( {
			next  : () => {
				if ( this.phuHuynhManager ) {
					this.phuHuynhservice.load(
						this.searchInfoPhuhuynh ,
						0 ,
						this.phuHuynhManager.id ?? 0 ,
						{
							limit : -1 ,
							paged : 1
						}
					).pipe(
						map(
							(
								res : DtoObject<PhuHuynh[]>
							) : PhuHuynh[] => {
								return res.data;
							}
						)
					).subscribe( {
						next  : ( data : PhuHuynh[] ) : void => {
							this.listPhuHuynh = data;
							this.listPhuHuynh.unshift(
								this.phuHuynhManager
							);
							this.stateDialog.set( 'success' );
						} ,
						error : () : void => {
							this.stateDialog.set( 'error' );
						}
					} );
				} else {
					this.stateDialog.set( 'success' );
				}
			} ,
			error : () : void => {
				this.stateDialog.set( 'error' );
			}
		} );
	}

	getActivitiesStudent( student_id : number ) : void {
		this.stateDialog.set( 'load' );
		this.headTitleDialog    = 'Nhận xét buổi học';
		this.student_id_comment = student_id;
		this.activitiesService.load(
			this.class_session_value().id ,
			this.donviId ,
			'HOAT_DONG' ,
			[ student_id ] ,
			{
				limit : -1 ,
				paged : 1
			} ,
			this.user_id
		).pipe(
			map( ( res ) => {
				return res.data;
			} )
		).subscribe( {
			next  : ( data ) => {
				this.activitiesStudent = data.find( ( item ) => item.student_ids.length == 1 );
				this.formControl.formGroup.reset( {
					donvi_id         : this.donviId ,
					class_id         : this.classObject().id ,
					class_session_id : this.class_session_value().id ,
					type             : 'HOAT_DONG' ,
					student_ids      : this.activitiesStudent
					                   ? this.activitiesStudent.student_ids
					                   : [ student_id ] ,
					comment          : this.activitiesStudent
					                   ? this.activitiesStudent.comment
					                   : '' ,
					media            : this.activitiesStudent?.media || []
				} );
				this.stateDialog.set( 'success' );
			} ,
			error : () => {
				this.stateDialog.set( 'error' );
			}
		} );
	}

	getSpeakingTestStudent( student_id : number ) : void {
		this.stateDialog.set( 'load' );
		this.student_id_comment = student_id;
		this.headTitleDialog    = 'Nhận xét Sepaking Test';
		this.classMediaService.load(
			this.class_session_value().id ,
			this.donviId ,
			'SPEAKING_TEST' ,
			[ student_id ] ,
			{
				limit : -1 ,
				paged : 1
			} ,
			this.user_id
		).pipe(
			map( ( res ) => {
				return res.data;
			} )
		).subscribe( {
			next  : ( data ) => {
				this.speakingTestStudent = data[ 0 ];
				this.formControl.formGroup.reset( {
					donvi_id         : this.donviId ,
					class_id         : this.classObject().id ,
					class_session_id : this.class_session_value().id ,
					type             : 'SPEAKING_TEST' ,
					student_ids      : this.speakingTestStudent
					                   ? this.speakingTestStudent.student_ids
					                   : [ student_id ] ,
					comment          : this.speakingTestStudent
					                   ? this.speakingTestStudent.content
					                   : '' ,
					media            : this.speakingTestStudent?.speaking_test ?? [] ,
					criteria_scores  : this.speakingTestStudent ? ( this.speakingTestStudent.criteria_scores || [] ) : [ { 'criteria' : 'Pronunciation' , 'score' : 0 } , { 'criteria' : 'Fluency' , 'score' : 0 } , { 'criteria' : 'Vocabulary' , 'score' : 0 } ]
				} );
				this.stateDialog.set( 'success' );
			} ,
			error : () => {
				this.stateDialog.set( 'error' );
			}
		} );
	}

	submitActivitiesStudent() : void {
		this.stateDialog.set( 'upload' );
		const infoActivity : Partial<ClassActivity> = {
			donvi_id         : this.donviId ,
			class_id         : this.classObject().id ,
			class_session_id : this.class_session_value().id ,
			type             : this.formField( 'type' ).value ,
			student_ids      : this.formField( 'student_ids' ).value ,
			comment          : this.formField( 'comment' ).value ,
			media            : this.formField( 'media' ).value
		};
		let request;
		if ( !this.activitiesStudent ) {
			request = this.activitiesService.create( infoActivity );
		} else {
			request = this.activitiesService.update(
				this.activitiesStudent.id ,
				infoActivity
			);
		}
		forkJoin( {
			activities : request ,
			session    : this.classSessionservice.update(
				this.class_session_value().id ,
				{ media_approved : 0 }
			)
		} ).subscribe( {
			next  : () => {
				this.stateDialog.set( 'success' );
				this.visibleDialogComment = false;
				this.notification.toastSuccess(
					!this.activitiesStudent ? 'Lưu thành công' : 'Cập nhật thành công' ,
					'Thông báo'
				);
			} ,
			error : () => {
				this.notification.toastError(
					!this.activitiesStudent ? 'Lưu không thành công' : 'Cập nhật không thành công' ,
					'Thông báo'
				);
				this.stateDialog.set( 'success' );
			}
		} );
		// request.subscribe({
		//     next: () => {
		//         this.stateDialog.set('success');
		//         this.visibleDialogComment = false;
		//         this.notification.toastSuccess(
		//             !this.activitiesStudent ? 'Lưu thành công' : 'Cập nhật thành công',
		//             'Thông báo'
		//         );
		//     },
		//     error: () => {
		//         this.notification.toastError(
		//             !this.activitiesStudent ? 'Lưu không thành công' : 'Cập nhật không thành công',
		//             'Thông báo'
		//         );
		//         this.stateDialog.set('success');
		//     }
		// });
	}

	opendialogPhuHuynh( row : HocSinhLopHocExtend ) : void {
		this.loadPhuHuynh( row );
		this.hocsinhSelected       = row;
		this.visibleDialogPhuHuynh = true;
	}

	getRole() : string {
		if ( this.auth.userHasRole( [ 'training_management' ] ) ) {
			return 'training_management';
		} else if ( this.auth.userHasRole( [ 'teacher' ] ) ) {
			return 'teacher';
		} else if ( this.auth.userHasRole( [ 'teaching_assistant' ] ) ) {
			return 'teaching_assistant';
		} else {
			return 'unauthorized';
		}
	}

	opendialogComment( row : HocSinhLopHocExtend , isOnly : boolean ) : void {
		this.getActivitiesStudent( row.hocsinh_id );
		this.valueStudentCommentOnly = row;
		this.visibleDialogComment    = true;
		this.visibleMedia            = true;
	}

	opendialogSpeakingTest( row : HocSinhLopHocExtend ) : void {
		this.getSpeakingTestStudent( row.hocsinh_id );
		this.valueStudentCommentOnly   = row;
		this.visibleDialogSpeakingTest = true;
		this.visibleMedia              = true;
	}

	getvalueFormControl() {
		return this.formField( 'comment' ).value;
	}

	isCanSubmit() : boolean {
		const tam = this.dataTable.data().filter(
			( item ) =>
				item.isUpdate ||
				( item.diemdanh.status == 'PRESENT' && !item.diemdanh.id )
		);
		return tam.length ? true : false;
	}

	protected btnCallFileChooser( formName : EditCourseFormName ) : void {
		this.fileChooserObserver.next( formName );
	}

	protected btnPreviewFile( file : IctuBasicFile ) : void {
		this.previewFileObserver$.next( file );
	}

	protected btnRemoveFormItem(
		index : number ,
		formName : EditCourseFormName
	) : void {
		this.deletingFormItemIndex.set( index );
		this.removeFormItemObserver.next( { index , formName } );
	}

	setSrcMedia( file : IctuBasicFile ) : string {
		const result = !file
		               ? ''
		               : this.fileService.fileHostingServiceApi +
		                 'file/' +
		                 file.name +
		                 '?token=' +
		                 tokenGetter();
		return result;
	}

	checkTypeFile( file : IctuBasicFile ) : string {
		if ( IMAGE_EXTENSIONS_SET.has( file.ext as CommonImageExtension ) ) {
			return 'image';
		} else if ( VIDEO_EXTENSIONS_SET.has( file.ext as CommonVideoExtension ) ) {
			return 'video';
		} else {
			return 'undefine';
		}
	}

	loadClassMedia() : void {
		this.stateDialog.set( 'load' );
		this.classMediaService.load( this.class_session_value().id , this.donviId , 'ACTIVITY' , [] , {
			limit : -1 ,
			paged : 1
		} ).pipe( map( ( res : DtoObject<ClassMedia[]> ) : ClassMedia[] => {
			return res.data;
		} ) ).subscribe( {
			next  : ( data ) => {
				this.classMediaDataTable.fillData( data );
				this.stateDialog.set( 'success' );
				this.modeState.set( 'media' );
			} ,
			error : () => {
				this.stateDialog.set( 'error' );
			}
		} );
	}

	openDialogClassMedia( row : ClassMedia , index : number ) : void {
		this.indexClassMediaUpdate = index;
		this.setListClassStudentTestSelect( row.student_ids );
		this.visibleDialogClassStudent = true;
	}

	setListClassStudentTestSelect( student_ids : number[] ) : void {
		this.dataTableClassStudent.data().map( ( item , index ) => {
			if ( student_ids.includes( item.hocsinh_id ) ) {
				this.dataTableClassStudent.selectRow( true , index );
			}
		} );
	}

	updateListClassStudentTestSelect() : void {
		const result                                          = this.dataTableClassStudent.data().filter( ( item ) => item._ictuDataTableRowChecked == true ).map( ( item ) => item.hocsinh_id );
		const _valueMedia : ClassMedia[]                      =
				  Helper.cloneObject(
					  this.classMediaDataTable.data() ?? []
				  );
		_valueMedia[ this.indexClassMediaUpdate ].student_ids = result;
		this.classMediaDataTable.fillData( _valueMedia );
		this.setIsUpdateClassMedia( this.indexClassMediaUpdate , true );
		this.visibleDialogClassStudent = false;
	}

	updateClassMedia( row : ClassMedia ) : void {
		this.state.set( 'upload' );
		let info : Partial<ClassMedia> = {
			class_id         : this.classObject().id ,
			class_session_id : this.class_session_value().id ,
			student_ids      : row.student_ids ,
			content          : row.content ,
			donvi_id         : this.donviId ,
			type             : 'ACTIVITY' ,
			media            : row.media
		};
		this.classMediaService.update( row.id , info ).subscribe( {
			next  : () => {
				this.state.set( 'success' );
				this.notification.toastSuccess( 'Cập nhật thành công' , 'Thông báo' );
			} ,
			error : () => {
				this.state.set( 'success' );
				this.notification.toastError( 'Cập nhật không thành công' , 'Thông báo' );
			}
		} );
	}

	submitSpeakingTest() : void {
		this.stateDialog.set( 'upload' );
		let info : Partial<ClassMedia> = {
			class_id         : this.classObject().id ,
			class_session_id : this.class_session_value().id ,
			student_ids      : this.getControl( 'student_ids' ).value ,
			content          : this.getControl( 'comment' ).value ,
			donvi_id         : this.donviId ,
			type             : 'SPEAKING_TEST' ,
			speaking_test    : this.getControl( 'media' ).value,
			criteria_scores :  this.formControl.formGroup.get( 'criteria_scores' ).value,
		};
		const request                  = !this.speakingTestStudent ? this.classMediaService.create( info ) : this.classMediaService.update( this.speakingTestStudent.id , info );
		const message                  = !this.speakingTestStudent ? 'Thêm mới thành công' : 'Cập nhật thành công';
		const messageError             = !this.speakingTestStudent ? 'Thêm mới không thành công' : 'Cập nhật không thành công';
		request.subscribe( {
			next  : () => {
				this.stateDialog.set( 'success' );
				this.visibleDialogSpeakingTest = false;
				this.notification.toastSuccess( message , 'Thông báo' );
			} ,
			error : () => {
				this.stateDialog.set( 'success' );
				this.notification.toastError( messageError , 'Thông báo' );
			}
		} );
	}

	submitSaveDialog() : void {
		if ( this.formField( 'type' ).value == 'HOAT_DONG' ) {
			this.submitActivitiesStudent();
		} else {
			this.submitSpeakingTest();
		}
	}

	setIsUpdateClassMedia( index : number , isUpdate : boolean ) : void {
		this.classMediaDataTable.selectRow( isUpdate , index );
	}

	setMediaContentClassMedia( file : IctuBasicFile ) : CourseLessonStructureMedia {
		return {
			mediaType : 'picture' ,
			provider  : 'upload' ,
			content   : [
				file.location ,
				file.id ,
				file.name ,
				file.title ,
				file.ext ,
				file.type ,
				file.size ,
				this.auth.user.id
			].join( '|' )
		};
	}

	selectAttendance( row : HocSinhLopHocExtend ) : void {
		this.attendance_selected.set( row );
		this.visibleDialogAttendanceSocet = true;
	}

	submitDiemDanhBoTroAll() {
		this.headerLoad = 'Đang cập nhật...';
		this.state.set( 'loading' );
		if ( this.dataTable.data().filter( ( item ) => item.isUpdate || ( item.diemdanh.status == 'PRESENT' && !item.diemdanh.id ) ).length != 0 ) {
			let diemdanh_ids_dihoc   = [];
			let diemdanh_ids_nghihoc = [];
			this.dataTable.data().forEach( item => {
				const id = this.listDiemDanhBoTro.find( ( item1 ) => item1.hocsinh_id == item.hocsinh_id ).id;
				if ( item.diemdanh.status == 'PRESENT' || item.diemdanh.status == 'LATE' ) {
					diemdanh_ids_dihoc.push( id );
				} else if ( item.diemdanh.status == 'UNEXCUSED' || item.diemdanh.status == 'EXCUSED' ) {
					diemdanh_ids_nghihoc.push( id );
				}
			} );
			const requests = this.dataTable.data().filter(
				( item ) =>
					item.isUpdate ||
					( item.diemdanh.status == 'PRESENT' && !item.diemdanh.id )
			).map( ( item_submit ) => {
				const diemdanhOld              = this.listDiemDanhBoTro.find( ( item1 ) => item1.hocsinh_id == item_submit.hocsinh_id );
				const info : Partial<DiemDanh> = {
					class_session_id        : this.class_session_value().id ,
					donvi_id                : this.donviId ,
					csdt_id                 : this.classObject().csdt_id ?? 0 ,
					phuhuynh_id             : item_submit.hocsinh.phuhuynh_id ,
					class_id                : diemdanhOld.class_id ,
					hocsinh_id              : item_submit.hocsinh.id ,
					reason                  : item_submit.diemdanh?.reason ?? '' ,
					status                  : item_submit.diemdanh.status ,
					class_session_id_parent : this.class_session_value().parent_id ,
					course_id               : this.class_session_value().course_id ,
					parent_id               : diemdanhOld.id
				};
				if ( !item_submit.diemdanh.id ) {
					return this.diemdanhService.create( info );
				} else {
					return this.diemdanhService.update(
						item_submit.diemdanh.id ,
						info
					);
				}
			} );

			forkJoin( requests.length ? requests : [ of( null ) ] ).pipe(
				switchMap( () =>
					this.classSessionservice.update( this.class_session_value().id , {
						diem_danh_ids        : diemdanh_ids_dihoc ,
						diem_danh_ids_absent : diemdanh_ids_nghihoc
					} )
				)
			).subscribe( {
				next  : async () => {
					await this.updateActivities();
					this.state.set( 'loading' );
					await this.loadData();
					let _value : ClassSessionRelative =
							Helper.cloneObject(
								this.class_session_value() ?? null
							);
					_value                            = {
						... _value ,
						diem_danh_ids        : diemdanh_ids_dihoc ,
						diem_danh_ids_absent : diemdanh_ids_nghihoc
					};
					this.class_session_value.set( _value );
					this.notification.toastSuccess( 'Cập nhật thành công' , 'Thông báo' );
				} ,
				error : () => {
					this.state.set( 'success' );
					this.notification.toastError( 'Cập nhật không thành công' , 'Thông báo' );
				}
			} );

		} else {
			this.updateActivities();
		}
	}

	confirmUpdateStatus() : void {
		void this._handleConfirm();
	}


	confirm( data : ConfirmDialogData ) : Observable<ButtonBase> {
		const dialogRef : MatDialogRef<ConfirmComponent> = this.dialog.open( ConfirmComponent , {
			data ,
			disableClose : true ,
			panelClass   : 'ictu-app-notification'
		} );
		return dialogRef.afterClosed();
	}

	private async _handleConfirm() : Promise<void> {
		const confirm : string = await firstValueFrom( this.confirm( this.dataConfirm ) ).then( ( u : ButtonBase ) : string => ( u.name ) );
		if ( confirm === 'yes' ) {
			if ( this.class_session_value().parent_id == 0 ) {
				this.submitDiemDanhAll();
			} else {
				this.submitDiemDanhBoTroAll();
			}
			;
		}
	}

	setTTDiemDanh() : void {
		const tam : ClassActivityParams = {
			dihoc   :
				this.dataTable.data().filter( ( item ) => item.diemdanh.status === 'PRESENT' ).map( ( item ) => item.hocsinh.id ) ?? [] ,
			nghihoc :
				this.dataTable.data().filter(
					( item ) =>
						item.diemdanh.status === 'UNEXCUSED' ||
						item.diemdanh.status === 'EXCUSED'
				).map( ( item ) => item.hocsinh.id ) ?? [] ,
			dimuon  :
				this.dataTable.data().filter( ( item ) => item.diemdanh.status === 'LATE' ).map( ( item ) => item.hocsinh.id ) ?? []
		};
		this.TTDiemDanh.set( tam );
	}


	ngOnDestroy() : void {
		this.onDestroy$.next( 'OnDestroy' );
		this.onDestroy$.complete();
	}
}
