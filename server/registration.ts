import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { DataSource } from "typeorm";
import { UserEntity } from "./entities";
import type { RegistrationMailer } from "./mail";

export class RegistrationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function createRegistration(
  db: DataSource,
  secret: string,
  mailer?: RegistrationMailer,
  now = () => new Date(),
) {
  const digest = (email: string, nonce: string, code: string) =>
    createHmac("sha256", secret)
      .update(JSON.stringify(["registration", email, nonce, code]))
      .digest("hex");

  return {
    async sendCode(email: string) {
      if (!mailer)
        throw new RegistrationError(503, "注册邮件服务尚未配置，请联系站点管理员");
      const at = now();
      const nonce = randomUUID();
      // 一条 SQL 原子预留发送名额：同邮箱并发请求也不能绕过冷却和小时上限。
      await db.query("DELETE FROM registration_codes WHERE sent_at < $1", [
        new Date(at.getTime() - 24 * 60 * 60 * 1000),
      ]);
      const rows = await db.query(
        `INSERT INTO registration_codes(email, nonce, sent_at, window_at)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT(email) DO UPDATE SET
           nonce = $2, digest = NULL, expires_at = NULL, attempts = 0, sent_at = $3,
           window_at = CASE WHEN registration_codes.window_at <= $3::timestamptz - interval '1 hour'
             THEN $3 ELSE registration_codes.window_at END,
           sends = CASE WHEN registration_codes.window_at <= $3::timestamptz - interval '1 hour'
             THEN 1 ELSE registration_codes.sends + 1 END
         WHERE registration_codes.sent_at <= $3::timestamptz - interval '60 seconds'
           AND (registration_codes.sends < 5 OR registration_codes.window_at <= $3::timestamptz - interval '1 hour')
         RETURNING email`,
        [email, nonce, at],
      );
      if (!rows.length)
        throw new RegistrationError(429, "请勿频繁发送：间隔至少 60 秒，每个邮箱每小时最多 5 次");
      // 已注册邮箱也返回相同提示，避免发送接口直接暴露账号是否存在。
      if (await db.getRepository(UserEntity).existsBy({ email })) return;
      const code = randomInt(0, 1000000).toString().padStart(6, "0");
      try {
        await mailer(email, code);
      } catch {
        // 保留发送配额，失败时无有效验证码。不要把 SMTP 异常（可能含凭据）返回前端。
        throw new RegistrationError(503, "邮件发送失败，请稍后重试或联系站点管理员");
      }
      await db.query(
        `UPDATE registration_codes SET digest = $3, expires_at = $4
         WHERE email = $1 AND nonce = $2`,
        [email, nonce, digest(email, nonce, code), new Date(now().getTime() + 5 * 60 * 1000)],
      );
    },

    async register(input: { email: string; username: string; password: string; verificationCode: string }) {
      // 行锁使校验、创建用户、消费验证码成为一个事务；错误次数必须提交，不能抛异常回滚。
      const user = await db.transaction(async (manager) => {
        const [record] = await manager.query(
          "SELECT * FROM registration_codes WHERE email = $1 FOR UPDATE",
          [input.email],
        );
        if (!record?.digest || record.attempts >= 5 || !record.expires_at ||
          new Date(record.expires_at).getTime() <= now().getTime()) return null;
        const expected = Buffer.from(record.digest, "hex");
        const actual = Buffer.from(digest(input.email, record.nonce, input.verificationCode), "hex");
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
          await manager.query("UPDATE registration_codes SET attempts = attempts + 1 WHERE email = $1", [input.email]);
          return null;
        }
        const repo = manager.getRepository(UserEntity);
        const created = await repo.save(repo.create({
          email: input.email, username: input.username,
          passwordHash: await bcrypt.hash(input.password, 12), role: "user",
        }));
        // 保留发送计数，但销毁有效凭证；任何重放都会失败。
        await manager.query("UPDATE registration_codes SET digest = NULL, expires_at = NULL WHERE email = $1", [input.email]);
        return created;
      });
      if (!user) throw new RegistrationError(400, "验证码错误、已过期或已失效，请检查邮箱或重新获取");
      return user;
    },
  };
}
