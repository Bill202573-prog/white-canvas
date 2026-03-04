// Core types for the football school SaaS

export type UserRole = 'admin' | 'school' | 'teacher' | 'guardian';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
  schoolId?: string;
}

export interface School {
  id: string;
  name: string;
  adminUserId: string;
  createdAt: string;
  isActive: boolean;
}

export interface Child {
  id: string;
  fullName: string;
  birthDate: string;
  photoUrl: string;
  schoolId: string;
  isActive: boolean;
  createdAt: string;
}

export interface Guardian {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  childIds: string[];
}

export interface Teacher {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  photoUrl: string;
  schoolId: string;
  isActive: boolean;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  schoolId: string;
  childIds: string[];
  schedule: ClassSchedule[];
}

export interface ClassSchedule {
  dayOfWeek: number; // 0-6, Sunday-Saturday
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Lesson {
  id: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface Attendance {
  id: string;
  lessonId: string;
  childId: string;
  guardianConfirmed?: boolean;
  guardianConfirmedAt?: string;
  teacherMarked?: 'present' | 'absent';
  teacherMarkedAt?: string;
}

export interface ChildWithDetails extends Child {
  guardian?: Guardian;
  classes?: Class[];
  isBirthdayToday?: boolean;
  isBirthdayThisMonth?: boolean;
}

export interface ClassWithDetails extends Class {
  teacher?: Teacher;
  children?: ChildWithDetails[];
}
