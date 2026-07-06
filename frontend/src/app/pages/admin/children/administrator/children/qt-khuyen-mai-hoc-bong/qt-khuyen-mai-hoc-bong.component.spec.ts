import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtKhuyenMaiHocBongComponent } from './qt-khuyen-mai-hoc-bong.component';

describe('QtKhuyenMaiHocBongComponent', () => {
  let component: QtKhuyenMaiHocBongComponent;
  let fixture: ComponentFixture<QtKhuyenMaiHocBongComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtKhuyenMaiHocBongComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtKhuyenMaiHocBongComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
