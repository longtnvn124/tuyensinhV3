import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtBacDaoTaoComponent } from './qt-bac-dao-tao.component';

describe('QtBacDaoTaoComponent', () => {
  let component: QtBacDaoTaoComponent;
  let fixture: ComponentFixture<QtBacDaoTaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtBacDaoTaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtBacDaoTaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
