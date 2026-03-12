import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useOnboardingProfile, useSubmitOnboarding } from "@/lib/api/hooks";
import type { Genre } from "@dpmedia/contracts";
import { router } from "expo-router";
import * as React from "react";
import { View } from "react-native";

export default function OnboardingScreen() {
  const profileQuery = useOnboardingProfile();
  const submitOnboarding = useSubmitOnboarding();
  const [role, setRole] = React.useState<"artist" | "fan">("fan");
  const [fanName, setFanName] = React.useState("");
  const [artist, setArtist] = React.useState({
    bio: "",
    genre: "OTHER" as Genre,
    instagram: "",
    location: "",
    name: "",
    spotifyArtistId: "",
    spotifyUrl: "",
    website: "",
  });

  React.useEffect(() => {
    if (profileQuery.data) {
      setRole(profileQuery.data.role === "artist" ? "artist" : "fan");
      setFanName(profileQuery.data.fan.name ?? "");
      if (profileQuery.data.artist) {
        setArtist({
          bio: profileQuery.data.artist.bio,
          genre: profileQuery.data.artist.genre,
          instagram: profileQuery.data.artist.instagram,
          location: profileQuery.data.artist.location,
          name: profileQuery.data.artist.name,
          spotifyArtistId: profileQuery.data.artist.spotifyArtistId,
          spotifyUrl: profileQuery.data.artist.spotifyUrl,
          website: profileQuery.data.artist.website,
        });
      }
    }
  }, [profileQuery.data?.role, profileQuery.data?.artist?.id, profileQuery.data?.fan.name]);

  React.useEffect(() => {
    if (profileQuery.data?.onboardingComplete) {
      router.replace(profileQuery.data.role === "artist" ? "/artist-dashboard" : "/dashboard");
    }
  }, [profileQuery.data?.onboardingComplete, profileQuery.data?.role]);

  return (
    <ProtectedScreen allowIncomplete>
      <ScreenView
        title="Complete onboarding"
        subtitle="Choose your role and finish your account setup."
      >
        <View className="flex-row gap-3">
          <Button variant={role === "fan" ? "default" : "outline"} onPress={() => setRole("fan")}>
            <Text>Fan</Text>
          </Button>
          <Button
            variant={role === "artist" ? "secondary" : "outline"}
            onPress={() => setRole("artist")}
          >
            <Text>Artist</Text>
          </Button>
        </View>

        {role === "fan" ? (
          <View className="gap-3">
            <Input placeholder="Your name" value={fanName} onChangeText={setFanName} />
            <Button onPress={() => submitOnboarding.mutate({ name: fanName, role: "fan" })}>
              <Text>Finish as fan</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-3">
            <Input
              placeholder="Artist name"
              value={artist.name}
              onChangeText={(value) => setArtist((current) => ({ ...current, name: value }))}
            />
            <Input
              placeholder="Location"
              value={artist.location}
              onChangeText={(value) => setArtist((current) => ({ ...current, location: value }))}
            />
            <Input
              placeholder="Genre"
              value={artist.genre}
              onChangeText={(value) =>
                setArtist((current) => ({ ...current, genre: value as Genre }))
              }
            />
            <Input
              placeholder="Instagram URL"
              value={artist.instagram}
              onChangeText={(value) => setArtist((current) => ({ ...current, instagram: value }))}
            />
            <Input
              placeholder="Spotify artist ID"
              value={artist.spotifyArtistId}
              onChangeText={(value) =>
                setArtist((current) => ({ ...current, spotifyArtistId: value }))
              }
            />
            <Input
              placeholder="Spotify URL"
              value={artist.spotifyUrl}
              onChangeText={(value) => setArtist((current) => ({ ...current, spotifyUrl: value }))}
            />
            <Input
              placeholder="Website URL"
              value={artist.website}
              onChangeText={(value) => setArtist((current) => ({ ...current, website: value }))}
            />
            <Input
              placeholder="Short bio"
              value={artist.bio}
              onChangeText={(value) => setArtist((current) => ({ ...current, bio: value }))}
              multiline
            />
            <Button
              onPress={() =>
                submitOnboarding.mutate({
                  ...artist,
                  role: "artist",
                })
              }
            >
              <Text>Finish as artist</Text>
            </Button>
          </View>
        )}

        {submitOnboarding.error ? (
          <Text className="text-sm text-destructive">{submitOnboarding.error.message}</Text>
        ) : null}
      </ScreenView>
    </ProtectedScreen>
  );
}
