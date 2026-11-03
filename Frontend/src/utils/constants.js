export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const UPLOADS_URL = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5000';

export const ROLES = { STUDENT: 'student', TUTOR: 'tutor', ADMIN: 'admin' };
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const PHONE_REGEX = /^(\+251|251|0)?(9[0-9])([0-9]{7})$/;
export const BLOCKED_EMAIL_DOMAINS = ['fake.com', 'test.com', 'example.com', 'temp.com'];
export const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Amharic', 'History', 'Geography', 'Computer Science', 'Economics', 'Accounting'];
export const TOKEN_KEY = 'dd_tutor_token';
export const USER_KEY = 'dd_tutor_user';