export interface DoctorUser {
  id: string;
  name: string;
  email: string;
  token?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: DoctorUser;
  message?: string;
}

/**
 * Authentication service for Doctor Login & Sign Up.
 * Currently isolated and prepared for the upcoming backend authentication endpoints.
 */
class AuthService {
  private currentUser: DoctorUser | null = null;

  async login(email: string, pass: string): Promise<AuthResponse> {
    // Simulate network latency for touch feedback
    await new Promise((res) => setTimeout(res, 800));

    if (!email || !pass) {
      return { success: false, message: 'Please enter both email and password.' };
    }

    if (!email.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    // Prepared contract for backend auth integration
    this.currentUser = {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      name: email.split('@')[0].replace('.', ' '),
      email,
    };

    return {
      success: true,
      user: this.currentUser,
      message: 'Login successful. (Backend auth pending implementation)',
    };
  }

  async signup(name: string, email: string, pass: string, confirmPass: string): Promise<AuthResponse> {
    await new Promise((res) => setTimeout(res, 800));

    if (!name || !email || !pass || !confirmPass) {
      return { success: false, message: 'All fields are required.' };
    }

    if (pass !== confirmPass) {
      return { success: false, message: 'Passwords do not match.' };
    }

    if (pass.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    this.currentUser = {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
    };

    return {
      success: true,
      user: this.currentUser,
      message: 'Account created successfully. (Backend auth pending implementation)',
    };
  }

  logout() {
    this.currentUser = null;
  }

  getCurrentUser(): DoctorUser | null {
    return this.currentUser;
  }
}

export const authService = new AuthService();
