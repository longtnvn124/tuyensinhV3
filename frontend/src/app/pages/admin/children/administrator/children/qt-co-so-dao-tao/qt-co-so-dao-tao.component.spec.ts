import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QtCoSoDaoTaoComponent } from './qt-co-so-dao-tao.component';

describe('QtCoSoDaoTaoComponent', () => {
  let component: QtCoSoDaoTaoComponent;
  let fixture: ComponentFixture<QtCoSoDaoTaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtCoSoDaoTaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtCoSoDaoTaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
