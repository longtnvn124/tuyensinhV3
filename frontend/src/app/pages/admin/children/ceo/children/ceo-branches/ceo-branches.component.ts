import { Component , inject , OnDestroy , OnInit , signal , Signal , viewChild , WritableSignal } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { IctuPaginatorComponent } from '@theme/components/ictu-paginator/ictu-paginator.component';
import { InputText } from 'primeng/inputtext';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { AbstractControl , FormArray , FormBuilder , FormGroup , ReactiveFormsModule , ValidationErrors , ValidatorFn , Validators } from '@angular/forms';
import { Select } from 'primeng/select';
import { SharedModule } from '@shared/shared.module';
import { Textarea } from 'primeng/textarea';
import { IctuBasePermission , IctuPermissionControl } from '@models/ictu-base-model';
import { IctuDropdownOption } from '@models/ictu-dropdown-option';
import { CoSoDaoTaoService } from '@services/co-so-dao-tao.service';
import { AuthenticationService } from '@services/authentication.service';
import { NotificationService } from '@services/notification.service';
import { IctuFileService } from '@services/ictu-file.service';
import { AppState } from '@models/app-state';
import { MatDialog , MatDialogRef } from '@angular/material/dialog';
import { IctuFormControl2 } from '@models/ictu-form-control';
import { BranchTimeSlot , CoSoDaoTao } from '@models/co-so-dao-tao';
import { DataTableEvent , DataTableEventName , IctuDataTable , IctuDataTablePaginatorInfo } from '@models/datatable';
import { Is } from '@utilities/is';
import { debounceTime , firstValueFrom , map , Observable , of , Subject , switchMap , takeUntil } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IctuDeletingAnimationControl } from '@models/ictu-deleting-animation-control';
import { DtoObject , IctuConditionParam , IctuQueryParams } from '@models/dto';
import { IctuImageResizeComponent , ImageResizerConfig , ImageResizerDto } from '@components/ictu-image-resize/ictu-image-resize.component';
import { ICTUStandardFile } from '@models/file';
import { IctuMediaLoaderDirective } from '@directives/ictu-media-loader.directive';
import { EmployeeControlComponent } from '@components/form-controls/employee-control/employee-control.component';
import { EmployeesService } from '@services/employees.service';
import { Employee } from '@models/employee';

function timeSlotValidator () : ValidatorFn {
    return ( control : AbstractControl ) : ValidationErrors | null => {
        const value : string = control.value;

        if ( ! value ) {
            return null; // No error if the value is empty
        }

        if ( /^\d{1,2}:\d{1,2}$/.test( value ) ) {
            const _num : string[]   = control.value.split( ':' );
            const _hours : number   = parseInt( _num[ 0 ] , 10 );
            const _minutes : number = parseInt( _num[ 1 ] , 10 );
            return _hours >= 0 && _hours <= 23 && _minutes >= 0 && _minutes <= 60 ? null : { invalidTime : true }
        }
        else {
            return { invalidTime : true };
        }
    };
}

type BranchManagerInfo = Pick<Employee , 'id' | 'full_name' | 'user_id'>;

interface Branch extends CoSoDaoTao {
    _managerInfo : BranchManagerInfo
}

@Component( {
    selector    : 'app-ceo-branches' ,
    imports     : [ Drawer , IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , ReactiveFormsModule , Select , SharedModule , Textarea , IctuMediaLoaderDirective , EmployeeControlComponent ] ,
    templateUrl : './ceo-branches.component.html' ,
    styleUrl    : './ceo-branches.component.css' ,
    standalone  : true
} )
export default class CeoBranchesComponent implements OnInit , OnDestroy , IctuBasePermission {

    optionList : IctuDropdownOption<number>[] = [
        { value : 0 , label : 'Không kích hoạt' } ,
        { value : 1 , label : 'Kích hoạt' }
    ];

    private service : CoSoDaoTaoService = inject<CoSoDaoTaoService>( CoSoDaoTaoService );

    private auth : AuthenticationService = inject<AuthenticationService>( AuthenticationService );

    private notification : NotificationService = inject<NotificationService>( NotificationService );

    private employeesService : EmployeesService = inject( EmployeesService );

    private fileService : IctuFileService = inject<IctuFileService>( IctuFileService );

    readonly donviId : Signal<number> = signal<number>( this.auth.user.donvi_id );

    // employeeDropdownField : IctuDropdownField = new IctuDropdownField( this.teachersService.loadEmployeeSelectOptions( this.donviId() , {
    // 	value : 0 ,
    // 	label : 'Chưa có người đại diện' ,
    // 	info  : null
    // } ) , 'Chọn người đại diện' );

    readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

    private fb : FormBuilder = inject( FormBuilder );

    readonly drawer : Signal<Drawer> = viewChild<Drawer>( 'pDrawer' );

    private dialog : MatDialog = inject( MatDialog );

    formControl : IctuFormControl2<CoSoDaoTao> = new IctuFormControl2<CoSoDaoTao>( {
        // dropdownFields : [ this.employeeDropdownField ] ,
        dropdownFields : [] ,
        formGroup      : this.fb.group( {
            ten            : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
            kyhieu         : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 20 ) ] ] ,
            address        : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
            hotline        : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 30 ) ] ] ,
            mota           : [ '' ] ,
            logo           : [ null ] ,
            params         : this.fb.group( {
                phone    : [ '' ] ,
                email    : [ '' ] ,
                website  : [ '' ] ,
                facebook : [ '' ] ,
                youtube  : [ '' ] ,
                tiktok   : [ '' ]
            } ) ,
            userid_manager : [ 0 ] ,
            donvi_id       : [ this.donviId() ] ,
            time_slots     : this.fb.array<BranchTimeSlot>( [] ) ,
            status         : [ 0 ]
        } ) ,
        objectName     : 'cơ sở đào tạo' ,
        drawer         : this.drawer
    } );

    private handelEvent : Record<DataTableEventName , ( data : CoSoDaoTao ) => void> = {
        OPEN_FORM_ADD        : () : void => {
            this.formControl.formGroup.reset( {
                ten            : '' ,
                kyhieu         : '' ,
                mota           : '' ,
                address        : '' ,
                hotline        : '' ,
                logo           : null ,
                params         : {
                    phone    : '' ,
                    email    : '' ,
                    website  : '' ,
                    facebook : '' ,
                    youtube  : '' ,
                    tiktok   : ''
                } ,
                userid_manager : 0 ,
                donvi_id       : this.donviId() ,
                time_slots     : [] ,
                status         : 0
            } );
            this.branchTimeSlots.clear();
            this.formControl.openFormAdd();
        } ,
        OPEN_FORM_UPDATE     : ( data : CoSoDaoTao ) : void => {
            this.formControl.formGroup.reset( {
                ten            : data.ten ,
                kyhieu         : data.kyhieu ,
                mota           : data.mota ,
                userid_manager : data.userid_manager ,
                donvi_id       : this.donviId() ,
                status         : data.status ,
                address        : data.address ,
                hotline        : data.hotline ,
                logo           : data.logo ? data.logo : null ,
                params         : {
                    phone    : data.params?.phone ?? '' ,
                    email    : data.params?.email ?? '' ,
                    website  : data.params?.website ?? '' ,
                    facebook : data.params?.facebook ?? '' ,
                    youtube  : data.params?.youtube ?? '' ,
                    tiktok   : data.params?.tiktok ?? ''
                }
            } );
            this.branchTimeSlots.clear();
            if ( data.time_slots && Is.array( data.time_slots ) ) {
                data.time_slots.forEach( ( node : BranchTimeSlot ) : void => this.branchTimeSlots.push( this.createClassTimeNodeGroup( node ) ) );
            }
            this.formControl.openFormEdit( data );
        } ,
        DELETE_SINGLE_ROW    : ( { id } : CoSoDaoTao ) : void => {
            this.requestDeletingData( [ id ] );
        } ,
        DELETE_SELECTED_ROWS : () : void => {
            const ids : number[] = this.branchesTable.getSelectedData().map( ( { id } : CoSoDaoTao ) : number => id );
            if ( ids.length ) {
                this.requestDeletingData( ids );
            }
        } ,
        SUBMIT_FORM          : () : void => {
            if ( this.formControl.canSubmit ) {
                const info : Partial<CoSoDaoTao> = JSON.parse( JSON.stringify( {
                    ten            : this.formField( 'ten' ).value ,
                    kyhieu         : this.formField( 'kyhieu' ).value.toUpperCase() ,
                    mota           : this.formField( 'mota' ).value ,
                    userid_manager : this.formField( 'userid_manager' ).value ,
                    donvi_id       : this.formField( 'donvi_id' ).value ,
                    status         : this.formField( 'status' ).value ,
                    time_slots     : this.formField( 'time_slots' ).value ,
                    logo           : this.formField( 'logo' ).value ?? null ,
                    address        : this.formField( 'address' ).value ?? '' ,
                    hotline        : this.formField( 'hotline' ).value ?? '' ,
                    params         : this.formField( 'params' ).value ?? null
                } ) );

                if ( info.time_slots && info.time_slots.length ) {
                    info.time_slots = Is.array( info.time_slots ) && info.time_slots.length ? [ ... info.time_slots ].map( ( slot : BranchTimeSlot , index : number ) : BranchTimeSlot => {
                        return { ... slot , order : ( 1 + index ) };
                    } ) : [];
                }

                const request : Observable<any> = this.formControl.isFormAdd ? this.service.create( info ) : this.service.update( this.formControl.object.id , info )
                const message : string          = this.formControl.isFormAdd ? 'Thêm mới thành công' : 'Cập nhật thành công';
                const messageError : string     = this.formControl.isFormAdd ? 'Thêm mới không thành công' : 'Cập nhật không thành công';
                this.formControl.submit( request ).subscribe( {
                    next  : () : void => {
                        this.notification.toastSuccess( message , 'Thông báo' );
                        if ( this.formControl.isFormAdd ) {
                            this.formControl.formGroup.reset( {
                                ten            : '' ,
                                kyhieu         : '' ,
                                mota           : '' ,
                                address        : '' ,
                                hotline        : '' ,
                                logo           : null ,
                                params         : {
                                    phone    : '' ,
                                    website  : '' ,
                                    facebook : '' ,
                                    youtube  : ''
                                } ,
                                userid_manager : 0 ,
                                donvi_id       : this.donviId() ,
                                time_slots     : [] ,
                                status         : 0
                            } );
                            this.branchTimeSlots.clear();
                        }
                        else {
                            this.formControl.closeForm();
                        }
                    } ,
                    error : () : void => {
                        this.notification.toastError( messageError , 'Thông báo' );
                    }
                } )
            }
        }
    }

    private eventObserver$ : Subject<DataTableEvent<CoSoDaoTao>> = new Subject<DataTableEvent<CoSoDaoTao>>();

    private destroy$ : Subject<void> = new Subject<void>();

    private addClassTimeSlotObserver : Subject<void> = new Subject<void>();

    private removeClassTimeSlotObserver : Subject<number> = new Subject<number>();

    private openFileChooserObserver : Subject<void> = new Subject<void>();

    private _temp : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

    _search : string = '';

    readonly branchesTable : IctuDataTable<Branch> = new IctuDataTable<Branch>();

    readonly permissionControl : Signal<IctuPermissionControl> = signal<IctuPermissionControl>( new IctuPermissionControl( this.auth.getUserPermission( 'ceo/branches' ) ) )

    get search () : string {
        return this._search;
    }

    get branchTimeSlots () : FormArray {
        return this.formField( 'time_slots' ) as FormArray;
    }

    constructor () {
        this.eventObserver$.asObservable().pipe(
            takeUntil( this.destroy$ )
        ).subscribe( ( { name , data } : DataTableEvent<CoSoDaoTao> ) : void => this.handelEvent[ name ]( data ) );

        this.addClassTimeSlotObserver.pipe(
            takeUntil( this.destroy$ ) ,
            debounceTime( 500 )
        ).subscribe( () : void => {
            this.addNewClassTimeSlot();
        } );

        this.removeClassTimeSlotObserver.pipe(
            takeUntil( this.destroy$ ) ,
            debounceTime( 500 )
        ).subscribe( ( index : number ) : void => {
            this.removeTimeSlot( index );
        } );

        this.openFileChooserObserver.pipe(
            takeUntil( this.destroy$ ) ,
            debounceTime( 250 )
        ).subscribe( () : void => {
            this.callFileChooser();
        } );
    }

    private formField ( control : keyof CoSoDaoTao ) : AbstractControl {
        return this.formControl.formGroup.get( control );
    }

    public get f () : AbstractControl<CoSoDaoTao> {
        return this.formControl.formGroup;
    }

    ngOnInit () : void {
        this.loadData( 1 , true );
    }

    private createClassTimeNodeGroup ( node? : BranchTimeSlot ) : FormGroup {
        return this.fb.group( {
            name  : [ node?.name ?? '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
            start : [ node?.start ?? '' , [ Validators.required , timeSlotValidator() ] ] ,
            end   : [ node?.end ?? '' , [ Validators.required , timeSlotValidator() ] ]
        } );
    }

    private requestDeletingData ( ids : number[] ) : void {
        this.notification.confirmDelete( ids.length ).pipe(
            filter( ( confirm : boolean ) : boolean => confirm ) ,
            map( () : IctuDeletingAnimationControl<CoSoDaoTao> => new IctuDeletingAnimationControl( ids , this.service ) ) ,
            switchMap( ( deleteController : IctuDeletingAnimationControl<CoSoDaoTao> ) : Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting( deleteController.progress );
            } )
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

    loadData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
        this.state.set( 'loading' );
        this._temp = { paged , resetPaginator };
        this.service.load( this.search , this.donviId() , {
            limit : this.branchesTable.paginator.rows() ,
            paged
        } ).pipe(
            switchMap( ( response : DtoObject<CoSoDaoTao[]> ) : Observable<DtoObject<Branch[]>> => this.loadBranchesManagers( response ) ) ,
            map( ( res : DtoObject<Branch[]> ) : Branch[] => {
                if ( resetPaginator ) {
                    return this.branchesTable.paginator.setupPaginator( res );
                }
                else {
                    this.branchesTable.paginator.changePage( paged );
                    return res.data;
                }
            } )
        ).subscribe( {
            next  : ( data : Branch[] ) : void => {
                this.branchesTable.fillData( data );
                this.state.set( 'success' );
            } ,
            error : () : void => {
                this.state.set( 'error' )
            }
        } )
    }

    private loadBranchesManagers ( response : DtoObject<CoSoDaoTao[]> ) : Observable<DtoObject<Branch[]>> {
        if ( response.data.length > 0 ) {
            const managerIds : number[] = response.data.filter( ( cs : CoSoDaoTao ) : boolean => !! cs.userid_manager ).map( ( cs : CoSoDaoTao ) : number => cs.userid_manager );
            if ( managerIds.length > 0 ) {
                const conditions : IctuConditionParam[] = [];
                const queryParams : IctuQueryParams     = {
                    limit  : -1 ,
                    paged  : 1 ,
                    select : 'id,full_name,user_id'
                };
                return this.employeesService.query( conditions , queryParams ).pipe(
                    map( ( { data } : DtoObject<Employee[]> ) : DtoObject<Branch[]> => ( {
                        ... response ,
                        data : response.data.map( ( cs : CoSoDaoTao ) : Branch => ( { ... cs , _managerInfo : !! cs.userid_manager ? data.reduce( ( reducer : BranchManagerInfo , employee : Employee ) : BranchManagerInfo => ( employee.user_id === cs.userid_manager ? employee : reducer ) , { id : 0 , user_id : 0 , full_name : 'Chưa có người phụ trách' } ) : { id : 0 , user_id : 0 , full_name : 'Chưa có người phụ trách' } } ) )
                    } ) )
                )
            }
            else {
                return of( {
                    ... response , data : response.data.map( ( cs : CoSoDaoTao ) : Branch => ( {
                        ... cs , _managerInfo : {
                            id        : 0 ,
                            user_id   : 0 ,
                            full_name : 'Chưa có người phụ trách'
                        }
                    } ) )
                } );
            }
        }
        else {
            return of( { ... response , data : [] } );
        }
    }

    deleteRow ( data : CoSoDaoTao ) : void {
        this.eventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
    }

    deleteSelectedRows () : void {
        this.eventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
    }

    editRow ( data : CoSoDaoTao ) : void {
        this.eventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
    }

    reload ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadData( this._temp.paged , this._temp.resetPaginator );
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

    onChangePage ( paged : number ) : void {
        this.loadData( paged , false );
    }

    onSearchData () : void {
        this.loadData( 1 , true );
    }

    btnAddNewClassTimeSlot () : void {
        this.addClassTimeSlotObserver.next();
    }

    btnRemoveNewClassTimeSlot ( index : number ) : void {
        this.removeClassTimeSlotObserver.next( index );
    }

    private addNewClassTimeSlot () : void {
        this.branchTimeSlots.push( this.createClassTimeNodeGroup() );
    }

    private removeTimeSlot ( index : number ) : void {
        this.branchTimeSlots.removeAt( index );
    }

    preventKeyDown ( event : Event ) : void {
        event.preventDefault();
        event.stopPropagation();
    }

    private callFileChooser () : void {
        const fileChooser : HTMLInputElement = Object.assign<HTMLInputElement , Pick<HTMLInputElement , 'type' | 'accept' | 'multiple'>>( document.createElement( 'input' ) , {
            type     : 'file' ,
            accept   : 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon' ,
            multiple : false
        } );

        fileChooser.onchange = () : void => {
            if ( fileChooser.files.length ) {
                void this.makeAvatar( fileChooser.files.item( 0 ) );
            }
            setTimeout( () : void => fileChooser.remove() , 1000 );
        };
        fileChooser.click();
    }

    private async makeAvatar ( file : File ) : Promise<any> {
        try {
            const data : Partial<ImageResizerConfig> = {
                resizeToWidth : 200 ,
                aspectRatio   : 1 ,
                format        : 'png' ,
                dataUrl       : URL.createObjectURL( file )
            };

            const dialogRef : MatDialogRef<IctuImageResizeComponent> = this.dialog.open( IctuImageResizeComponent , {
                data ,
                disableClose : true ,
                panelClass   : 'image-resizer-panel'
            } );

            const result : ImageResizerDto = await firstValueFrom( dialogRef.afterClosed() );
            if ( ! result.error ) {
                this.formControl.state.set( 'LOADING' );
                const fileName : string = `organization-logo-${ this.auth.user.donvi_id }-${ Date.now() }.png`
                const fileLogo : File   = this.auth.helper.blobToFile( result.data.blob , fileName );
                this.fileService.upload( fileLogo , { tag : 'organization-logo' , public : 1 } ).pipe(
                    takeUntil( this.destroy$ )
                ).subscribe( {
                    next  : ( { id , name , title , url , ext , type , size , location } : ICTUStandardFile ) : void => {
                        this.formField( 'logo' ).setValue( { id , name , title , url , ext , type , size , location } );
                        this.formField( 'logo' ).markAsTouched( { emitEvent : true } );
                        this.formControl.state.set( 'READY' );
                    } ,
                    error : () : void => {
                        this.formControl.state.set( 'READY' );
                        this.notification.toastError( 'Upload file thất bại' );
                    }
                } );
            }
        }
        catch ( e ) {
            console.log( e );
        }
    }

    btnUpdateOrganizationLogo () : void {
        this.openFileChooserObserver.next();
    }

    ngOnDestroy () : void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
