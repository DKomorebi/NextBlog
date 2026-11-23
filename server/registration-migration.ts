import type { MigrationInterface, QueryRunner } from "typeorm";

export class RegistrationCodes1795392000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE registration_codes (
      email varchar(255) PRIMARY KEY,
      nonce uuid NOT NULL,
      digest varchar(64),
      expires_at timestamptz,
      attempts integer NOT NULL DEFAULT 0,
      sent_at timestamptz NOT NULL,
      window_at timestamptz NOT NULL,
      sends integer NOT NULL DEFAULT 1
    );
    CREATE INDEX registration_codes_cleanup_idx ON registration_codes(sent_at);`);
  }
  async down(q: QueryRunner) {
    await q.query("DROP TABLE registration_codes");
  }
}
