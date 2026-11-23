import nodemailer from "nodemailer";

export type RegistrationMailer = (email: string, code: string) => Promise<void>;

// 没有 SMTP 配置时不伪造成功，也不向浏览器或日志泄露验证码。
export function createRegistrationMailer(
  env: NodeJS.ProcessEnv = process.env,
): RegistrationMailer | undefined {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM)
    return undefined;
  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("SMTP_PORT 必须是有效端口");
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return async (email, code) => {
    const result = await transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: "拾页 · 注册邮箱验证码",
      text: `你的注册验证码是：${code}\n\n5 分钟内有效，仅可使用一次。请勿向他人提供验证码。\n如果不是你本人操作，请忽略此邮件。`,
    });
    if (!result.accepted.length || result.rejected.length)
      throw new Error("SMTP recipient rejected");
  };
}
