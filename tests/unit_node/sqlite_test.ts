// Copyright 2018-2025 the Deno authors. MIT license.
import { DatabaseSync } from "node:sqlite";
import { assert, assertEquals, assertThrows } from "@std/assert";

const tempDir = Deno.makeTempDirSync();

Deno.test("[node/sqlite] in-memory databases", () => {
  const db1 = new DatabaseSync(":memory:");
  const db2 = new DatabaseSync(":memory:");
  db1.exec("CREATE TABLE data(key INTEGER PRIMARY KEY);");
  db1.exec("INSERT INTO data (key) VALUES (1);");

  db2.exec("CREATE TABLE data(key INTEGER PRIMARY KEY);");
  db2.exec("INSERT INTO data (key) VALUES (1);");

  assertEquals(db1.prepare("SELECT * FROM data").all(), [{
    key: 1,
    __proto__: null,
  }]);
  assertEquals(db2.prepare("SELECT * FROM data").all(), [{
    key: 1,
    __proto__: null,
  }]);
});

Deno.test("[node/sqlite] Errors originating from SQLite should be thrown", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE test(
      key INTEGER PRIMARY KEY
    ) STRICT;
  `);
  const stmt = db.prepare("INSERT INTO test(key) VALUES(?)");
  assertEquals(stmt.run(1), { lastInsertRowid: 1, changes: 1 });

  assertThrows(() => stmt.run(1), Error);
});

Deno.test(
  {
    permissions: { read: true, write: true },
    name: "[node/sqlite] PRAGMAs are supported",
  },
  () => {
    const db = new DatabaseSync(`${tempDir}/test.db`);

    assertEquals(db.prepare("PRAGMA journal_mode = WAL").get(), {
      journal_mode: "wal",
      __proto__: null,
    });

    db.close();
  },
);

Deno.test("[node/sqlite] StatementSync bind bigints", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE data(key INTEGER PRIMARY KEY);");

  const stmt = db.prepare("INSERT INTO data (key) VALUES (?)");
  assertEquals(stmt.run(100n), { lastInsertRowid: 100, changes: 1 });
  db.close();
});

Deno.test("[node/sqlite] StatementSync read bigints are supported", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE data(key INTEGER PRIMARY KEY);");
  db.exec("INSERT INTO data (key) VALUES (1);");

  const stmt = db.prepare("SELECT * FROM data");
  assertEquals(stmt.get(), { key: 1, __proto__: null });

  stmt.setReadBigInts(true);
  assertEquals(stmt.get(), { key: 1n, __proto__: null });
});

Deno.test("[node/sqlite] StatementSync integer too large", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE data(key INTEGER PRIMARY KEY);");
  db.prepare("INSERT INTO data (key) VALUES (?)").run(
    Number.MAX_SAFE_INTEGER + 1,
  );

  assertThrows(() => db.prepare("SELECT * FROM data").get());
});

Deno.test("[node/sqlite] StatementSync blob are Uint8Array", () => {
  const db = new DatabaseSync(":memory:");
  const obj = db.prepare("select cast('test' as blob)").all();

  assertEquals(obj.length, 1);
  const row = obj[0] as Record<string, Uint8Array>;
  assert(row["cast('test' as blob)"] instanceof Uint8Array);
});

Deno.test({
  name: "[node/sqlite] sqlite permissions",
  permissions: { read: false, write: false },
  fn() {
    assertThrows(() => {
      new DatabaseSync("test.db");
    }, Deno.errors.NotCapable);
    assertThrows(() => {
      new DatabaseSync("test.db", { readOnly: true });
    }, Deno.errors.NotCapable);
  },
});

Deno.test({
  name: "[node/sqlite] readOnly database",
  permissions: { read: true, write: true },
  fn() {
    {
      const db = new DatabaseSync(`${tempDir}/test3.db`);
      db.exec("CREATE TABLE foo (id INTEGER PRIMARY KEY)");
      db.close();
    }
    {
      const db = new DatabaseSync(`${tempDir}/test3.db`, { readOnly: true });
      assertThrows(
        () => {
          db.exec("CREATE TABLE test(key INTEGER PRIMARY KEY)");
        },
        Error,
        "attempt to write a readonly database",
      );
      db.close();
    }
  },
});
