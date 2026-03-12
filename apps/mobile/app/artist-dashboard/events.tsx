import { EventCard } from "@/components/content/event-card";
import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { useArtistEvents, useCurrentArtist } from "@/lib/api/hooks";

export default function ArtistEventsScreen() {
  const currentArtist = useCurrentArtist();
  const events = useArtistEvents(currentArtist.data?.slug ?? "");

  return (
    <ProtectedScreen role="artist">
      <ScreenView title="My events" subtitle="Events attached to your artist profile.">
        {(events.data ?? []).map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ScreenView>
    </ProtectedScreen>
  );
}
