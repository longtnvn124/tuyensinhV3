import { ComponentFixture, TestBed } from '@angular/core/testing';

import QtDoiTacTuyenSinhComponent from './qt-doi-tac-tuyen-sinh.component';

describe('QtDoiTacTuyenSinhComponent', () => {
  let component: QtDoiTacTuyenSinhComponent;
  let fixture: ComponentFixture<QtDoiTacTuyenSinhComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtDoiTacTuyenSinhComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtDoiTacTuyenSinhComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
