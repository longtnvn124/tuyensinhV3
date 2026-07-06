import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtHocSinhComponent } from './qt-hoc-sinh.component';

describe('QtHocSinhComponent', () => {
  let component: QtHocSinhComponent;
  let fixture: ComponentFixture<QtHocSinhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtHocSinhComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtHocSinhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
