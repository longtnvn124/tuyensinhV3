import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeParagraphOrdering } from './question-type-paragraph-ordering';

describe('QuestionTypeParagraphOrdering', () => {
  let component: QuestionTypeParagraphOrdering;
  let fixture: ComponentFixture<QuestionTypeParagraphOrdering>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeParagraphOrdering]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeParagraphOrdering);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
