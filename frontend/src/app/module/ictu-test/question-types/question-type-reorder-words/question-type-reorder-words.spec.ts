import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuestionTypeReorderWords } from './question-type-reorder-words';

describe('QuestionTypeReorderWords', () => {
  let component: QuestionTypeReorderWords;
  let fixture: ComponentFixture<QuestionTypeReorderWords>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionTypeReorderWords]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuestionTypeReorderWords);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
