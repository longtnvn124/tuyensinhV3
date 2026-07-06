import { ComponentFixture, TestBed } from '@angular/core/testing';

import QtHopDongLaoDongComponent from './qt-hop-dong-lao-dong.component';

describe('QtHopDongLaoDongComponent', () => {
  let component: QtHopDongLaoDongComponent;
  let fixture: ComponentFixture<QtHopDongLaoDongComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QtHopDongLaoDongComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QtHopDongLaoDongComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
