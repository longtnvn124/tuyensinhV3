import { Component , computed , inject , model , ModelSignal , OnDestroy , OnInit , Signal , signal , WritableSignal } from '@angular/core';
import { BankChildComponent } from "@module/ictu-bank/childrent/bank/bank.component";
import { Bank } from "@models/bank";
import { debounceTime , distinctUntilChanged , map , merge , Observable , of , Subject , switchMap , takeUntil , tap } from "rxjs";
import { FormControl , FormGroup , Validators } from "@angular/forms";
import { AppState } from "@models/app-state";
import { takeUntilDestroyed , toObservable } from "@angular/core/rxjs-interop";
import { BankPartsService } from "@services/bank-parts.service";
import { BankPart , BankPartBaseInfo } from "@models/bank-part";
import { BankQuestionsService } from "@services/bank-questions.service";
import { Question , QuestionAnswerOption , QuestionDifficultyLevel , QuestionType } from "@models/question";
import { DtoObject , IctuConditionParam , IctuQueryCondition , IctuQueryParams } from "@models/dto";
import { AuthenticationService } from "@services/authentication.service";
import { filter } from "rxjs/operators";
import { IctuDropdownOptionElement } from "@models/ictu-dropdown-option";
import { FormGroupType } from "@models/common";
import { NotificationService } from "@services/notification.service";
import { BUTTON_NO , BUTTON_YES , ButtonBase } from "@models/button";
import { joinSources } from "@utilities/join-sources";

interface BankPartChild extends BankPartBaseInfo {
	_temp : string;
	onSaving : boolean;
	dirty : boolean;
}

interface BankPartParent extends BankPartBaseInfo {
	children : BankPartChild[];
	editingName : boolean;
	updatingChild : boolean;
}

type QuestionDifficultyLevelOption = QuestionDifficultyLevel | 'all';

type BankQuestionSectionTabName = 'LIST' | 'FORM_CREATE' | 'FORM_UPDATE';

interface BankQuestionSectionTab {
	tabName : BankQuestionSectionTabName,
	data : Question
}

export type QuestionFormFields = Pick<Question , 'donvi_id' | 'bank_id' | 'bank_part_id' | 'type' | 'content' | 'group_id' | 'difficulty' | 'ordering' | 'answer_options' | 'shuffle' | 'columns' | 'correct_answer' | 'temporary' | 'hint' | 'explanation'>

export type QuestionForm = FormGroupType<QuestionFormFields>;

type QuestionTypeOption = IctuDropdownOptionElement<QuestionType>

type BankQuestionDialogState = 'OPEN_HINT_EDITOR' | 'OPEN_EXPLAIN_EDITOR' | 'CLOSED';

type BankQuestionFormEventName = 'CANCEL' | 'SUBMIT' | 'PREVIEW';

interface BankQuestionFormEventData {
	name : BankQuestionFormEventName,
	formGroup : QuestionForm,
}

interface BankQuestionFormValidatorResult {
	valid : boolean,
	error : string,
}

type BankQuestionFormValidationResult = BankQuestionFormEventData & BankQuestionFormValidatorResult;

type BankQuestionFormValidator = ( formGroup : QuestionForm ) => Observable<BankQuestionFormValidatorResult>;

type BankQuestionFormValidateWorker = ( formGroup : QuestionForm ) => BankQuestionFormValidatorResult;

const BANK_QUESTIONS_FORM_VALIDATE_WORKERS : Record<Question["type"] , BankQuestionFormValidateWorker> = {
	radio              : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		let valid : BankQuestionFormValidatorResult["valid"] = false;
		let error : BankQuestionFormValidatorResult["error"] = '';
		if ( ! formGroup.value.answer_options || ! formGroup.value.answer_options.length ) {
			return {
				valid : false ,
				error : 'Câu hỏi không có phương án trả lời.'
			}
		}
		return {
			valid : false ,
			error : 'Phương án trả lời không được để trống.'
		}
	} ,
	check_box          : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	drag_drop          : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	fill_in_blank      : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	group_input        : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	group_logical      : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	input_box          : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	matching           : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	paragraph_ordering : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	reorder_words      : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	} ,
	textarea           : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
		return {
			valid : false ,
			error : 'Validator not available yet.'
		}
	}
}

const BANK_QUESTIONS_FORM_VALIDATORS : BankQuestionFormValidator = ( formGroup : QuestionForm ) : Observable<BankQuestionFormValidatorResult> => {
	return of( BANK_QUESTIONS_FORM_VALIDATE_WORKERS[ formGroup.value.type ]( formGroup ) );
}

@Component( {
	selector    : 'bank-questions' ,
	standalone  : false ,
	templateUrl : './bank-questions.component.html' ,
	styleUrl    : './bank-questions.component.css'
} )
export class BankQuestionsComponent implements OnInit , OnDestroy , BankChildComponent {

	private notification : NotificationService = inject( NotificationService );

	private auth : AuthenticationService = inject( AuthenticationService );

	private bankPartsService : BankPartsService = inject( BankPartsService );

	private bankQuestionsService : BankQuestionsService = inject( BankQuestionsService );

	bank : ModelSignal<Bank> = model.required<Bank>();

	dirty : ModelSignal<boolean> = model.required<boolean>();

	protected readonly Validators : typeof Validators = Validators;

	private destroyed$ : Subject<void> = new Subject<void>();

	protected state : WritableSignal<AppState> = signal( 'loading' );

	protected readonly bankPartParent : WritableSignal<BankPartParent[]> = signal( [] );

	protected readonly bankPartActive : WritableSignal<BankPartChild> = signal( null );

	private addNewSectionObserver : Subject<void> = new Subject<void>();

	private updateChildObserver : Subject<BankPartParent> = new Subject<BankPartParent>();

	private loadQuestionsObserver : Subject<void> = new Subject<void>();

	private formEventNameObserver : Subject<BankQuestionFormEventData> = new Subject<BankQuestionFormEventData>();

	private bankQuestionFormValidator : Record<BankQuestionFormEventName , BankQuestionFormValidator> = {
		CANCEL  : ( formGroup : QuestionForm ) : Observable<BankQuestionFormValidatorResult> => {
			return formGroup.touched ? this.notification.confirm( {
				heading : 'XÁC NHẬN HÀNH ĐỘNG' ,
				message : '<p class="m-b-5 f-roboto f-15 lh-base text-primary text-justify wid-430 mw-100">Bạn đang thoát khỏi form nhập liệu mà chưa lưu lại dữ liệu. <br>Việc làm này có thể khiến những thay đổi mà bạn vừa thực hiện không được lưu lại.</p><p class="m-b-20 f-roboto f-15 lh-base text-primary text-justify mw-100">Bạn có chắc chắn muốn thoát không?</p>' ,
				buttons : [ BUTTON_NO , BUTTON_YES ]
			} ).pipe(
				map( ( btn : ButtonBase ) : BankQuestionFormValidatorResult => ( { valid : btn.name === BUTTON_YES.name , error : '' } ) )
			) : of( { valid : true , error : '' } );
		} ,
		PREVIEW : ( formGroup : QuestionForm ) : Observable<BankQuestionFormValidatorResult> => {
			return BANK_QUESTIONS_FORM_VALIDATORS( formGroup );
		} ,
		SUBMIT  : ( formGroup : QuestionForm ) : Observable<BankQuestionFormValidatorResult> => {
			return BANK_QUESTIONS_FORM_VALIDATORS( formGroup );
		}
	}

	private bankQuestionFormEventHandler : Record<BankQuestionFormEventName , ( formGroup : QuestionForm ) => void> = {
		CANCEL  : ( formGroup : QuestionForm ) : void => {
			this.formLoading.set( false );
			this.changeQuestionSectionTabValue( 'LIST' , null );
		} ,
		PREVIEW : () : void => {
			this.formLoading.set( false );
		} ,
		SUBMIT  : ( formGroup : QuestionForm ) : void => {
			this.formLoading.set( false );
			console.log( formGroup.value );
		}
	}

	protected readonly enableNewSectionButtonLoading : WritableSignal<boolean> = signal( false );

	private bankID : Signal<number> = computed( () : number => this.bank()?.id ?? 0 );

	get donViID () : number {
		return this.auth.user.donvi_id;
	}

	readonly questions : WritableSignal<Question[]> = signal( [] );

	readonly questionSectionState : WritableSignal<AppState> = signal( 'loading' );

	readonly difficultyLevels : Signal<IctuDropdownOptionElement<QuestionDifficultyLevelOption>[]> = signal<IctuDropdownOptionElement<QuestionDifficultyLevelOption>[]>( [
		{ value : "all" , label : 'Tất cả' } ,
		{ value : "easy" , label : 'Dễ' } ,
		{ value : "medium" , label : 'Trung bình' } ,
		{ value : "hard" , label : 'Khó' }
	] );

	readonly difficultyLevelOptions : Signal<IctuDropdownOptionElement<QuestionDifficultyLevelOption>[]> = computed( () : IctuDropdownOptionElement<QuestionDifficultyLevelOption>[] => this.difficultyLevels().filter( ( option : IctuDropdownOptionElement<QuestionDifficultyLevelOption> ) : boolean => [ 'easy' , 'medium' , 'hard' ].includes( option.value ) ) );

	readonly questionTypeOptions : Signal<QuestionTypeOption[]> = signal<QuestionTypeOption[]>( [
		{ value : "radio" , label : '' , disabled : false } ,
		{ value : "check_box" , label : '' , disabled : false } ,
		{ value : "drag_drop" , label : '' , disabled : false } ,
		{ value : "input_box" , label : '' , disabled : false } ,
		{ value : "matching" , label : '' , disabled : false } ,
		// { value : "group_input" , label : '' , disabled : true } ,
		// { value : "group_logical" , label : '' , disabled : true } ,
		{ value : "reorder_words" , label : '' , disabled : false } ,
		{ value : "paragraph_ordering" , label : '' , disabled : true } ,
		{ value : "textarea" , label : '' , disabled : false } ,
		{ value : "fill_in_blank" , label : '' , disabled : true }
	] );

	readonly filterQuestionByDifficultyLevelValue : WritableSignal<QuestionDifficultyLevelOption> = signal<QuestionDifficultyLevelOption>( 'all' );

	readonly filterQuestionByDifficultyLevel : Signal<IctuDropdownOptionElement<QuestionDifficultyLevelOption>> = computed( () : IctuDropdownOptionElement<QuestionDifficultyLevelOption> => this.difficultyLevels().find( ( _item : IctuDropdownOptionElement<QuestionDifficultyLevelOption> ) : boolean => _item.value === this.filterQuestionByDifficultyLevelValue() ) );

	readonly filterQuestionByName : WritableSignal<string> = signal( '' );

	readonly questionSectionTab : WritableSignal<BankQuestionSectionTab> = signal<BankQuestionSectionTab>( {
		tabName : 'LIST' ,
		data    : null
	} );

	readonly questionSectionTabName : Signal<BankQuestionSectionTabName> = computed( () : BankQuestionSectionTabName => this.questionSectionTab().tabName );

	readonly formGroup : QuestionForm = new FormGroup( {
		donvi_id       : new FormControl<number>( 0 , [ Validators.required ] ) ,
		bank_id        : new FormControl<number>( 0 , [ Validators.required ] ) ,
		bank_part_id   : new FormControl<number>( 0 , [ Validators.required ] ) ,
		type           : new FormControl<QuestionType>( 'radio' , [ Validators.required ] ) ,
		content        : new FormControl<string>( '' , [ Validators.required ] ) ,
		group_id       : new FormControl<number>( 0 ) ,
		difficulty     : new FormControl<QuestionDifficultyLevel>( 'easy' , [ Validators.required ] ) ,
		ordering       : new FormControl<number>( 0 ) ,
		answer_options : new FormControl<QuestionAnswerOption[]>( [] ) ,
		shuffle        : new FormControl<number>( 0 ) ,
		columns        : new FormControl<number>( 1 ) ,
		correct_answer : new FormControl<string>( '' ) ,
		temporary      : new FormControl<string>( '' ) ,
		hint           : new FormControl<string>( '' ) ,
		explanation    : new FormControl<string>( '' )
	} );

	readonly answersDisplayOptions : Signal<IctuDropdownOptionElement<number>[]> = signal<IctuDropdownOptionElement<number>[]>( [
		{ value : 1 , label : '1 phương án / dòng' , disabled : false } ,
		{ value : 2 , label : '2 phương án / dòng' , disabled : false } ,
		{ value : 3 , label : '3 phương án / dòng' , disabled : false } ,
		{ value : 4 , label : '4 phương án / dòng' , disabled : false }
	] );

	protected visibleDialog : boolean = false; // dialog for add/edit hint and explain

	protected readonly dialogContentType : WritableSignal<BankQuestionDialogState> = signal<BankQuestionDialogState>( 'CLOSED' );

	protected readonly dialogHeading : Signal<string> = computed( () : string => this.dialogContentType() === 'OPEN_HINT_EDITOR' ? 'Nội dung gợi ý' : 'Nội dung bài giải' );

	protected dialogControl : FormControl<string> = this.getControl( 'hint' );

	protected readonly formLoading : WritableSignal<boolean> = signal<boolean>( false );

	constructor () {
		this.addNewSectionObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( () : void => {
			this.addNewSection();
		} );

		this.updateChildObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 )
		).subscribe( ( node : BankPartParent ) : void => {
			this.addNewChildToBankPartParent( node );
		} );

		toObservable( this.bankPartActive ).pipe(
			takeUntilDestroyed() ,
			filter( Boolean )
		).subscribe( () : void => {
			this.loadQuestionsFromSelectedBankPart();
		} );

		toObservable( this.filterQuestionByName ).pipe(
			takeUntilDestroyed()
		).subscribe( ( s : string ) : void => {
			console.log( s );
		} );

		toObservable( this.questionSectionTab ).pipe(
			takeUntilDestroyed() ,
			distinctUntilChanged( ( ob1 : BankQuestionSectionTab , ob2 : BankQuestionSectionTab ) : boolean => ob1.tabName === ob2.tabName ) ,
			debounceTime( 100 )
		).subscribe( ( { tabName , data } : BankQuestionSectionTab ) : void => {
			switch ( tabName ) {
				case 'FORM_CREATE' :
					this.formGroup.reset( {
						donvi_id       : this.donViID ,
						bank_id        : this.bankID() ,
						bank_part_id   : this.bankPartActive().id ,
						type           : 'radio' ,
						content        : '<p>Nội dung câu hỏi chương 3</p>' ,
						group_id       : 0 ,
						difficulty     : 'easy' ,
						ordering       : 0 ,
						answer_options : [
							{ value : '1' , label : '' } ,
							{ value : '2' , label : '' } ,
							{ value : '3' , label : '' } ,
							{ value : '4' , label : '' }
						] ,
						shuffle        : 0 ,
						columns        : 1 ,
						correct_answer : '' ,
						temporary      : '' ,
						hint           : '' ,
						explanation    : ''
					} );
					break;
				case "FORM_UPDATE":
					this.formGroup.reset( {
						donvi_id       : data.donvi_id ,
						bank_id        : data.bank_id ,
						bank_part_id   : data.bank_part_id ,
						type           : data.type ,
						content        : data.content ,
						group_id       : data.group_id ,
						difficulty     : data.difficulty ,
						ordering       : data.ordering ,
						answer_options : data.answer_options ,
						shuffle        : data.shuffle ,
						columns        : data.columns ,
						correct_answer : data.correct_answer ,
						temporary      : data.temporary ,
						hint           : data.hint ,
						explanation    : data.explanation
					} );
					break;
				default:
					break;
			}
		} );

		toObservable( this.dialogContentType ).pipe(
			takeUntilDestroyed()
		).subscribe( ( type : BankQuestionDialogState ) : void => {
			switch ( type ) {
				case "OPEN_HINT_EDITOR":
					this.dialogControl = this.getControl( 'hint' );
					this.visibleDialog = true;
					break;
				case "OPEN_EXPLAIN_EDITOR":
					this.dialogControl = this.getControl( 'explanation' );
					this.visibleDialog = true;
					break;
				default:
					this.visibleDialog = false;
					break;
			}
		} );

		this.formEventNameObserver.asObservable().pipe(
			takeUntilDestroyed() ,
			debounceTime( 500 ) ,
			switchMap( ( { name , formGroup } : BankQuestionFormEventData ) : Observable<BankQuestionFormValidationResult> => {
				return joinSources<{
					info : BankQuestionFormEventData,
					validator : BankQuestionFormValidatorResult
				}>( {
					info      : of( { name , formGroup } ) ,
					validator : this.bankQuestionFormValidator[ name ]( formGroup )
				} ).pipe(
					map( ( { info , validator } : {
						info : BankQuestionFormEventData,
						validator : BankQuestionFormValidatorResult
					} ) : BankQuestionFormValidationResult => ( { ... info , ... validator } ) )
				)
			} ) ,
			tap( ( { valid , error } : BankQuestionFormValidationResult ) : void => {
				if ( ! valid ) {
					this.formLoading.set( false );
					if ( error ) {
						this.notification.toastError( error );
					}
				}
			} ) ,
			filter( ( { valid } : BankQuestionFormValidationResult ) : boolean => valid )
		).subscribe( ( { name , formGroup } : BankQuestionFormValidationResult ) : void => {
			this.formLoading.set( false );
			this.bankQuestionFormEventHandler[ name ]( formGroup );
		} );
	}

	ngOnInit () : void {
		this.loadData();
	}

	private loadData () : void {
		this.state.set( 'loading' );
		// forkJoin<{
		// 	bankParts : Observable<BankPart[]>,
		// 	questions : Observable<Question[]>
		// }>( {
		// 	bankParts : this.loadBankParts( this.bankID() ) ,
		// 	questions : this.loadBankQuestions( this.bankID() )
		// } )

		this.loadBankParts( this.bankID() ).pipe(
			map( ( bankParts : BankPart[] ) : BankPartParent[] => {
				return bankParts.filter( ( bankPart : BankPart ) : boolean => bankPart.parent_id === 0 ).map( ( bankPart : BankPart ) : BankPartParent => {
					const children : BankPartChild[] = bankParts.filter( ( _b : BankPart ) : boolean => _b.parent_id === bankPart.id ).map( ( _bp : BankPart ) : BankPartChild => ( { ... _bp , _temp : _bp.name , onSaving : false , dirty : false } ) )
					return { ... bankPart , editingName : false , updatingChild : false , children }
				} );
			} ) ,
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( data : BankPartParent[] ) : void => {
				this.bankPartParent.set( data );
				this.state.set( 'success' );
			} ,
			error : () : void => {
				this.bankPartParent.set( [] );
				this.state.set( 'error' );
			}
		} )
	}

	private loadBankParts ( bankID : number ) : Observable<BankPart[]> {
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'bank_id' ,
			condition     : IctuQueryCondition.equal ,
			value         : bankID.toString()
		} ];
		const queryParams : IctuQueryParams     = {
			paged : 1 ,
			limit : -1
		};
		return this.bankPartsService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<BankPart[]> ) : BankPart[] => response.data )
		)
	}

	private loadBankQuestions ( bankID : number ) : Observable<Question[]> {
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'bank_id' ,
			condition     : IctuQueryCondition.equal ,
			value         : bankID.toString()
		} ];
		const queryParams : IctuQueryParams     = {
			paged : 1 ,
			limit : -1
		};
		return this.bankQuestionsService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Question[]> ) : Question[] => response.data )
		)
	}

	private loadQuestionsFromSelectedBankPart () : void {
		this.loadQuestionsObserver.next();
		this.questionSectionState.set( 'loading' );
		const conditions : IctuConditionParam[] = [ {
			conditionName : 'bank_part_id' ,
			condition     : IctuQueryCondition.equal ,
			value         : this.bankPartActive().id.toString( 10 )
		} ];
		const queryParams : IctuQueryParams     = {
			paged : 1 ,
			limit : -1
		};
		this.bankQuestionsService.query( conditions , queryParams ).pipe(
			map( ( response : DtoObject<Question[]> ) : Question[] => response.data ) ,
			takeUntil(
				merge( this.destroyed$ , this.loadQuestionsObserver )
			)
		).subscribe( {
			next  : ( data : Question[] ) : void => {
				this.questions.set( data );
				this.questionSectionState.set( 'success' );
			} ,
			error : () : void => {
				this.questionSectionState.set( 'error' );
			}
		} );
	}

	protected reloadQuestionsFromSelectedBankPart ( event : MouseEvent ) : void {
		if ( event ) {
			event.preventDefault();
			event.stopPropagation();
		}
		this.loadQuestionsFromSelectedBankPart();
	}

	protected reload ( event : MouseEvent ) : void {
		if ( event ) {
			event.preventDefault();
			event.stopPropagation();
		}
		this.loadData();
	}

	protected btnAddNewSection () : void {
		this.enableNewSectionButtonLoading.set( true );
		this.addNewSectionObserver.next();
	}

	private addNewSection () : void {
		const maxOrdering : number                       = this.bankPartParent().length ? ( 1 + Math.max( 0 , ... this.bankPartParent().map( ( _bank : BankPartParent ) : number => _bank.ordering ) ) ) : 1;
		const newSection : Omit<BankPartBaseInfo , 'id'> = {
			name      : [ 'Chương' , maxOrdering.toString( 10 ) ].join( ' ' ) ,
			donvi_id  : this.donViID ,
			bank_id   : this.bankID() ,
			parent_id : 0 ,
			ordering  : maxOrdering
		}
		this.bankPartsService.create( newSection ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( id : number ) : void => {
				this.bankPartParent.update( ( currentList : BankPartParent[] ) : BankPartParent[] => {
					return [ ... currentList , { id , editingName : false , updatingChild : false , ... newSection , children : [] } ];
				} );
				this.enableNewSectionButtonLoading.set( false );
			} ,
			error : () : void => {
				this.enableNewSectionButtonLoading.set( false );
			}
		} )
	}

	protected btnEnableEditingMode ( item : BankPartParent ) : void {
		item.editingName = true;
		setTimeout( () : void => {
			const inputElement : HTMLInputElement = document.getElementById( '--elm-bnk-' + item.id ) as HTMLInputElement;
			inputElement.focus();
			inputElement.select();
		} , 100 );
	}

	protected evtUpdateTitle ( item : BankPartParent ) : void {
		item.editingName = false;
	}

	protected btnAddChildSection ( bankPart : BankPartParent ) : void {
		bankPart.updatingChild = true;
		this.updateChildObserver.next( bankPart );
	}

	private addNewChildToBankPartParent ( bankPart : BankPartParent ) : void {
		const parentID : number           = bankPart.id;
		const maxOrdering : number        = bankPart.children.reduce( ( reducer : number , elm : BankPartChild ) : number => Math.max( reducer , elm.ordering ) , 0 );
		const newItem : Partial<BankPart> = {
			donvi_id  : this.donViID ,
			bank_id   : this.bankID() ,
			parent_id : parentID ,
			name      : [ 'Bài' , ( 1 + maxOrdering ) ].join( ' ' ) ,
			ordering  : 1 + maxOrdering
		};
		this.bankPartsService.create( newItem ).pipe(
			takeUntil( this.destroyed$ )
		).subscribe( {
			next  : ( id : number ) : void => {
				this.bankPartParent.update( ( bankPartParents : BankPartParent[] ) : BankPartParent[] => {
					return [ ... bankPartParents ].map( ( _node : BankPartParent ) : BankPartParent => {
						if ( _node.id === parentID ) {
							const newBankPartChild : BankPartChild = {
								... newItem ,
								id ,
								onSaving : false
							} as BankPartChild;
							_node.children.push( newBankPartChild )
							_node.updatingChild = false;
						}
						return _node;
					} )
				} );
			} ,
			error : () : void => {
				this.bankPartParent.update( ( bankPartParents : BankPartParent[] ) : BankPartParent[] => {
					return [ ... bankPartParents ].map( ( _node : BankPartParent ) : BankPartParent => {
						if ( _node.id === parentID ) {
							_node.updatingChild = false;
						}
						return _node;
					} )
				} );
			}
		} )
	}

	protected btnActiveBankPart ( bankPart : BankPartChild ) : void {
		bankPart._temp    = bankPart.name;
		bankPart.onSaving = false;
		bankPart.dirty    = false;
		this.bankPartActive.set( bankPart );
	}

	protected triggerBankPartChanges ( bankPartChild : BankPartChild ) : void {
		bankPartChild.dirty = true;
	}

	protected changeFilterDifficultyLevel ( level : QuestionDifficultyLevelOption ) : void {
		this.filterQuestionByDifficultyLevelValue.set( level );
	}

	protected changeQuestionSectionTabValue ( tabName : BankQuestionSectionTabName , data : Question ) : void {
		this.questionSectionTab.set( { tabName , data } );
	}

	protected getControl<K extends keyof QuestionFormFields> ( key : K ) : FormControl<QuestionFormFields[K]> {
		return this.formGroup.get( key as string ) as FormControl<QuestionFormFields[K]>;
	}

	protected changeBankQuestionDialogState ( state : BankQuestionDialogState ) : void {
		this.dialogContentType.set( state );
	}

	protected btnFormAction ( event : BankQuestionFormEventName ) : void {
		this.formLoading.set( true );
		this.formEventNameObserver.next( { name : event , formGroup : this.formGroup } );
	}

	ngOnDestroy () : void {
		this.destroyed$.next();
		this.destroyed$.complete();
	}
}
