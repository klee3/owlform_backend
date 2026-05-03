import * as argon2 from 'argon2';

export const hash = async (data: string) => {
  return argon2.hash(data);
};

export const compare = async (hash: string, data: string) => {
  return argon2.verify(hash, data);
};
