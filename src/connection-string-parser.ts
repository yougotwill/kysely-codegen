import { config as loadEnv } from 'dotenv';
import { DialectName } from './dialect-manager';
import { Logger } from './logger';

const CALL_STATEMENT_REGEXP = /^\s*([a-z]+)\s*\(\s*(.*)\s*\)\s*$/;

/**
 * @see https://dev.mysql.com/doc/refman/8.0/en/connecting-using-uri-or-key-value-pairs.html
 */
const MYSQL_URI_CONNECTION_STRING_REGEXP = /^mysqlx?:\/\//;

export type ParseConnectionStringOptions = {
  connectionString: string;
  connectionKey?: string;
  dialectName?: DialectName;
  logger?: Logger;
};

export type ParsedConnectionString = {
  connectionString: string;
  connectionKey?: string;
  inferredDialectName: DialectName;
};

/**
 * Parses a connection string URL or loads it from an environment file.
 * Upon success, it also returns which dialect was inferred from the connection string.
 */
export class ConnectionStringParser {
  #inferDialectName(connectionString: string): DialectName {
    if (connectionString.startsWith('postgres://')) {
      return 'postgres';
    }

    if (MYSQL_URI_CONNECTION_STRING_REGEXP.test(connectionString)) {
      return 'mysql';
    }

    return 'sqlite';
  }

  parseOptionsString(inputString: string, logger?: Logger) {
    const expressionMatch = inputString.match(CALL_STATEMENT_REGEXP);

    if (!expressionMatch) {
      return inputString;
    }

    const name = expressionMatch[1]!;

    if (name !== 'env') {
      throw new ReferenceError(`Function '${name}' is not defined.`);
    }

    const keyToken = expressionMatch[2]!;
    let key;

    try {
      key = keyToken.includes('"') ? JSON.parse(keyToken) : keyToken;
    } catch {
      throw new SyntaxError(`Invalid connection string: '${inputString}'`);
    }

    if (typeof key !== 'string') {
      throw new TypeError(
        `Parameter 0 of function '${name}' must be a string.`,
      );
    }

    loadEnv();

    logger?.info(`Using ${key} from .env file.`);

    const envConnectionString = process.env[key];
    if (!envConnectionString) {
      throw new ReferenceError(
        `Environment variable '${key}' could not be found.`,
      );
    }

    return envConnectionString;
  }

  parse(options: ParseConnectionStringOptions): ParsedConnectionString {
    const connectionString = this.parseOptionsString(
      options.connectionString,
      options.logger,
    );

    const inferredDialectName =
      options.dialectName ?? this.#inferDialectName(connectionString);

    const parsed: ParsedConnectionString = {
      connectionString,
      inferredDialectName,
    };

    if (options.connectionKey) {
      parsed.connectionKey = this.parseOptionsString(
        options.connectionKey,
        options.logger,
      );
    }

    return parsed;
  }
}
