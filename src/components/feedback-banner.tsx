import { Alert } from "@/components/ui/alert";

export function FeedbackBanner({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (success) {
    return <Alert variant="success">{success}</Alert>;
  }

  return null;
}
