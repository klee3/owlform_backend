import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  workspaceSlug!: string;
}
