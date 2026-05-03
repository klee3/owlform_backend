import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Pretty print format for development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, context, trace }) => {
    const ctx = context ? ` [${context}]` : '';
    const stack = trace ? `\n${trace}` : '';
    return `${timestamp} ${level}${ctx}: ${message}${stack}`;
  }),
);

// JSON format for production (easier to parse by log aggregators)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  winston.format.json(),
);

const isProduction = process.env.NODE_ENV === 'production';

// Console transport
const consoleTransport = new winston.transports.Console({
  format: isProduction
    ? nestWinstonModuleUtilities.format.nestLike('UseOwlForm', {
        colors: false,
        prettyPrint: false,
      })
    : devFormat,
});

// Daily rotating file for all logs
const combinedFileTransport = new DailyRotateFile({
  dirname: 'logs',
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: prodFormat,
});

// Daily rotating file for errors only
const errorFileTransport = new DailyRotateFile({
  dirname: 'logs',
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: prodFormat,
});

// Exception handlers
const exceptionHandlers = [
  new DailyRotateFile({
    dirname: 'logs',
    filename: 'exceptions-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: prodFormat,
  }),
];

// Rejection handlers
const rejectionHandlers = [
  new DailyRotateFile({
    dirname: 'logs',
    filename: 'rejections-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: prodFormat,
  }),
];

export const winstonConfig = {
  level: isProduction ? 'info' : 'debug',
  defaultMeta: { service: 'useowlform-backend' },
  transports: isProduction
    ? [consoleTransport, combinedFileTransport, errorFileTransport]
    : [consoleTransport],
  exceptionHandlers: isProduction ? exceptionHandlers : [],
  rejectionHandlers: isProduction ? rejectionHandlers : [],
  exitOnError: false,
};
