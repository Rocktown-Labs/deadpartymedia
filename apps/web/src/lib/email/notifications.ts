import { logger } from "@/lib/logger";

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
      { data, operation: "notify_music_submission_skip" },
      "RESEND_API_KEY not configured. Skipping email dispatch.",
    );
    return false;
  }

  const reviewUrl = "https://deadpartymedia.tv/admin/music/submissions";
  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #7cfc00; margin-top: 0;">New Music Release Submission</h2>
      <p>A new music release has been submitted by an artist for review on Dead Party Media.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #e5e7eb;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Artist:</td><td>${data.artistName}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Title:</td><td>${data.title}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Type:</td><td>${data.releaseType}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Genre:</td><td>${data.genre}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Release Date:</td><td>${data.releaseDate || "Immediate / TBA"}</td></tr>
        ${data.notes ? `<tr><td style="padding: 8px 0; font-weight: bold;">Notes / Pitch:</td><td>${data.notes}</td></tr>` : ""}
        ${data.spotifyUrl ? `<tr><td style="padding: 8px 0; font-weight: bold;">Spotify:</td><td><a href="${data.spotifyUrl}" style="color: #7cfc00;">${data.spotifyUrl}</a></td></tr>` : ""}
        ${data.appleMusicUrl ? `<tr><td style="padding: 8px 0; font-weight: bold;">Apple Music:</td><td><a href="${data.appleMusicUrl}" style="color: #7cfc00;">${data.appleMusicUrl}</a></td></tr>` : ""}
        ${data.bandcampUrl ? `<tr><td style="padding: 8px 0; font-weight: bold;">Bandcamp:</td><td><a href="${data.bandcampUrl}" style="color: #7cfc00;">${data.bandcampUrl}</a></td></tr>` : ""}
        ${data.youtubeUrl ? `<tr><td style="padding: 8px 0; font-weight: bold;">YouTube:</td><td><a href="${data.youtubeUrl}" style="color: #7cfc00;">${data.youtubeUrl}</a></td></tr>` : ""}
        ${data.audioUrl ? `<tr><td style="padding: 8px 0; font-weight: bold;">Audio Track:</td><td><a href="${data.audioUrl}" style="color: #7cfc00;">Listen / Download Audio</a></td></tr>` : ""}
      </table>

      ${data.coverArt ? `<div style="margin-top: 16px;"><img src="${data.coverArt}" alt="Cover Art" style="max-width: 240px; border-radius: 6px; border: 1px solid #333;" /></div>` : ""}

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
        subject: `New Music Submission: ${data.artistName} - ${data.title}`,
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
      { data, operation: "notify_venue_signup_skip" },
      "RESEND_API_KEY not configured. Skipping email dispatch.",
    );
    return false;
  }

  const html = `
    <div style="font-family: sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 24px; border-radius: 8px;">
      <h2 style="color: #7cfc00; margin-top: 0;">New Venue Registered</h2>
      <p>A new venue has signed up and completed onboarding on Dead Party Media.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px; color: #e5e7eb;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Venue:</td><td>${data.name}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Location:</td><td>${data.address ? `${data.address}, ` : ""}${data.city}, ${data.state} ${data.zip || ""}</td></tr>
        ${data.phone ? `<tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${data.phone}</td></tr>` : ""}
        ${data.website ? `<tr><td style="padding: 8px 0; font-weight: bold;">Website:</td><td><a href="${data.website}" style="color: #7cfc00;">${data.website}</a></td></tr>` : ""}
        ${data.capacity ? `<tr><td style="padding: 8px 0; font-weight: bold;">Capacity:</td><td>${data.capacity}</td></tr>` : ""}
        ${data.bookingRates ? `<tr><td style="padding: 8px 0; font-weight: bold;">Booking Rates:</td><td>${data.bookingRates}</td></tr>` : ""}
        ${data.bookingEmail ? `<tr><td style="padding: 8px 0; font-weight: bold;">Booking Email:</td><td>${data.bookingEmail}</td></tr>` : ""}
        ${data.description ? `<tr><td style="padding: 8px 0; font-weight: bold;">Description:</td><td>${data.description}</td></tr>` : ""}
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
        subject: `New Venue Onboarded: ${data.name} (${data.city}, ${data.state})`,
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
