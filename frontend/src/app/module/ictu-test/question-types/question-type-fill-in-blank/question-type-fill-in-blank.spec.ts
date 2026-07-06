import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeFillInBlank } from './question-type-fill-in-blank';

describe('QuestionTypeFillInBlank', () => {
  let component: QuestionTypeFillInBlank;
  let fixture: ComponentFixture<QuestionTypeFillInBlank>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeFillInBlank]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeFillInBlank);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
