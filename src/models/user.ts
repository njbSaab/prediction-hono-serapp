export interface User {
    uuid: string;
    email: string;
    name: string;
    createdAt: string;
    emailVerified: boolean;
    verificationCodeHash?: string;
    verificationCodeExpiresAt?: string;
    userPayload?: string;
    userResaultCollect?: string;
    isCorrectAnswer?: boolean;
    userResault?: number;
    isHistory?: string;
  }