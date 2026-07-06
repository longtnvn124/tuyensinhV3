import { Component , computed , inject , InputSignal , model , OnDestroy , signal , Signal , WritableSignal } from '@angular/core';
import { FormControl , FormGroup , Validators } from '@angular/forms';
import { Question , QuestionAnswerOption , QuestionDifficultyLevel , QuestionType } from '@models/question';
import { FormGroupType } from '@models/common';
import { IctuDropdownOptionElement } from '@models/ictu-dropdown-option';
import { NotificationService } from '@services/notification.service';
import { AuthenticationService } from '@services/authentication.service';
import { debounceTime , map , Observable , of , Subject , switchMap , tap } from 'rxjs';
import { BankQuestionsService } from '@services/bank-questions.service';
import { takeUntilDestroyed , toObservable } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { joinSources } from '@utilities/join-sources';
import { BUTTON_NO , BUTTON_YES , ButtonBase } from '@models/button';

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

const BANK_QUESTIONS_FORM_VALIDATE_WORKERS : Record<Question['type'] , BankQuestionFormValidateWorker> = {
    radio              : ( formGroup : QuestionForm ) : BankQuestionFormValidatorResult => {
        let valid : BankQuestionFormValidatorResult['valid'] = false;
        let error : BankQuestionFormValidatorResult['error'] = '';
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
    selector    : 'app-bank-question-editor' ,
    standalone  : false ,
    templateUrl : './bank-question-editor.component.html' ,
    styleUrl    : './bank-question-editor.component.css'
} )
export class BankQuestionEditorComponent implements OnDestroy {

    /************ INPUTS **********************/

    question : InputSignal<Question> = model<Question>();

    /************ INPUTS **********************/

    private notification : NotificationService = inject( NotificationService );

    private auth : AuthenticationService = inject( AuthenticationService );

    private bankQuestionsService : BankQuestionsService = inject( BankQuestionsService );

    protected readonly Validators : typeof Validators = Validators;

    readonly questionTypeOptions : Signal<QuestionTypeOption[]> = signal<QuestionTypeOption[]>( [
        { value : 'radio' , label : '' , disabled : false } ,
        { value : 'check_box' , label : '' , disabled : false } ,
        { value : 'drag_drop' , label : '' , disabled : false } ,
        { value : 'input_box' , label : '' , disabled : false } ,
        { value : 'matching' , label : '' , disabled : false } ,
        // { value : "group_input" , label : '' , disabled : true } ,
        // { value : "group_logical" , label : '' , disabled : true } ,
        { value : 'reorder_words' , label : '' , disabled : false } ,
        { value : 'paragraph_ordering' , label : '' , disabled : true } ,
        { value : 'textarea' , label : '' , disabled : false } ,
        { value : 'fill_in_blank' , label : '' , disabled : true }
    ] );

    private destroyed$ : Subject<void> = new Subject();

    get donViID () : number {
        return this.auth.user.donvi_id;
    }

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

    readonly difficultyLevelOptions : Signal<IctuDropdownOptionElement<QuestionDifficultyLevel>[]> = signal<IctuDropdownOptionElement<QuestionDifficultyLevel>[]>( [
        { value : 'easy' , label : 'Dễ' } ,
        { value : 'medium' , label : 'Trung bình' } ,
        { value : 'hard' , label : 'Khó' }
    ] );

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
        } ,
        PREVIEW : () : void => {
            this.formLoading.set( false );
        } ,
        SUBMIT  : ( formGroup : QuestionForm ) : void => {
            this.formLoading.set( false );
            console.log( formGroup.value );
        }
    }

    constructor () {
        toObservable( this.dialogContentType ).pipe(
            takeUntilDestroyed()
        ).subscribe( ( type : BankQuestionDialogState ) : void => {
            switch ( type ) {
                case 'OPEN_HINT_EDITOR':
                    this.dialogControl = this.getControl( 'hint' );
                    this.visibleDialog = true;
                    break;
                case 'OPEN_EXPLAIN_EDITOR':
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
