import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtGiaoVienComponent } from './qt-giao-vien.component';

describe('QtGiaoVienComponent', () => {
  let component: QtGiaoVienComponent;
  let fixture: ComponentFixture<QtGiaoVienComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtGiaoVienComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtGiaoVienComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
