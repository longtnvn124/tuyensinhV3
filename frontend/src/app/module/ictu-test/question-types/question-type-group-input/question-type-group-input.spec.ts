import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeGroupInput } from './question-type-group-input';

describe('QuestionTypeGroupInput', () => {
  let component: QuestionTypeGroupInput;
  let fixture: ComponentFixture<QuestionTypeGroupInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeGroupInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeGroupInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
