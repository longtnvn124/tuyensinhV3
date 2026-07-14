import { Component , inject , OnDestroy , OnInit , Signal , signal , viewChild , WritableSignal } from '@angular/core';
import { IctuBasePermission , IctuPermissionControl } from "@models/ictu-base-model";
import { IctuDropdownOption } from "@models/ictu-dropdown-option";
import { NganhhocSearchInfo , NganhhocService } from "@services/tuyensinh/nganhhoc.service";
import { AuthenticationService } from "@services/authentication.service";
import { NotificationService } from "@services/notification.service";
import { AppState } from "@models/app-state";
import { AbstractControl , FormBuilder , FormsModule , ReactiveFormsModule , Validators } from "@angular/forms";
import { Drawer } from "primeng/drawer";
import { IctuFormControl2 } from "@models/ictu-form-control";
import { Nganhhoc } from "@app/models/tuyensinh/nganhhoc";
import { DataTableEvent , DataTableEventName , IctuDataTable , IctuDataTablePaginatorInfo } from '@models/datatable';
import { map , Observable , Subject , switchMap , takeUntil } from "rxjs";
import { filter } from "rxjs/operators";
import { IctuDeletingAnimationControl } from "@models/ictu-deleting-animation-control";
import { DtoObject } from "@models/dto";
import { IctuPaginatorComponent } from "@theme/components/ictu-paginator/ictu-paginator.component";
import { InputText } from "primeng/inputtext";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { MatButton } from "@angular/material/button";
import { MatCheckbox } from "@angular/material/checkbox";
import { Select } from "primeng/select";
import { Textarea } from "primeng/textarea";
import { ChuongtrinhDaotaoComponent } from "./chuongtrinh-daotao/chuongtrinh-daotao.component";
import { IctuPaginatorControl } from '@app/theme/components/ictu-paginator/ictu-paginator-control';

@Component( {
    selector    : 'app-nganh-hoc' ,
    imports     : [ ChuongtrinhDaotaoComponent , Drawer , IctuPaginatorComponent , InputText , LoadingProgressComponent , MatButton , MatCheckbox , ReactiveFormsModule , Select , Textarea , FormsModule ] ,
    templateUrl : './nganh-hoc.component.html' ,
    styleUrl   : './nganh-hoc.component.css' ,
    standalone : true
} )
export class NganhhocComponent implements OnInit , OnDestroy , IctuBasePermission {

    // ── Detail drawer ──

    detailDrawerVisible : boolean = false;
    detailDrawerHeader  : WritableSignal<string> = signal( 'Chương trình đào tạo' );

    optionList : IctuDropdownOption<number>[] = [
        { value : 0 , label : 'Dừng hoạt động' } ,
        { value : 1 , label : 'Đang hoạt động' }
    ];

    // ── Master: Nganhhoc ──

    private nganhHocService : NganhhocService = inject( NganhhocService );
    masterSearchInfo        : NganhhocSearchInfo          = { search : '' };
    masterDataTable         : IctuDataTable<Nganhhoc>     = new IctuDataTable<Nganhhoc>();
    masterFormControl       : IctuFormControl2<Nganhhoc>;
    readonly masterDrawer   = viewChild<Drawer>( 'masterDrawer' );
    masterEventObserver$    : Subject<DataTableEvent<Nganhhoc>> = new Subject<DataTableEvent<Nganhhoc>>();
    masterHandelEvent!      : Record<DataTableEventName , ( data? : Nganhhoc | Nganhhoc[] ) => void>;
    masterState             : WritableSignal<'loading' | 'success' | 'error'> = signal<'loading' | 'success' | 'error'>( 'success' );
    private masterTemp      : IctuDataTablePaginatorInfo = { paged : 1 , resetPaginator : true };

    // ── Selected major (passed to child) ──

    selectedMajor : WritableSignal<Nganhhoc | null> = signal<Nganhhoc | null>( null );

    // ── Shared ──

    private auth            : AuthenticationService = inject( AuthenticationService );
    private notification    : NotificationService = inject( NotificationService );
    private fb              : FormBuilder = inject( FormBuilder );
    private onDestroy$      : Subject<string> = new Subject<string>();

    permissionControl : Signal<IctuPermissionControl> = signal<IctuPermissionControl>( new IctuPermissionControl( this.auth.getUserPermission( 'nganh-chuongtrinh' ) ) );
    paginatorControl : Signal<IctuPaginatorControl> = signal<IctuPaginatorControl>( new IctuPaginatorControl( {
		pageLinkSize      : 5 ,
		rows              : 20 ,
		showFirstLastIcon : true
	} ) );


    constructor () {
        // Master form
        this.masterFormControl = new IctuFormControl2<Nganhhoc>( {
            dropdownFields : [] ,
            formGroup      : this.fb.group( {
                name        : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
                code        : [ '' , [ Validators.required , Validators.minLength( 2 ) , Validators.maxLength( 255 ) ] ] ,
                description : [ '' ] ,
                is_active   : [ 1 ]
            } ) ,
            objectName : 'ngành học' ,
            drawer     : this.masterDrawer
        } );

        // Master event handlers
        this.masterHandelEvent = {
            OPEN_FORM_ADD        : () : void => {
                this.masterFormControl.formGroup.reset( {
                    name        : '' ,
                    code        : '' ,
                    description : '' ,
                    is_active   : 1
                } );
                this.masterFormControl.openFormAdd();
            } ,
            OPEN_FORM_UPDATE     : ( data : Nganhhoc ) : void => {
                this.masterFormControl.formGroup.reset( {
                    name        : data.name ,
                    code        : data.code ,
                    description : data.description || '' ,
                    is_active   : data.is_active ? 1 : 0
                } );
                this.masterFormControl.openFormEdit( data );
            } ,
            DELETE_SINGLE_ROW    : ( { id } : Nganhhoc ) : void => {
                this.requestMasterDeletingData( [ id ] );
            } ,
            DELETE_SELECTED_ROWS : () : void => {
                const ids : number[] = this.masterDataTable.getSelectedData().map( ( { id } : Nganhhoc ) : number => id );
                if ( ids.length ) {
                    this.requestMasterDeletingData( ids );
                }
            } ,
            SUBMIT_FORM          : () : void => {
                if ( this.masterFormControl.canSubmit ) {
                    const info : Partial<Nganhhoc> = {
                        name        : this.masterFormField( 'name' ).value ,
                        code        : this.masterFormField( 'code' ).value ,
                        description : this.masterFormField( 'description' ).value ,
                        is_active   : this.masterFormField( 'is_active' ).value === 1
                    }
                    const request : Observable<any> = this.masterFormControl.isFormAdd ? this.nganhHocService.create( info ) : this.nganhHocService.update( this.masterFormControl.object.id , info )
                    const message : string          = this.masterFormControl.isFormAdd ? 'Thêm ngành học thành công' : 'Cập nhật ngành học thành công';
                    this.masterFormControl.submit( request ).subscribe( {
                        next  : () : void => {
                            this.notification.toastSuccess( message , 'Thông báo' );
                            if ( this.masterFormControl.isFormAdd ) {
                                this.masterFormControl.formGroup.reset( {
                                    name        : '' ,
                                    code        : '' ,
                                    description : '' ,
                                    is_active   : 1
                                } );
                            }
                            else {
                                this.masterFormControl.closeForm();
                            }
                            this.loadMasterData( 1 , true );
                        } ,
                        error : () : void => {
                            this.notification.toastError( message , 'Thông báo' );
                        }
                    } )
                }
            }
        }

        this.masterEventObserver$.asObservable().pipe(
            takeUntil( this.onDestroy$ )
        ).subscribe( ( { name , data } : DataTableEvent<Nganhhoc> ) : void => this.masterHandelEvent[ name ]( data ) );
    }

    private masterFormField ( path : keyof Nganhhoc ) : AbstractControl {
        return this.masterFormControl.formGroup.get( path );
    }

    ngOnInit () : void {
        this.loadMasterData( 1 , true );
    }

    // ════════════════════════════════════════════════════════════
    //  Master: Nganhhoc
    // ════════════════════════════════════════════════════════════

    loadMasterData ( paged : number = 1 , resetPaginator : boolean = true ) : void {
        this.masterState.set( 'loading' );
        this.masterTemp = { paged , resetPaginator };
        this.nganhHocService.load( this.masterSearchInfo , { limit : this.paginatorControl().rows() , paged } ).pipe(
            map( ( res : DtoObject<Nganhhoc[]> ) : Nganhhoc[] => {
                if ( resetPaginator ) {
                    return this.paginatorControl().setupPaginator( res )
                }
                else {
                    this.paginatorControl().changePage( paged );
                    return res.data;
                }
            } )
        ).subscribe( {
            next  : ( data : Nganhhoc[] ) : void => {
                this.masterDataTable.fillData( data );
                this.masterState.set( 'success' );
            } ,
            error : () : void => {
                this.masterState.set( 'error' )
            }
        } )
    }

    private requestMasterDeletingData ( ids : number[] ) : void {
        this.notification.confirmDelete( ids.length ).pipe(
            filter( ( confirm : boolean ) : boolean => confirm ) ,
            map( () : IctuDeletingAnimationControl<Nganhhoc> => new IctuDeletingAnimationControl( ids , this.nganhHocService ) ) ,
            switchMap( ( deleteController : IctuDeletingAnimationControl<Nganhhoc> ) : Observable<boolean> => {
                deleteController.run();
                return this.notification.startDeleting( deleteController.progress );
            } )
        ).subscribe( {
            next  : ( success : boolean ) : void => {
                if ( success ) {
                    this.notification.toastSuccess( 'Xóa ngành học thành công' );
                }
                this.loadMasterData( 1 , true );
            } ,
            error : () : void => {
                this.notification.toastError( 'Xóa ngành học thất bại' );
            }
        } );
    }

    onSearchMajor () : void {
        this.loadMasterData( 1 , true );
    }

    onMasterChangePage ( paged : number ) : void {
        this.loadMasterData( paged , false );
    }

    onMasterDrawerHide () : void {
        if ( this.masterFormControl.submitted ) {
            this.loadMasterData( 1 , true );
        }
    }

    addMajor () : void {
        this.masterEventObserver$.next( { name : 'OPEN_FORM_ADD' , data : null } );
    }

    editMajor ( data : Nganhhoc ) : void {
        this.masterEventObserver$.next( { name : 'OPEN_FORM_UPDATE' , data } );
    }

    deleteMajor ( data : Nganhhoc ) : void {
        this.masterEventObserver$.next( { name : 'DELETE_SINGLE_ROW' , data } );
    }

    deleteSelectedMajors () : void {
        this.masterEventObserver$.next( { name : 'DELETE_SELECTED_ROWS' , data : null } );
    }

    submitMasterForm () : void {
        this.masterEventObserver$.next( { name : 'SUBMIT_FORM' , data : null } );
    }

    reloadMaster ( event : MouseEvent ) : void {
        event.preventDefault();
        event.stopPropagation();
        this.loadMasterData( this.masterTemp.paged , this.masterTemp.resetPaginator );
    }

    // ════════════════════════════════════════════════════════════
    //  Selection: selected major → child component
    // ════════════════════════════════════════════════════════════

    showCTDT ( item : Nganhhoc ) : void {
        this.selectedMajor.set( item );
        this.detailDrawerHeader = signal( `Chương trình đào tạo — ${ item.name }` );
        this.detailDrawerVisible = true;
    }

    onDetailDrawerHide () : void {
        this.selectedMajor.set( null );
    }

    ngOnDestroy () : void {
        this.onDestroy$.next( 'OnDestroy' );
        this.onDestroy$.complete();
    }
}
