import { Injectable } from '@nestjs/common';
import { AppConfig, createConfig } from './config';

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = createConfig();
  }

  get env() {
    return this.config.env;
  }

  get port() {
    return this.config.port;
  }

  get googleSecrets() {
    return this.config.google;
  }

  get databaseUri() {
    return this.config.databaseUrl;
  }

  get jwt() {
    return this.config.jwt;
  }

  get frontendUrl() {
    return this.config.frontendUrl;
  }
}
