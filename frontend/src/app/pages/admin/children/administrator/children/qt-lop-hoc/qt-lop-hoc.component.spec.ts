import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtLopHocComponent } from './qt-lop-hoc.component';

describe('QtLopHocComponent', () => {
  let component: QtLopHocComponent;
  let fixture: ComponentFixture<QtLopHocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtLopHocComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtLopHocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
