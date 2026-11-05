declare module 'node:sqlite' {
  type SqlValue = string | number | bigint | null | Uint8Array;

  interface StatementResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  interface StatementSync {
    run(...params: SqlValue[]): StatementResult;
    get(...params: SqlValue[]): unknown;
    all(...params: SqlValue[]): unknown[];
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
