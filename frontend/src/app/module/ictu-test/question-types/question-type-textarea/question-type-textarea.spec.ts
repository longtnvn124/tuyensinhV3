import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeTextarea } from './question-type-textarea';

describe('QuestionTypeTextarea', () => {
  let component: QuestionTypeTextarea;
  let fixture: ComponentFixture<QuestionTypeTextarea>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeTextarea]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeTextarea);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
