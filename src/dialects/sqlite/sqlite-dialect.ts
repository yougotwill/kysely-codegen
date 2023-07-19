import { SqliteDialect as KyselySqliteDialect } from 'kysely';
import { CreateKyselyDialectOptions, Dialect } from '../../dialect';
import { SqliteAdapter } from './sqlite-adapter';
import { SqliteIntrospector } from './sqlite-introspector';

export class SqliteDialect extends Dialect {
  readonly adapter = new SqliteAdapter();
  readonly introspector = new SqliteIntrospector();

  async createKyselyDialect(options: CreateKyselyDialectOptions) {
    const { default: Database } = await import('better-sqlite3');

    const database = new Database(options.connectionString);

    if (options.connectionKey) {
      // make sure the key is a hex string
      const key = /[^0-9A-Fa-f]/.test(options.connectionKey)
        ? `'${options.connectionKey}'`
        : `"x'${options.connectionKey}'"`;

      database.pragma(`key = ${key}`);
    }

    return new KyselySqliteDialect({
      database,
    });
  }
}
