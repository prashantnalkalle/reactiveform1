import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroupDirective, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { FeeReceipt } from './models/interface';

type FormSection = 'student' | 'academic' | 'fees';
type UploadType = 'photo' | 'receipt';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  @ViewChild(FormGroupDirective) private formDirective?: FormGroupDirective;
  @ViewChildren('fileInput') private fileInputs?: QueryList<ElementRef<HTMLInputElement>>;

  readonly years = ['2026-27', '2027-28', '2028-29'];
  readonly classes = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  readonly paymentMethods = [
    'PhonePe',
    'Google Pay',
    'Paytm',
    'BHIM',
    'Amazon Pay',
    'WhatsApp Pay',
    'Other UPI app',
    'Debit card',
    'Credit card',
    'Net banking',
    'NEFT',
    'RTGS',
    'IMPS',
  ];
  readonly subjectFees: Record<string, number> = {
    Mathematics: 2500,
    Science: 2500,
    English: 1800,
    'Social Science': 1800,
    Physics: 3000,
    Chemistry: 3000,
    Biology: 3000,
  };

  openSections: Record<FormSection, boolean> = {
    student: true,
    academic: true,
    fees: true,
  };
  photo?: File;
  receipt?: File;
  photoPreview = '';
  message = '';
  fileError = '';
  saving = false;
  showFeeBreakdown = false;
  generatedReceipt?: FeeReceipt;

  private readonly destroy$ = new Subject<void>();
  private readonly maxFileSize = 2 * 1024 * 1024;

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    contact: ['', [Validators.required, Validators.pattern('^[6-9][0-9]{9}$')]],
    gender: ['', Validators.required],
    year: ['', Validators.required],
    class: ['', Validators.required],
    subjects: [[] as string[], Validators.required],
    selfStudy: [false],
    discount: [0, [Validators.required, Validators.min(0)]],
    amount: [0, [Validators.required, Validators.min(0)]],
    paymentDate: [this.today()],
    paymentMode: ['cash'],
    paymentMethod: [''],
    remarks: ['', Validators.maxLength(1000)],
  });

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
  ) {
    this.form.controls.paymentMode.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((mode) => {
        const paymentMethod = this.form.controls.paymentMethod;
        paymentMethod.setValue('');
        paymentMethod.setValidators(
          mode === 'cash' ? [] : [Validators.required],
        );
        paymentMethod.updateValueAndValidity();
      });

    this.form.controls.class.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.form.controls.subjects.setValue([]));
  }

  get availableSubjects(): string[] {
    const selectedClass = this.form.controls.class.value;
    if (selectedClass === 'Class 11' || selectedClass === 'Class 12') {
      return ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'];
    }
    return ['Mathematics', 'Science', 'English', 'Social Science'];
  }

  get selectedSubjects(): string[] {
    return this.form.controls.subjects.value || [];
  }

  get subtotal(): number {
    return this.selectedSubjects.reduce(
      (sum, subject) => sum + this.subjectFees[subject],
      0,
    );
  }

  get total(): number {
    return Math.max(
      0,
      this.subtotal - Number(this.form.controls.discount.value),
    );
  }

  get paid(): number {
    return Number(this.form.controls.amount.value) || 0;
  }

  get pending(): number {
    return Math.max(0, this.total - this.paid);
  }

  private get apiUrl(): string {
    const config = (window as Window & { YPS_CONFIG?: { apiUrl: string } })
      .YPS_CONFIG;
    return config?.apiUrl || '/api';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.photoPreview) {
      URL.revokeObjectURL(this.photoPreview);
    }
  }

  isInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control && control.invalid && control.touched;
  }

  toggleSection(section: FormSection): void {
    this.openSections[section] = !this.openSections[section];
  }

  selectSubject(subject: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const subjects = this.form.controls.subjects;
    subjects.setValue(
      checked
        ? [...this.selectedSubjects, subject]
        : this.selectedSubjects.filter((item) => item !== subject),
    );
    subjects.markAsTouched();
  }

  uploadFile(event: Event, kind: UploadType): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (kind === 'receipt') {
      allowedTypes.push('application/pdf');
    }
    if (!allowedTypes.includes(file.type) || file.size > this.maxFileSize) {
      this.fileError = 'Choose a supported file smaller than 2 MB.';
      input.value = '';
      return;
    }

    this.fileError = '';
    if (kind === 'receipt') {
      this.receipt = file;
      return;
    }
    if (this.photoPreview) {
      URL.revokeObjectURL(this.photoPreview);
    }
    this.photo = file;
    this.photoPreview = URL.createObjectURL(file);
  }

  submit(): void {
    if (this.saving) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid || this.hasInvalidPayment()) {
      this.openSections = { student: true, academic: true, fees: true };
      this.message = 'Please check the required fields and fee amounts.';
      return;
    }

    this.saving = true;
    this.generatedReceipt = undefined;
    this.http
      .post<{ id: string; receipt: FeeReceipt }>(
        `${this.apiUrl}/admissions`,
        this.createFormData(),
      )
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: (result) => {
          this.resetForm();
          this.generatedReceipt = result.receipt;
          this.message = 'Admission saved. Your fee receipt is ready below.';
          setTimeout(() => {
            document
              .getElementById('fee-receipt')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        },
        error: (error: HttpErrorResponse) => {
          this.message = this.getSaveErrorMessage(error);
        },
      });
  }

  printReceipt(): void {
    window.print();
  }

  private resetForm(): void {
    const defaults = {
      firstName: '',
      lastName: '',
      email: '',
      contact: '',
      gender: '',
      year: '',
      class: '',
      subjects: [] as string[],
      selfStudy: false,
      discount: 0,
      amount: 0,
      paymentDate: this.today(),
      paymentMode: 'cash',
      paymentMethod: '',
      remarks: '',
    };
    if (this.formDirective) {
      this.formDirective.resetForm(defaults);
    } else {
      this.form.reset(defaults);
    }
    this.fileInputs?.forEach((input) => (input.nativeElement.value = ''));
    this.photo = undefined;
    this.receipt = undefined;
    if (this.photoPreview) {
      URL.revokeObjectURL(this.photoPreview);
    }
    this.photoPreview = '';
    this.fileError = '';
    this.showFeeBreakdown = false;
  }

  private today(): string {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }

  private hasInvalidPayment(): boolean {
    return (
      this.paid > this.total ||
      Number(this.form.controls.discount.value) > this.subtotal ||
      (this.paid > 0 && !this.form.controls.paymentDate.value)
    );
  }

  private createFormData(): FormData {
    const data = new FormData();
    data.append('student', JSON.stringify(this.form.getRawValue()));
    if (this.photo) {
      data.append('photo', this.photo);
    }
    if (this.receipt) {
      data.append('receipt', this.receipt);
    }
    return data;
  }

  private getSaveErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 400 && typeof error.error?.error === 'string') {
      return error.error.error + '. Please check your details and try again.';
    }
    if ([0, 404, 502, 503, 504].includes(error.status)) {
      return 'Cannot connect to the server. Please try again later or contact the administrator.';
    }
    return 'The server could not save the admission. Please try again.';
  }
}
