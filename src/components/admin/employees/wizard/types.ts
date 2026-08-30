export interface WizardFormState {
  fullName: string;
  employeeId: string;
  avatarUrl: string;
  gender: string;
  birthDate: string;
  age: string;
  address: string;
  notes: string;

  phone: string;
  secondaryPhone: string;
  telegramUsername: string;
  email: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;

  department: string;
  position: string;
  role: string;
  isLead: boolean;
  hiredAt: string;
  employmentType: string;
  workSchedule: string;

  salaryAmount: string;
  salaryCurrency: string;
  salaryPayDay: string;
  salaryNotes: string;

  passportSeries: string;
  passportPinfl: string;
  passportIssuedBy: string;
  passportIssuedAt: string;
  passportExpiresAt: string;
  passportFront: any;
  passportBack: any;

  hasSystemAccess: boolean;
  loginEmail: string;
  password: string;
  forcePasswordChange: boolean;
}
