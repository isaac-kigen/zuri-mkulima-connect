"use client";

import { Result, Button } from "antd";

export default function ErrorDisplay({ message = "Something went wrong", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Result
      status="error"
      title="Error"
      subTitle={message}
      extra={onRetry && <Button type="primary" onClick={onRetry}>Try Again</Button>}
    />
  );
}
