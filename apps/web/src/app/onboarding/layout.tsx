import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims } = await auth();

  // If onboarding is already complete, redirect to appropriate dashboard
  if (sessionClaims?.metadata?.onboardingComplete === true) {
    const role = sessionClaims.metadata.role as string;
    if (role === "artist") {
      redirect("/artist-dashboard");
    } else if (role === "super_admin" || role === "writer") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return <>{children}</>;
}
