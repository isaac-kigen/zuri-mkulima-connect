"use client";

import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export default function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="loading-container">
      <Spin
        indicator={<LoadingOutlined style={{ fontSize: 32, color: "#1a7a1a" }} spin />}
        size="large"
      />
      <span className="loading-text">{text}</span>

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          gap: 12px;
        }
        .loading-text {
          color: #8a9a8a;
          font-size: 13px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
