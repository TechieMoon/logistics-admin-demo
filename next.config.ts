import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 엑셀 업로드(최대 2MB)를 서버 액션으로 받기 위해 기본 1MB 제한을 늘립니다.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
