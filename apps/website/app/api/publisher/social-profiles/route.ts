import { json, toErrorResponse } from "../../_lib/http";
import { requirePublisher } from "@/lib/auth/server";
import { listConnectedSocialProfiles } from "@/lib/auth/social-profiles";

export async function GET() {
  try {
    const publisher = await requirePublisher();
    return json({
      profiles: await listConnectedSocialProfiles(publisher.id),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
