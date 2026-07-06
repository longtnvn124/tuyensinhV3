import { ComponentFixture, TestBed } from '@angular/core/testing';

import QtLinhVucDaoTaoComponent from './qt-linh-vuc-dao-tao.component';

describe('QtLinhVucDaoTaoComponent', () => {
  let component: QtLinhVucDaoTaoComponent;
  let fixture: ComponentFixture<QtLinhVucDaoTaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtLinhVucDaoTaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtLinhVucDaoTaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
