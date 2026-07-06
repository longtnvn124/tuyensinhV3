import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BankComponent } from './childrent/bank/bank.component';
import { BankFormComponent } from './childrent/bank-form/bank-form.component';
import { BankQuestionsComponent } from '@module/ictu-bank/childrent/bank-questions/bank-questions.component';
import { MatButton } from '@angular/material/button';
import { LoadingProgressComponent } from '@theme/components/loading-progress/loading-progress.component';
import { SharedModule } from '@shared/shared.module';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { CollapsePanelComponent } from '@theme/components/collapse-panel.component';
import { Tooltip } from 'primeng/tooltip';
import { InputBankQuestionTypeCheckBoxComponent } from './childrent/question-types/input-bank-question-type-check-box/input-bank-question-type-check-box.component';
import { InputBankQuestionTypeDragDropComponent } from './childrent/question-types/input-bank-question-type-drag-drop/input-bank-question-type-drag-drop.component';
import { InputBankQuestionTypeFilInBlankComponent } from './childrent/question-types/input-bank-question-type-fil-in-blank/input-bank-question-type-fil-in-blank.component';
import { InputBankQuestionTypeGroupInputComponent } from './childrent/question-types/input-bank-question-type-group-input/input-bank-question-type-group-input.component';
import { InputBankQuestionTypeGroupLogicalComponent } from './childrent/question-types/input-bank-question-type-group-logical/input-bank-question-type-group-logical.component';
import { InputBankQuestionTypeInputBoxComponent } from './childrent/question-types/input-bank-question-type-input-box/input-bank-question-type-input-box.component';
import { InputBankQuestionTypeMatchingComponent } from './childrent/question-types/input-bank-question-type-matching/input-bank-question-type-matching.component';
import { InputBankQuestionTypeParagraphOrderingComponent } from './childrent/question-types/input-bank-question-type-paragraph-ordering/input-bank-question-type-paragraph-ordering.component';
import { InputBankQuestionTypeRadioComponent } from './childrent/question-types/input-bank-question-type-radio/input-bank-question-type-radio.component';
import { InputBankQuestionTypeReorderWordsComponent } from './childrent/question-types/input-bank-question-type-reorder-words/input-bank-question-type-reorder-words.component';
import { InputBankQuestionTypeTextareaComponent } from './childrent/question-types/input-bank-question-type-textarea/input-bank-question-type-textarea.component';
import { IctuEditorComponent } from '@theme/components/ictu-editor/ictu-editor.component';
import { Checkbox } from 'primeng/checkbox';
import { IctuAnswerOptionTagPipe } from '@module/ictu-bank/pipes/ictu-answer-option-tag.pipe';
import { QuestionTypeToNamePipe } from './pipes/question-type-to-name.pipe';
import { QuestionTypeToLabelPipe } from './pipes/question-type-to-label.pipe';
import { Dialog } from 'primeng/dialog';
import { BankQuestionEditorComponent } from './childrent/bank-question-editor/bank-question-editor.component';


@NgModule( {
    declarations : [
        BankComponent ,
        BankFormComponent ,
        BankQuestionsComponent ,
        QuestionTypeToLabelPipe ,
        QuestionTypeToNamePipe ,
        BankQuestionEditorComponent ,
        InputBankQuestionTypeCheckBoxComponent ,
        InputBankQuestionTypeDragDropComponent ,
        InputBankQuestionTypeFilInBlankComponent ,
        InputBankQuestionTypeGroupInputComponent ,
        InputBankQuestionTypeGroupLogicalComponent ,
        InputBankQuestionTypeInputBoxComponent ,
        InputBankQuestionTypeMatchingComponent ,
        InputBankQuestionTypeParagraphOrderingComponent ,
        InputBankQuestionTypeRadioComponent ,
        InputBankQuestionTypeReorderWordsComponent ,
        InputBankQuestionTypeTextareaComponent
    ] ,
    imports      : [
        CommonModule ,
        MatButton ,
        LoadingProgressComponent ,
        SharedModule ,
        InputText ,
        Textarea ,
        Select ,
        CollapsePanelComponent ,
        Tooltip ,
        IctuEditorComponent ,
        Checkbox ,
        IctuAnswerOptionTagPipe ,
        Dialog
    ] ,
    exports : [
        BankComponent ,
        BankQuestionEditorComponent
    ]
} )
export class IctuBankModule {}
