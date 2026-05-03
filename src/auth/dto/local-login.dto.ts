import { IsEmail, IsString } from 'class-validator';

export class LocalLoginDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
