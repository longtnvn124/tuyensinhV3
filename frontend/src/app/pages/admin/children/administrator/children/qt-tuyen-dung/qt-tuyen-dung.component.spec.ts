import { ComponentFixture, TestBed } from '@angular/core/testing';

import QtTuyenDungComponent from './qt-tuyen-dung.component';

describe('QtTuyenDungComponent', () => {
  let component: QtTuyenDungComponent;
  let fixture: ComponentFixture<QtTuyenDungComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtTuyenDungComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtTuyenDungComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
