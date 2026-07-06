import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeInputBox } from './question-type-input-box';

describe('QuestionTypeInputBox', () => {
  let component: QuestionTypeInputBox;
  let fixture: ComponentFixture<QuestionTypeInputBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeInputBox]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeInputBox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
