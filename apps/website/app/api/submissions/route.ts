import { json, toErrorResponse } from "../_lib/http";
import { listPublisherSubmissions, publicSubmission } from "../_lib/submissions";
import { requirePublisher } from "@/lib/auth/server";

export async function GET() {
  try {
    const publisher = await requirePublisher();
    const submissions = await listPublisherSubmissions(publisher.id);
    return json({ submissions: submissions.map(publicSubmission), publisher: { email: publisher.email, name: publisher.name } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
