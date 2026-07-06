import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanCccd } from './scan-cccd';

describe('ScanCccd', () => {
  let component: ScanCccd;
  let fixture: ComponentFixture<ScanCccd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanCccd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScanCccd);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
