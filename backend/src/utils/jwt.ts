import jwt from 'jsonwebtoken';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined');
  return secret;
};

const getExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN ?? '7d';
};

export const signToken = (payload: object): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn() } as jwt.SignOptions);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, getSecret());
};
