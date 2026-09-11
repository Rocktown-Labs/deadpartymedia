import { logger } from "@/lib/logger";
import { escapeHtml, isSafeHttpUrl } from "@/lib/security";

const NOTIFICATION_EMAIL = "deadpartyplaylist@gmail.com";

interface MusicReleaseNotificationData {
  artistName: string;
  title: string;
  releaseType: string;
  genre: string;
  releaseDate?: string | null;
  notes?: string | null;
  spotifyUrl?: string | null;
  appleMusicUrl?: string | null;
  bandcampUrl?: string | null;
  youtubeUrl?: string | null;
  audioUrl?: string | null;
  coverArt?: string | null;
  releaseId?: number;
}

interface VenueNotificationData {
  name: string;
  address?: string | null;
  city: string;
  state: string;
  zip?: string | null;
  phone?: string | null;
  website?: string | null;
  capacity?: string | null;
  bookingRates?: string | null;
  bookingEmail?: string | null;
  description?: string | null;
  venueId?: number;
}

export async function sendMusicReleaseSubmissionNotification(
  data: MusicReleaseNotificationData,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info(
      { operation: "notify_music_submission_skip", releaseId: data.releaseId },
      "RESEND_API_KEY not configured. Skipping email dispatch.",
    );
    return false;
  }

  const reviewUrl = "https://deadpartymedia.tv/admin/music/submissions";
  const safeSpotify = data.spotifyUrl && isSafeHttpUrl(data.spotifyUrl) ? data.spotifyUrl : null;
  const safeApple = data.appleMusicUrl && isSafeHttpUrl(data.appleMusicUrl) ? data.appleMusicUrl : null;
  const safeBandcamp = data.bandcampUrl && isSafeHttpUrl(data.bandcampUrl) ? data.bandcampUrl : null;
  const safeYoutube = data.youtubeUrl && isSafeHttpUrl(data.youtubeUrl) ? data.youtubeUrl : null;
  const safeAudio = data.audioUrl && isSafeHttpUrl(data.audioUrl) ? data.audioUrl : null;
  const safeCover = data.coverArt && isSafeHttpUrl(data.coverArt) ? data.coverArt : null;
  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #7cfc00; margin-top: 0;">New Music Release Submission</h2>
      <p>A new music release has been submitted by an artist for review on Dead Party Media.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #e5e7eb;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Artist:</td><td>${escapeHtml(data.artistName)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Title:</td><td>${escapeHtml(data.title)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Type:</td><td>${escapeHtml(data.releaseType)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Genre:</td><td>${escapeHtml(data.genre)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Release Date:</td><td>${escapeHtml(data.releaseDate || "Immediate / TBA")}</td></tr>
        ${data.notes ? `<tr><td style="padding: 8px 0; font-weight: bold;">Notes / Pitch:</td><td>${escapeHtml(data.notes)}</td></tr>` : ""}
        ${safeSpotify ? `<tr><td style="padding: 8px 0; font-weight: bold;">Spotify:</td><td><a href="${escapeHtml(safeSpotify)}" style="color: #7cfc00;">${escapeHtml(safeSpotify)}</a></td></tr>` : ""}
        ${safeApple ? `<tr><td style="padding: 8px 0; font-weight: bold;">Apple Music:</td><td><a href="${escapeHtml(safeApple)}" style="color: #7cfc00;">${escapeHtml(safeApple)}</a></td></tr>` : ""}
        ${safeBandcamp ? `<tr><td style="padding: 8px 0; font-weight: bold;">Bandcamp:</td><td><a href="${escapeHtml(safeBandcamp)}" style="color: #7cfc00;">${escapeHtml(safeBandcamp)}</a></td></tr>` : ""}
        ${safeYoutube ? `<tr><td style="padding: 8px 0; font-weight: bold;">YouTube:</td><td><a href="${escapeHtml(safeYoutube)}" style="color: #7cfc00;">${escapeHtml(safeYoutube)}</a></td></tr>` : ""}
        ${safeAudio ? `<tr><td style="padding: 8px 0; font-weight: bold;">Audio Track:</td><td><a href="${escapeHtml(safeAudio)}" style="color: #7cfc00;">Listen / Download Audio</a></td></tr>` : ""}
      </table>

      ${safeCover ? `<div style="margin-top: 16px;"><img src="${escapeHtml(safeCover)}" alt="Cover Art" style="max-width: 240px; border-radius: 6px; border: 1px solid #333;" /></div>` : ""}

      <div style="margin-top: 24px;">
        <a href="${reviewUrl}" style="background-color: #7cfc00; color: #000000; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
          Open Admin Review Queue
        </a>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dead Party Media <submissions@deadpartymedia.tv>",
        to: NOTIFICATION_EMAIL,
        subject: `New Music Submission: ${data.artistName} - ${data.title}`.replaceAll(/[\r\n]+/g, " ").slice(0, 200),
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.warn(
        { status: res.status, errBody, operation: "notify_music_submission_error" },
        "Resend API responded with an error",
      );
      return false;
    }

    logger.info({ operation: "notify_music_submission_success" }, "Submission email sent");
    return true;
  } catch (error) {
    logger.error(
      { error, operation: "notify_music_submission_failure" },
      "Failed to dispatch music submission notification email",
    );
    return false;
  }
}

export async function sendVenueRegistrationNotification(
  data: VenueNotificationData,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info(
      { operation: "notify_venue_signup_skip", venueId: data.venueId },
      "RESEND_API_KEY not configured. Skipping email dispatch.",
    );
    return false;
  }

  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #7cfc00; margin-top: 0;">New Venue Registered</h2>
      <p>A new venue has signed up and completed onboarding on Dead Party Media.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #e5e7eb;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Venue:</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Location:</td><td>${data.address ? `${escapeHtml(data.address)}, ` : ""}${escapeHtml(data.city)}, ${escapeHtml(data.state)} ${escapeHtml(data.zip || "")}</td></tr>
        ${data.phone ? `<tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${escapeHtml(data.phone)}</td></tr>` : ""}
        ${data.website && isSafeHttpUrl(data.website) ? `<tr><td style="padding: 8px 0; font-weight: bold;">Website:</td><td><a href="${escapeHtml(data.website)}" style="color: #7cfc00;">${escapeHtml(data.website)}</a></td></tr>` : ""}
        ${data.capacity ? `<tr><td style="padding: 8px 0; font-weight: bold;">Capacity:</td><td>${escapeHtml(data.capacity)}</td></tr>` : ""}
        ${data.bookingRates ? `<tr><td style="padding: 8px 0; font-weight: bold;">Booking Rates:</td><td>${escapeHtml(data.bookingRates)}</td></tr>` : ""}
        ${data.bookingEmail ? `<tr><td style="padding: 8px 0; font-weight: bold;">Booking Email:</td><td>${escapeHtml(data.bookingEmail)}</td></tr>` : ""}
        ${data.description ? `<tr><td style="padding: 8px 0; font-weight: bold;">Description:</td><td>${escapeHtml(data.description)}</td></tr>` : ""}
      </table>

      <div style="margin-top: 24px;">
        <a href="https://deadpartymedia.tv/admin/venues" style="background-color: #7cfc00; color: #000000; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
          View Venues in Admin
        </a>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dead Party Media <onboarding@deadpartymedia.tv>",
        to: NOTIFICATION_EMAIL,
        subject: `New Venue Onboarded: ${data.name} (${data.city}, ${data.state})`.replaceAll(/[\r\n]+/g, " ").slice(0, 200),
        html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.warn(
        { status: res.status, errBody, operation: "notify_venue_signup_error" },
        "Resend API responded with error",
      );
      return false;
    }

    logger.info({ operation: "notify_venue_signup_success" }, "Venue notification email sent");
    return true;
  } catch (error) {
    logger.error(
      { error, operation: "notify_venue_signup_failure" },
      "Failed to dispatch venue registration notification email",
    );
    return false;
  }
}
