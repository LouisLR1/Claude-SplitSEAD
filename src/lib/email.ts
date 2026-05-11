import { Resend } from "resend";
import { getAppUrl } from "@/lib/url";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendGroupInviteEmail({
  to,
  inviterName,
  groupName,
  joinUrl,
}: {
  to: string;
  inviterName: string;
  groupName: string;
  joinUrl: string;
}) {
  await getResend().emails.send({
    from: `SplitSEAD <${FROM}>`,
    to,
    subject: `${inviterName} invited you to "${groupName}" on SplitSEAD`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0c0e14;color:#f0f2ff;border-radius:12px">
        <h1 style="font-size:20px;font-weight:600;margin:0 0 8px">You're invited to split expenses</h1>
        <p style="color:#8b8fa8;margin:0 0 24px">
          <strong style="color:#f0f2ff">${inviterName}</strong> added you to
          <strong style="color:#f0f2ff">${groupName}</strong> on SplitSEAD.
        </p>
        <a href="${joinUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500">
          Join group
        </a>
        <p style="color:#8b8fa8;font-size:12px;margin:24px 0 0">
          Or copy this link: ${joinUrl}
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0"/>
        <p style="color:#8b8fa8;font-size:12px;margin:0">
          SplitSEAD — split expenses with friends.
          <a href="${getAppUrl()}/settings/notifications" style="color:#6366f1">Unsubscribe</a>
        </p>
      </div>
    `,
  });
}
