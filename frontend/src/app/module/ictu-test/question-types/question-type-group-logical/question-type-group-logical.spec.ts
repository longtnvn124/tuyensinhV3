import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeGroupLogical } from './question-type-group-logical';

describe('QuestionTypeGroupLogical', () => {
  let component: QuestionTypeGroupLogical;
  let fixture: ComponentFixture<QuestionTypeGroupLogical>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeGroupLogical]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeGroupLogical);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
