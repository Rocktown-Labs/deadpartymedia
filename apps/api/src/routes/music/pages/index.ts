import { Hono } from "hono";
import type { AppEnv } from "../../../bindings";
import { loadAbout } from "./about";
import { loadAdmin } from "./admin";
import { loadAdminArtists } from "./admin-artists";
import { loadAdminArtistsId } from "./admin-artists-id";
import { loadAdminArtistsImport } from "./admin-artists-import";
import { loadAdminArtistsNew } from "./admin-artists-new";
import { loadAdminEvents } from "./admin-events";
import { loadAdminEventsId } from "./admin-events-id";
import { loadAdminEventsImport } from "./admin-events-import";
import { loadAdminEventsNew } from "./admin-events-new";
import { loadAdminMusic } from "./admin-music";
import { loadAdminMusicId } from "./admin-music-id";
import { loadAdminMusicNew } from "./admin-music-new";
import { loadAdminMusicSubmissions } from "./admin-music-submissions";
import { loadAdminPosts } from "./admin-posts";
import { loadAdminPostsId } from "./admin-posts-id";
import { loadAdminPostsNew } from "./admin-posts-new";
import { loadAdminPostsWordpress } from "./admin-posts-wordpress";
import { loadAdminUsers } from "./admin-users";
import { loadAdminUsersId } from "./admin-users-id";
import { loadAdminVenues } from "./admin-venues";
import { loadAdminVenuesId } from "./admin-venues-id";
import { loadAdminVenuesNew } from "./admin-venues-new";
import { loadArticleSlug } from "./article-slug";
import { loadArtistDashboardReleases } from "./artist-dashboard-releases";
import { loadArtistDashboardReleasesNew } from "./artist-dashboard-releases-new";
import { loadArtistsSlug } from "./artists-slug";
import { loadEventsSlug } from "./events-slug";
import { loadHome } from "./home";
import { loadMerchHandle } from "./merch-handle";
import { loadMusicSlug } from "./music-slug";
import { loadVenueDashboard } from "./venue-dashboard";
import { loadVenueDashboardEventsNew } from "./venue-dashboard-events-new";
import { loadVenues } from "./venues";
export const musicPages = new Hono<AppEnv>()
  .route("/", loadAbout)
  .route("/", loadAdminArtistsImport)
  .route("/", loadAdminArtistsNew)
  .route("/", loadAdminArtists)
  .route("/", loadAdminEventsImport)
  .route("/", loadAdminEventsNew)
  .route("/", loadAdminEvents)
  .route("/", loadAdminMusicNew)
  .route("/", loadAdminMusic)
  .route("/", loadAdminMusicSubmissions)
  .route("/", loadAdmin)
  .route("/", loadAdminPostsNew)
  .route("/", loadAdminPosts)
  .route("/", loadAdminPostsWordpress)
  .route("/", loadAdminUsers)
  .route("/", loadAdminVenuesNew)
  .route("/", loadAdminVenues)
  .route("/", loadArtistDashboardReleasesNew)
  .route("/", loadArtistDashboardReleases)
  .route("/", loadHome)
  .route("/", loadVenueDashboardEventsNew)
  .route("/", loadVenueDashboard)
  .route("/", loadVenues)
  .route("/", loadAdminArtistsId)
  .route("/", loadAdminEventsId)
  .route("/", loadAdminMusicId)
  .route("/", loadAdminPostsId)
  .route("/", loadAdminUsersId)
  .route("/", loadAdminVenuesId)
  .route("/", loadArticleSlug)
  .route("/", loadArtistsSlug)
  .route("/", loadEventsSlug)
  .route("/", loadMerchHandle)
  .route("/", loadMusicSlug);
