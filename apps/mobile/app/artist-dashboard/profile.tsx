import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useCurrentArtist, useUpdateArtist } from "@/lib/api/hooks";
import * as React from "react";
import { View } from "react-native";

export default function ArtistProfileScreen() {
  const { data } = useCurrentArtist();
  const updateArtist = useUpdateArtist();
  const [form, setForm] = React.useState({
    bio: "",
    genre: "OTHER",
    image: "",
    instagram: "",
    location: "",
    name: "",
    spotify_url: "",
    tiktok: "",
    twitter: "",
    website: "",
  });

  React.useEffect(() => {
    if (data) {
      setForm({
        bio: data.bio ?? "",
        genre: data.genre,
        image: data.image ?? "",
        instagram: data.instagram ?? "",
        location: data.location ?? "",
        name: data.name ?? "",
        spotify_url: data.spotify_url ?? "",
        tiktok: data.tiktok ?? "",
        twitter: data.twitter ?? "",
        website: data.website ?? "",
      });
    }
  }, [data?.id]);

  return (
    <ProtectedScreen role="artist">
      <ScreenView title="Edit profile" subtitle="Update the profile fans see on Dead Party Media.">
        <View className="gap-3">
          <Input
            placeholder="Artist name"
            value={form.name}
            onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
          />
          <Input
            placeholder="Location"
            value={form.location}
            onChangeText={(value) => setForm((current) => ({ ...current, location: value }))}
          />
          <Input
            placeholder="Genre"
            value={form.genre}
            onChangeText={(value) => setForm((current) => ({ ...current, genre: value }))}
          />
          <Input
            placeholder="Instagram URL"
            value={form.instagram}
            onChangeText={(value) => setForm((current) => ({ ...current, instagram: value }))}
          />
          <Input
            placeholder="Spotify URL"
            value={form.spotify_url}
            onChangeText={(value) => setForm((current) => ({ ...current, spotify_url: value }))}
          />
          <Input
            placeholder="Website URL"
            value={form.website}
            onChangeText={(value) => setForm((current) => ({ ...current, website: value }))}
          />
          <Input
            placeholder="Bio"
            value={form.bio}
            onChangeText={(value) => setForm((current) => ({ ...current, bio: value }))}
            multiline
          />
          <Button
            onPress={() => {
              const payload = new FormData();
              payload.append("name", form.name);
              payload.append("bio", form.bio);
              payload.append("location", form.location);
              payload.append("genre", form.genre);
              payload.append("instagram", form.instagram);
              payload.append("spotify_url", form.spotify_url);
              payload.append("website", form.website);
              payload.append("twitter", form.twitter);
              payload.append("tiktok", form.tiktok);
              payload.append("image", form.image);
              updateArtist.mutate(payload);
            }}
          >
            <Text>Save profile</Text>
          </Button>
          {updateArtist.error ? (
            <Text className="text-sm text-destructive">{updateArtist.error.message}</Text>
          ) : null}
        </View>
      </ScreenView>
    </ProtectedScreen>
  );
}
