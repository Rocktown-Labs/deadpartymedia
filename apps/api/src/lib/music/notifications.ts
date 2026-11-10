import type { Bindings } from "../../bindings";
export async function sendMusicReleaseSubmissionNotification(
  env: Bindings,
  data: {
    artistName: string;
    title: string;
    releaseType: string;
    genre: string;
    releaseId?: number;
    [key: string]: unknown;
  },
) {
  await env.EMAIL.send({
    from: env.MAIL_FROM,
    to: "deadpartyplaylist@gmail.com",
    subject: `New Music Submission: ${data.artistName} - ${data.title}`,
    text: `${data.artistName} submitted ${data.title} (${data.releaseType}, ${data.genre}). Review: ${env.WEB_APP_URL}/admin/music/submissions`,
  });
  return true;
}
export async function sendVenueRegistrationNotification(
  env: Bindings,
  data: { name: string; city: string; state: string; [key: string]: unknown },
) {
  await env.EMAIL.send({
    from: env.MAIL_FROM,
    to: "deadpartyplaylist@gmail.com",
    subject: `New Venue: ${data.name}`,
    text: `${data.name} registered in ${data.city}, ${data.state}. Review: ${env.WEB_APP_URL}/admin/venues`,
  });
  return true;
}
