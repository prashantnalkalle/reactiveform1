import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AppComponent } from './app.component';
describe('Admission form', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [ReactiveFormsModule, HttpClientTestingModule],
    }).compileComponents();
  });
  it('hides the method for cash and requires it for online and cheque', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[formControlName="paymentMethod"]'),
    ).toBeNull();
    app.form.controls.paymentMode.setValue('online');
    fixture.detectChanges();
    expect(app.form.controls.paymentMethod.hasError('required')).toBeTrue();
    app.form.controls.paymentMethod.setValue('PhonePe');
    app.form.controls.paymentMode.setValue('cash');
    expect(app.form.controls.paymentMethod.value).toBe('');
    expect(app.form.controls.paymentMethod.valid).toBeTrue();
    app.form.controls.paymentMode.setValue('cheque');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[formControlName="paymentMethod"]')
        .textContent,
    ).toContain('Cheque');
  });
  it('calculates totals and clears subjects when class changes', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.form.controls.class.setValue('Class 10');
    app.form.controls.subjects.setValue(['Mathematics', 'English']);
    app.form.controls.discount.setValue(300);
    app.form.controls.amount.setValue(1000);
    expect(app.total).toBe(4000);
    expect(app.pending).toBe(3000);
    app.form.controls.class.setValue('Class 11');
    expect(app.selectedSubjects).toEqual([]);
  });
  it('shows the saved receipt and keeps it unchanged when the form is edited', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.form.patchValue({
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@example.com',
      contact: '9876543210',
      gender: 'Female',
      year: '2026-27',
      class: 'Class 10',
    });
    app.form.controls.subjects.setValue(['Mathematics']);
    app.form.controls.amount.setValue(500);
    fixture.detectChanges();
    const fileInputs: HTMLInputElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="file"]'),
    );
    fileInputs.forEach((input, index) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['image'], `${index}.png`, { type: 'image/png' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
    });
    const preview = app.photoPreview;
    const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
    app.form.controls.paymentMode.setValue('online');
    app.form.controls.paymentMethod.setValue('PhonePe');
    app.submit();
    const http = TestBed.inject(HttpTestingController);
    expect(app.generatedReceipt).toBeUndefined();
    http.expectOne('/api/admissions').flush({
      id: 'test-reference',
      receipt: {
        number: 'test-reference',
        issuedAt: '2026-10-15T10:00:00Z',
        studentName: 'Test Student',
        email: 'test@example.com',
        contact: '9876543210',
        class: 'Class 10',
        year: '2026-27',
        items: [{ subject: 'Mathematics', amount: 2500 }],
        subtotal: 2500,
        discount: 0,
        total: 2500,
        paid: 500,
        pending: 2000,
        paymentDate: '2026-10-15',
        paymentMode: 'cash',
        paymentMethod: '',
        remarks: '',
      },
    });
    expect(app.form.controls.firstName.value).toBe('');
    expect(app.selectedSubjects).toEqual([]);
    expect(app.form.controls.amount.value).toBe(0);
    expect(app.form.controls.paymentMode.value).toBe('cash');
    expect(app.form.controls.paymentMethod.valid).toBeTrue();
    expect(app.form.pristine).toBeTrue();
    expect(app.form.untouched).toBeTrue();
    expect(app.photo).toBeUndefined();
    expect(app.receipt).toBeUndefined();
    expect(app.photoPreview).toBe('');
    expect(revoke).toHaveBeenCalledWith(preview);
    fileInputs.forEach((input) => expect(input.value).toBe(''));
    app.form.controls.amount.setValue(1000);
    fixture.detectChanges();
    expect(app.generatedReceipt?.paid).toBe(500);
    expect(
      fixture.nativeElement.querySelector('#fee-receipt').textContent,
    ).toContain('Test Student');
    expect(
      fixture.nativeElement.querySelector('#fee-receipt').textContent,
    ).toContain('Part payment');
    http.verify();
  });
  it('does not generate a receipt when saving fails', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.form.patchValue({
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@example.com',
      contact: '9876543210',
      gender: 'Female',
      year: '2026-27',
      class: 'Class 10',
    });
    app.form.controls.subjects.setValue(['Mathematics']);
    app.submit();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/admissions')
      .flush({}, { status: 500, statusText: 'Server error' });
    expect(app.generatedReceipt).toBeUndefined();
    expect(app.saving).toBeFalse();
    expect(app.form.controls.firstName.value).toBe('Test');
    expect(app.selectedSubjects).toEqual(['Mathematics']);
    http.verify();
  });
  it('shows backend validation errors instead of a connection error', () => {
    const app = TestBed.createComponent(AppComponent).componentInstance;
    app.form.patchValue({
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@example.com',
      contact: '9876543210',
      gender: 'Female',
      year: '2026-27',
      class: 'Class 10',
    });
    app.form.controls.subjects.setValue(['Mathematics']);
    app.submit();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/admissions')
      .flush(
        { error: 'Invalid payment details' },
        { status: 400, statusText: 'Bad Request' },
      );
    expect(app.message).toContain('Invalid payment details');
    expect(app.saving).toBeFalse();
    http.verify();
  });
});
