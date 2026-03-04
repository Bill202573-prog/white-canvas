import { School, Child, Teacher, Guardian, Class, ClassSchedule } from '@/types';

export const mockSchools: School[] = [
  {
    id: 'school-1',
    name: 'Escolinha Campeões FC',
    adminUserId: '2',
    createdAt: '2024-01-15',
    isActive: true,
  },
  {
    id: 'school-2',
    name: 'Academia Futebol Kids',
    adminUserId: '5',
    createdAt: '2024-02-20',
    isActive: true,
  },
  {
    id: 'school-3',
    name: 'Escola de Craques',
    adminUserId: '6',
    createdAt: '2024-03-10',
    isActive: false,
  },
];

export const mockTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    userId: '3',
    fullName: 'Carlos Silva',
    email: 'professor@futebol.com',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
  },
  {
    id: 'teacher-2',
    userId: '7',
    fullName: 'Roberto Mendes',
    email: 'roberto@futebol.com',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
  },
];

export const mockGuardians: Guardian[] = [
  {
    id: 'guardian-1',
    userId: '4',
    fullName: 'Maria Santos',
    email: 'responsavel@email.com',
    phone: '(11) 99999-1234',
    childIds: ['child-1', 'child-2'],
  },
  {
    id: 'guardian-2',
    userId: '8',
    fullName: 'João Oliveira',
    email: 'joao@email.com',
    phone: '(11) 99999-5678',
    childIds: ['child-3'],
  },
];

// Get today's date for birthday logic
const today = new Date();
const currentMonth = today.getMonth();
const currentDay = today.getDate();

export const mockChildren: Child[] = [
  {
    id: 'child-1',
    fullName: 'Lucas Santos',
    birthDate: `2015-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`, // Birthday today!
    photoUrl: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '2024-01-20',
  },
  {
    id: 'child-2',
    fullName: 'Ana Santos',
    birthDate: `2017-${String(currentMonth + 1).padStart(2, '0')}-15`, // Birthday this month
    photoUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '2024-01-20',
  },
  {
    id: 'child-3',
    fullName: 'Pedro Oliveira',
    birthDate: '2016-03-22',
    photoUrl: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '2024-02-10',
  },
  {
    id: 'child-4',
    fullName: 'Gabriel Costa',
    birthDate: '2015-07-08',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '2024-02-15',
  },
  {
    id: 'child-5',
    fullName: 'Sofia Lima',
    birthDate: `2016-${String(currentMonth + 1).padStart(2, '0')}-28`, // Birthday this month
    photoUrl: 'https://images.unsplash.com/photo-1518310952931-b1de897abd40?w=150&h=150&fit=crop&crop=face',
    schoolId: 'school-1',
    isActive: true,
    createdAt: '2024-03-01',
  },
];

export const mockClasses: Class[] = [
  {
    id: 'class-1',
    name: 'Turma Sub-9',
    teacherId: 'teacher-1',
    schoolId: 'school-1',
    childIds: ['child-1', 'child-2', 'child-5'],
    schedule: [
      { dayOfWeek: 2, startTime: '14:00', endTime: '15:30' }, // Tuesday
      { dayOfWeek: 4, startTime: '14:00', endTime: '15:30' }, // Thursday
      { dayOfWeek: 6, startTime: '09:00', endTime: '10:30' }, // Saturday
    ],
  },
  {
    id: 'class-2',
    name: 'Turma Sub-11',
    teacherId: 'teacher-1',
    schoolId: 'school-1',
    childIds: ['child-3', 'child-4'],
    schedule: [
      { dayOfWeek: 1, startTime: '16:00', endTime: '17:30' }, // Monday
      { dayOfWeek: 3, startTime: '16:00', endTime: '17:30' }, // Wednesday
      { dayOfWeek: 5, startTime: '16:00', endTime: '17:30' }, // Friday
    ],
  },
  {
    id: 'class-3',
    name: 'Turma Iniciante',
    teacherId: 'teacher-2',
    schoolId: 'school-1',
    childIds: ['child-1', 'child-3'],
    schedule: [
      { dayOfWeek: 6, startTime: '11:00', endTime: '12:00' }, // Saturday
    ],
  },
];

// Helper functions
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[dayOfWeek];
};

export const getShortDayName = (dayOfWeek: number): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[dayOfWeek];
};

export const isBirthdayToday = (birthDate: string): boolean => {
  const birth = new Date(birthDate);
  const today = new Date();
  return birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
};

export const isBirthdayThisMonth = (birthDate: string): boolean => {
  const birth = new Date(birthDate);
  const today = new Date();
  return birth.getMonth() === today.getMonth();
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
};

export const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const getTeacherById = (id: string): Teacher | undefined => {
  return mockTeachers.find(t => t.id === id);
};

export const getChildById = (id: string): Child | undefined => {
  return mockChildren.find(c => c.id === id);
};

export const getClassesByTeacherId = (teacherId: string): Class[] => {
  return mockClasses.filter(c => c.teacherId === teacherId);
};

export const getChildrenByIds = (ids: string[]): Child[] => {
  return mockChildren.filter(c => ids.includes(c.id));
};

export const getTodaysClasses = (teacherId: string): Class[] => {
  const today = new Date().getDay();
  return mockClasses.filter(c => 
    c.teacherId === teacherId && 
    c.schedule.some(s => s.dayOfWeek === today)
  );
};
