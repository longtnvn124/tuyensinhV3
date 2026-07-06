import { Component , computed , input , InputSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { EmployeeExtend , EmployeeExtendEvent , EmployeeExtendEventName } from "@pages/admin/children/general-management/children/gm-employees/gm-employees.component";
import { LoadingProgressComponent } from "@theme/components/loading-progress/loading-progress.component";
import { AppState } from "@models/app-state";
import { Subject , takeUntil } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import { ACADEMIC_DEGREE_OPTIONS , ACADEMIC_RANK_OPTIONS , AcademicDegree , AcademicRank , Employee , EMPLOYEE_CONTRACT_STATUS_OPTIONS , EMPLOYEE_LANGUAGE_OPTIONS , EmployeeContractStatus , Gender , SystemLanguageName } from "@models/employee";
import { FormGroupType } from "@models/common";
import { FormControl , FormGroup , Validators } from "@angular/forms";
import { IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { NgClass } from "@angular/common";
import { MatButton } from "@angular/material/button";
import { DragAndDropDirective } from "@theme/directives/drag-and-drop.directive";
import { _10MB } from "@utilities/syscats";

type EmployeeProfileFieldName = Pick<Employee , 'photo' | 'user_id' | 'email' | 'phone' | 'name' | 'full_name' | 'code' | 'donvi_id' | 'csdt_id' | 'gender' | 'dob' | 'academic_degree' | 'academic_rank' | 'linhvuc_id' | 'workplace' | 'workplace_position' | 'nationality' | 'language' | 'province_id' | 'ward_id' | 'street' | 'contract_status' | 'status'>

type EmployeeProfileFormGroup = FormGroupType<EmployeeProfileFieldName>;

type GmEmployeesFormPanel = 'form' | 'import';

type EmployeeImportPanelLayout = 'input' | 'table';

type EmployeeImportDataState = 'validating' | 'valid' | 'invalid' | 'uploading' | 'success' | 'error';

interface EmployeeImportData {
	data : Partial<Employee>;
	_uploadState : EmployeeImportDataState;
	_error : string;
}

interface EmployeeImportDataReport {
	total : number,
	valid : number,
	invalid : number,
	uploaded : number,
	error : number,
}

@Component( {
	selector    : 'app-gm-employees-form' ,
	imports     : [ LoadingProgressComponent , NgClass , MatButton , DragAndDropDirective ] ,
	templateUrl : './gm-employees-form.component.html' ,
	styleUrl    : './gm-employees-form.component.css' ,
	host        : {
		class : 'd-flex align-items-stretch justify-content-start w-100 h-100'
	}
} )
export class GmEmployeesFormComponent implements OnInit , OnDestroy {

	formEvent : InputSignal<EmployeeExtendEvent> = input.required<EmployeeExtendEvent>();

	protected readonly state : WritableSignal<AppState> = signal<AppState>( 'loading' );

	protected readonly name : Signal<EmployeeExtendEventName> = computed( () : EmployeeExtendEventName => this.formEvent()?.name ?? null );

	protected readonly employee : Signal<EmployeeExtend> = computed( () : EmployeeExtend => this.formEvent()?.data ?? null );

	private destroy$ : Subject<void> = new Subject<void>();

	protected readonly formGroup : EmployeeProfileFormGroup = new FormGroup( {
		photo              : new FormControl<string>( '' ) ,
		user_id            : new FormControl<number>( 0 ) ,
		name               : new FormControl<string>( '' ) ,
		full_name          : new FormControl<string>( '' , [ Validators.required , Validators.minLength( 3 ) , Validators.maxLength( 200 ) ] ) ,
		academic_degree    : new FormControl<AcademicDegree>( '' ) ,
		academic_rank      : new FormControl<AcademicRank>( '' ) ,
		code               : new FormControl<string>( { value : '' , disabled : true } ) ,
		contract_status    : new FormControl<EmployeeContractStatus>( { value : '' , disabled : true } ) ,
		csdt_id            : new FormControl<number>( 0 ) ,
		dob                : new FormControl<string>( '' , [ Validators.required ] ) ,
		donvi_id           : new FormControl<number>( 0 ) ,
		email              : new FormControl<string>( '' , [ Validators.required , Validators.email ] ) ,
		gender             : new FormControl<Gender>( 'KHAC' , [ Validators.required ] ) ,
		linhvuc_id         : new FormControl<number>( 0 ) ,
		language           : new FormControl<SystemLanguageName>( 'vi' ) ,
		nationality        : new FormControl<string>( '' ) ,
		phone              : new FormControl<string>( '' , [ Validators.required ] ) ,
		province_id        : new FormControl<number>( 0 ) ,
		status             : new FormControl<number>( 0 ) ,
		street             : new FormControl<string>( '' ) ,
		ward_id            : new FormControl<number>( 0 ) ,
		workplace          : new FormControl<string>( '' ) ,
		workplace_position : new FormControl<string>( '' )
	} );

	protected readonly ACADEMIC_RANK_OPTIONS : IctuDropdownOptionElement<AcademicRank>[] = ACADEMIC_RANK_OPTIONS;

	protected readonly EMPLOYEE_CONTRACT_STATUS_OPTIONS : IctuDropdownOptionElement<EmployeeContractStatus>[] = EMPLOYEE_CONTRACT_STATUS_OPTIONS;

	protected readonly ACADEMIC_DEGREE_OPTIONS : IctuDropdownOptionElement<AcademicDegree>[] = ACADEMIC_DEGREE_OPTIONS;

	protected readonly EMPLOYEE_LANGUAGE_OPTIONS : IctuDropdownOptionElement<SystemLanguageName>[] = EMPLOYEE_LANGUAGE_OPTIONS;

	protected readonly genderOptions : IctuDropdownOptionElement<Gender>[] = [
		{ value : 'NAM' , label : 'Nam' } ,
		{ value : 'NU' , label : 'Nữ' } ,
		{ value : 'KHAC' , label : 'Khác' }
	]

	private handleEvent : Record<EmployeeExtendEventName , ( data : EmployeeExtend ) => void> = {
		edit   : ( data : EmployeeExtend ) : void => {
			this.state.set( 'success' );
		} ,
		delete : () : void => {
		} ,
		add    : () : void => {
			this.state.set( 'success' );
		}
	}

	protected readonly panel : WritableSignal<GmEmployeesFormPanel> = signal<GmEmployeesFormPanel>( 'form' );

	protected readonly dataImported : WritableSignal<EmployeeImportData[]> = signal<EmployeeImportData[]>( [] );

	// protected readonly importPanelLayout : Signal<EmployeeImportPanelLayout> = computed( () : EmployeeImportPanelLayout => this.dataImported().length ? 'table' : 'input' );
	protected readonly importPanelLayout : Signal<EmployeeImportPanelLayout> = signal<EmployeeImportPanelLayout>( 'table' );

	protected readonly uploadReporter : Signal<EmployeeImportDataReport> = computed( () : EmployeeImportDataReport => {
		return this.dataImported().reduce( ( reducer : EmployeeImportDataReport , row : EmployeeImportData ) : EmployeeImportDataReport => {
			if ( [ 'valid' , "invalid" , 'success' , 'error' ].includes( row._uploadState ) ) {
				switch ( row._uploadState ) {
					case 'valid' :
						reducer.valid += 1;
						break;
					case "invalid":
						reducer.invalid += 1;
						break;
					case 'success' :
						reducer.uploaded += 1;
						break;
					case 'error' :
						reducer.error += 1;
						break;
				}
			}
			return reducer;
		} , { total : this.dataImported().length , invalid : 0 , valid : 0 , uploaded : 0 , error : 0 } );
	} );

	protected progress : Signal<number> = computed( () : number => this.uploadReporter().total ? Math.floor( this.uploadReporter().uploaded / this.uploadReporter().total ) : 0 );

	protected enableUploading : WritableSignal<boolean> = signal<boolean>( false );

	constructor () {
		toObservable<EmployeeExtendEvent>( this.formEvent ).pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( { name , data } : EmployeeExtendEvent ) : void => {
			this.handleEvent[ name ]( data );
		} );

		toObservable<GmEmployeesFormPanel>( this.panel ).pipe(
			takeUntil( this.destroy$ )
		).subscribe( ( panel : GmEmployeesFormPanel ) : void => {
			if ( panel === 'form' ) {
				// this.importControl
			}
			else {

			}
			console.log( panel );
			console.log( this.formEvent().data );
		} );
	}

	protected getControl<K extends keyof EmployeeProfileFieldName> ( key : K ) : FormControl<EmployeeProfileFieldName[K]> {
		return this.formGroup.get( key as string ) as FormControl<EmployeeProfileFieldName[K]>;
	}

	ngOnInit () : void {

	}

	protected btnChangeMode ( panel : GmEmployeesFormPanel ) : void {
		this.panel.update( () : GmEmployeesFormPanel => this.formEvent().name === 'edit' ? 'form' : panel );
	}

	protected onFileDropped ( fileList : FileList ) : void {
		const validFile : File = Array.from( fileList ).find( ( file : File ) : boolean => file.name.endsWith( '.xlsx' ) && file.size < _10MB );
	}

	private readFile ( validFile : File ) : void {

	}

	ngOnDestroy () : void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}
