import { User, CreateUserData } from '../types/user';

const API_BASE = 'http://localhost:3001/api';

class UserService {
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`,
    };
  }

  async listWorkers(): Promise<User[]> {
    const response = await fetch(`${API_BASE}/workers`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch workers: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workers;
  }

  async createWorker(userData: CreateUserData): Promise<User> {
    const response = await fetch(`${API_BASE}/workers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create worker');
    }

    const data = await response.json();
    return data.user;
  }
}

export const userService = new UserService();