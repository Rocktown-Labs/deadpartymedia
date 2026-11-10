/** Keep production names stable; every non-production stage owns isolated resources. */
export function resourceName(name: string, stage: string) {
  if (stage === "production") return name;
  if (!/^[a-z0-9][a-z0-9-]{0,30}$/.test(stage))
    throw new Error("Stage must be a short lowercase slug");
  return `${name}-${stage}`;
}
