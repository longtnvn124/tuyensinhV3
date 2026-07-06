import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeMatching } from './question-type-matching';

describe('QuestionTypeMatching', () => {
  let component: QuestionTypeMatching;
  let fixture: ComponentFixture<QuestionTypeMatching>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeMatching]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeMatching);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
