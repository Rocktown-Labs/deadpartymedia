import { EventCard } from "@/components/content/event-card";
import { DataState } from "@/components/layout/data-state";
import { EditorialSectionHeading } from "@/components/layout/editorial-section-heading";
import { PublicScreen } from "@/components/layout/public-screen";
import { Text } from "@/components/ui/text";
import { useEvents } from "@/lib/api/hooks";
import { View } from "react-native";

export default function EventsTab() {
  const query = useEvents();
  const events = query.data ?? [];
  const now = Date.now();
  const upcoming = events.filter((event) => new Date(event.date).getTime() >= now);
  const recent = events.filter((event) => new Date(event.date).getTime() < now);

  return (
    <PublicScreen contentClassName="gap-10 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">What's On</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Live Events
        </Text>
      </View>
      {query.error ? <DataState error={query.error} /> : null}
      {!query.error && events.length === 0 ? (
        <DataState
          emptyMessage="No events were returned by the API."
          isLoading={query.isPending}
          loadingMessage="Loading events..."
        />
      ) : null}
      <View className="gap-10">
        <View className="gap-6">
          <EditorialSectionHeading eyebrow="Calendar" title="Upcoming" />
          {upcoming.length ? (
            <View className="gap-6">
              {upcoming.map((event, index) => (
                <EventCard key={event.id} event={event} motionIndex={index} />
              ))}
            </View>
          ) : (
            <View className="min-h-48 items-center justify-center border border-border bg-card px-6">
              <Text className="text-center text-2xl text-muted-foreground">
                No upcoming events right now.
              </Text>
            </View>
          )}
        </View>

        {recent.length ? (
          <View className="gap-6">
            <EditorialSectionHeading eyebrow="Recently Played" title="Past Events" />
            <View className="gap-6">
              {recent.slice(0, 6).map((event, index) => (
                <EventCard key={event.id} event={event} motionIndex={index} />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </PublicScreen>
  );
}
