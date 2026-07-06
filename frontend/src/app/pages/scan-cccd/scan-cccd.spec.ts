import { ComponentFixture, TestBed } from '@angular/core/testing';

import ScanCccdLiveComponent from './scan-cccd.component';

describe('ScanCccdLiveComponent', () => {
  let component: ScanCccdLiveComponent;
  let fixture: ComponentFixture<ScanCccdLiveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanCccdLiveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScanCccdLiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
